import React, { useState } from 'react';
import { ContractPayment, ContractFinancialSummary } from '../../types';
import {
  CheckCircleIcon,
  ClockIcon,
  EnvelopeIcon,
  PencilIcon,
  BoltIcon,
} from '../icons';
import EmailPreviewModal from './EmailPreviewModal';
import PaymentRestructureModal from './PaymentRestructureModal';
import EarlyPaymentModal from './EarlyPaymentModal';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { api } from '../../services/api';
import { useToast } from '../ui';

interface Props {
  contractId?: string;
  payments: ContractPayment[];
  summary?: ContractFinancialSummary;
  remainingAmount?: number; // Total remaining amount including VAT and fees
  onSendReminder?: (paymentId: string) => void;
  onRefresh?: () => void;
}

const PaymentScheduleView: React.FC<Props> = ({
  contractId,
  payments,
  summary,
  remainingAmount,
  onSendReminder,
  onRefresh,
}) => {
  const toast = useToast();
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [restructureModalOpen, setRestructureModalOpen] = useState(false);
  const [earlyPaymentModalOpen, setEarlyPaymentModalOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  const getStatusBadge = (payment: ContractPayment) => {
    // ... (keep existing implementation)
    switch (payment.status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-brand-success-soft text-brand-success rounded-full text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-success" />
            Đã thanh toán
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-brand-danger-soft text-brand-danger rounded-full text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-danger" />
            Quá hạn
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-surface-alt text-ink-soft rounded-full text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-ink-faint" />
            Chờ thanh toán
          </span>
        );
    }
  };

  // formatCurrency is now imported from utils

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const handleRestructure = async (installmentDates: string[], remainingAmount: number) => {
    if (!contractId) return;
    try {
      await api.post(`/contracts/${contractId}/restructure`, {
        installmentDates,
        remainingAmount,
      });
      onRefresh?.();
      setRestructureModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi điều chỉnh lịch thanh toán');
      throw err; // Propagate to modal to show error if needed (modal handles errors)
    }
  };

  const handleEarlyPayment = async (discountPercent: number) => {
    if (!contractId) return;
    try {
      await api.post(`/contracts/${contractId}/payments/early-payment`, {
        discountPercent,
      });
      onRefresh?.();
      setEarlyPaymentModalOpen(false);
      toast.success('Thanh toán sớm thành công!');
    } catch (err: any) {
      console.error(err);
      toast.error(`Lỗi: ${err.message || 'Không thể thanh toán sớm'}`);
    }
  };

  // Filter pending payments for early payment modal
  const pendingPayments = payments.filter((p) => p.status !== 'PAID');

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-accent-soft rounded-lg p-4">
            <div className="text-sm text-accent-ink mb-1">Tổng giá trị</div>
            <div className="text-2xl font-bold text-accent-ink font-mono tabular-nums text-right">
              {formatCurrency(summary.total_value)}
            </div>
          </div>
          <div className="bg-brand-success-soft rounded-lg p-4">
            <div className="text-sm text-brand-success mb-1">Đã thanh toán</div>
            <div className="text-2xl font-bold text-brand-success font-mono tabular-nums text-right">
              {formatCurrency(summary.total_paid)}
            </div>
            <div className="text-xs text-brand-success mt-1">
              {summary.payment_percentage}%
            </div>
          </div>
          <div className="bg-brand-warning-soft rounded-lg p-4">
            <div className="text-sm text-brand-warning mb-1">Chưa thanh toán</div>
            <div className="text-2xl font-bold text-brand-warning font-mono tabular-nums text-right">
              {formatCurrency(summary.total_value - summary.total_paid)}
            </div>
          </div>
          <div className="bg-brand-danger-soft rounded-lg p-4">
            <div className="text-sm text-brand-danger mb-1">Quá hạn</div>
            <div className="text-2xl font-bold text-brand-danger font-mono tabular-nums text-right">
              {formatCurrency(summary.total_overdue)}
            </div>
            {summary.total_late_fees > 0 && (
              <div className="text-xs text-brand-danger mt-1">
                Phạt: {formatCurrency(summary.total_late_fees)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Timeline */}
      <div className="space-y-3">
        <div className="flex justify-between items-center bg-surface p-4 rounded-xl shadow-sm border border-brand-border">
          <h3 className="text-lg font-bold text-ink flex items-center gap-2">
            <span>Lịch thanh toán</span>
            <span className="text-sm font-normal text-ink-soft">({payments.length} đợt)</span>
          </h3>

          <div className="flex items-center gap-3">
            {contractId && pendingPayments.length > 0 && (
              <button
                onClick={() => setEarlyPaymentModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors duration-200 font-semibold shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 text-sm"
              >
                <BoltIcon className="w-5 h-5" />
                Thanh Toán Sớm
              </button>
            )}

            {contractId && (
              <button
                onClick={() => setRestructureModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-ink bg-surface border border-brand-border hover:bg-surface-alt rounded-lg transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <PencilIcon className="w-4 h-4" />
                Điều chỉnh
              </button>
            )}
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-12 text-ink-soft bg-surface-alt rounded-xl border border-dashed border-brand-border">
            <ClockIcon className="w-12 h-12 mx-auto mb-2 text-ink-faint" />
            Chưa có lịch thanh toán
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => {
              const daysUntilDue = getDaysUntilDue(payment.due_date);
              const isUpcoming =
                daysUntilDue > 0 && daysUntilDue <= 7 && payment.status === 'PENDING';

              return (
                <div
                  key={payment.id}
                  className={`bg-surface rounded-lg border p-4 transition-shadow duration-200 hover:shadow-md ${
                    payment.status === 'OVERDUE'
                      ? 'border-brand-danger bg-brand-danger-soft/30'
                      : isUpcoming
                        ? 'border-brand-warning bg-brand-warning-soft/30'
                        : 'border-brand-border'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-ink">
                          Đợt thanh toán {payment.installment}
                        </span>
                        {getStatusBadge(payment)}
                        {/* Show Early Payment Badge */}
                        {(payment as any).is_early_payment && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-warning-soft text-brand-warning rounded-full text-[10px] font-bold border border-brand-warning/30 uppercase tracking-wider">
                            <BoltIcon className="w-3 h-3" />
                            Sớm
                          </span>
                        )}
                      </div>
                      {payment.description && (
                        <div className="text-sm text-ink-soft italic">{payment.description}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-lg font-bold font-mono tabular-nums ${
                          payment.status === 'OVERDUE' ? 'text-brand-danger' : 'text-ink'
                        }`}
                      >
                        {formatCurrency(payment.amount)}
                      </div>
                      {payment.paid_amount > 0 && (
                        <div className="text-sm text-brand-success">
                          Đã trả: {formatCurrency(payment.paid_amount)}
                          {(payment as any).early_payment_discount > 0 && (
                            <div className="text-xs text-brand-warning">
                              (Chiết khấu: {formatCurrency((payment as any).early_payment_discount)}
                              )
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm pt-2 border-t border-brand-border/60 mt-2">
                    <div className="text-ink-soft flex items-center gap-2">
                      <ClockIcon className="w-4 h-4 text-ink-soft" />
                      <span>Hạn: {formatDate(payment.due_date)}</span>
                      {payment.status === 'PENDING' && (
                        <span
                          className={`font-medium ${
                            daysUntilDue < 0
                              ? 'text-brand-danger'
                              : daysUntilDue <= 7
                                ? 'text-brand-warning'
                                : 'text-ink-soft'
                          }`}
                        >
                          (
                          {daysUntilDue < 0
                            ? `Quá ${Math.abs(daysUntilDue)} ngày`
                            : `Còn ${daysUntilDue} ngày`}
                          )
                        </span>
                      )}
                    </div>

                    {payment.status === 'PAID' && payment.payment_date && (
                      <div className="text-brand-success flex items-center gap-1 font-medium">
                        <CheckCircleIcon className="w-4 h-4" />
                        Thanh toán: {formatDate(payment.payment_date)}
                      </div>
                    )}

                    {payment.status === 'OVERDUE' && onSendReminder && (
                      <button
                        onClick={() => {
                          setSelectedPaymentId(payment.id);
                          setPreviewModalOpen(true);
                        }}
                        className="text-accent hover:text-accent-hover hover:underline flex items-center gap-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded"
                      >
                        <EnvelopeIcon className="w-4 h-4" /> Gửi nhắc nợ
                      </button>
                    )}
                  </div>

                  {/* Progress bar for partial payments */}
                  {payment.paid_amount > 0 && payment.paid_amount < payment.amount && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-ink-soft mb-1">
                        <span>Tiến độ thanh toán</span>
                        <span className="font-mono tabular-nums">
                          {((payment.paid_amount / payment.amount) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-surface-alt rounded-full h-2">
                        <div
                          className="bg-brand-success h-2 rounded-full"
                          style={{ width: `${(payment.paid_amount / payment.amount) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Email Preview Modal */}
      {selectedPaymentId && (
        <EmailPreviewModal
          paymentId={selectedPaymentId}
          isOpen={previewModalOpen}
          onClose={() => {
            setPreviewModalOpen(false);
            setSelectedPaymentId(null);
          }}
          onConfirmSend={() => {
            if (onSendReminder) {
              onSendReminder(selectedPaymentId);
            }
          }}
        />
      )}

      {/* Restructure Modal */}
      <PaymentRestructureModal
        isOpen={restructureModalOpen}
        onClose={() => setRestructureModalOpen(false)}
        onConfirm={handleRestructure}
        remainingAmount={
          remainingAmount !== undefined
            ? remainingAmount
            : summary
              ? summary.total_value - summary.total_paid
              : 0
        }
      />

      {/* Early Payment Modal */}
      <EarlyPaymentModal
        isOpen={earlyPaymentModalOpen}
        onClose={() => setEarlyPaymentModalOpen(false)}
        onConfirm={handleEarlyPayment}
        remainingPayments={pendingPayments}
        contractCode={contractId} // Just passing ID as placeholder if code not available in props.
      />
    </div>
  );
};

export default PaymentScheduleView;
