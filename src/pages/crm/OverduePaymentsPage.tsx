import { CrmSubNav } from '../../components/crm/CrmSubNav';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import {
  ArrowLeftIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EnvelopeIcon,
} from '../../components/icons';
import MarkPaymentPaidModal from '../../components/MarkPaymentPaidModal';
import EmailPreviewModal from '../../components/EmailPreviewModal';
import { useToast } from '../../components/ui';
import { formatDate } from '../../utils/formatters';

interface PaymentWithDetails {
  id: string;
  contract_id: string;
  installment: number;
  description: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  contract?: {
    contract_code: string;
    customers?: {
      name: string;
    };
    apartments?: {
      code: string;
    };
  };
}

interface OverduePaymentsPageProps {
  onNavigate?: (route: string) => void;
  onBack?: () => void;
  
  
  

}

const OverduePaymentsPage: React.FC<OverduePaymentsPageProps> = ({ onNavigate, onBack }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'overdue' | 'upcoming'>('all');
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithDetails | null>(null);

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{ subject: string; html: string } | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [targetPaymentId, setTargetPaymentId] = useState<string | null>(null);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      // Get all contracts with their payments
      const contracts = await api.get<any[]>('/contracts');

      const allPayments: PaymentWithDetails[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const contract of contracts) {
        const contractDetail = await api.get<any>(`/contracts/${contract.id}`);

        if (contractDetail.contract_payments) {
          contractDetail.contract_payments.forEach((payment: any) => {
            const dueDate = new Date(payment.due_date);
            dueDate.setHours(0, 0, 0, 0);

            // Only include pending payments that are overdue or upcoming
            // Only include pending payments that are overdue or upcoming, OR already overdue payments
            if (payment.status === 'PENDING' || payment.status === 'OVERDUE') {
              const daysDiff = Math.floor(
                (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
              );

              // Overdue or upcoming within 30 days
              // daysDiff <= 30 includes all negative values (overdue) and upcoming within 30 days
              if (daysDiff <= 30) {
                allPayments.push({
                  ...payment,
                  // If already OVERDUE or calculated as overdue
                  status: payment.status === 'OVERDUE' || daysDiff < 0 ? 'OVERDUE' : 'PENDING',
                  contract: {
                    contract_code: contractDetail.contract_code,
                    customers: contractDetail.customers,
                    apartments: contractDetail.apartments,
                  },
                });
              }
            }
          });
        }
      }

      // Sort by due date (earliest first)
      allPayments.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
      setPayments(allPayments);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter((payment) => {
    if (filter === 'overdue') return payment.status === 'OVERDUE';
    if (filter === 'upcoming') return payment.status === 'PENDING';
    return true;
  });

  const overdueCount = payments.filter((p) => p.status === 'OVERDUE').length;
  const upcomingCount = payments.filter((p) => p.status === 'PENDING').length;

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('vi-VN') + ' VNĐ';
  };

  // formatDate is now imported from utils

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diff = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const handleSendReminder = async (paymentId: string) => {
    setTargetPaymentId(paymentId);
    setSendingEmail(true);
    try {
      const res = await api.get<any>(`/contracts/payments/${paymentId}/preview-remind`);
      setPreviewData(res as { subject: string; html: string });
      setPreviewModalOpen(true);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Không thể tạo xem trước email');
    } finally {
      setSendingEmail(false);
    }
  };

  const confirmSendReminder = async () => {
    if (!targetPaymentId) return;
    setSendingEmail(true);
    try {
      await api.post(`/contracts/payments/${targetPaymentId}/remind`, {});
      toast.success('Đã gửi email nhắc nợ thành công!');
      setPreviewModalOpen(false);
      setTargetPaymentId(null);
      setPreviewData(null);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Gửi email thất bại');
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-ink-soft">Đang tải dữ liệu...</div>;

  return (
    <div className="space-y-6">
      <CrmSubNav current="overdue-payments" title="Theo Dõi Nợ Quá Hạn HĐMB" subtitle="Phạt chậm nộp 0.05%/ngày & gửi cảnh báo SMS/Email" onNavigate={onNavigate} onBack={onBack} />

      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-surface-alt rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeftIcon className="w-6 h-6 text-ink-soft" />
        </button>
        <h1 className="text-2xl font-bold text-ink">Yêu cầu Thanh toán Nợ</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface p-4 rounded-xl shadow-sm border border-brand-border border-l-4 border-l-brand-danger">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-danger-soft">
              <ExclamationTriangleIcon className="w-6 h-6 text-brand-danger" />
            </div>
            <div>
              <div className="text-sm text-ink-soft">Quá hạn</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-brand-danger">{overdueCount}</div>
            </div>
          </div>
        </div>
        <div className="bg-surface p-4 rounded-xl shadow-sm border border-brand-border border-l-4 border-l-brand-warning">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-warning-soft">
              <ClockIcon className="w-6 h-6 text-brand-warning" />
            </div>
            <div>
              <div className="text-sm text-ink-soft">Sắp đến hạn</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-brand-warning">{upcomingCount}</div>
            </div>
          </div>
        </div>
        <div className="bg-surface p-4 rounded-xl shadow-sm border border-brand-border border-l-4 border-l-brand-teal">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-teal-soft">
              <ClockIcon className="w-6 h-6 text-brand-teal" />
            </div>
            <div>
              <div className="text-sm text-ink-soft">Tổng cộng</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-brand-teal">{payments.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface p-4 rounded-xl shadow-sm border border-brand-border">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-accent text-white'
                : 'bg-surface-alt text-ink-soft hover:bg-brand-border/60'
            }`}
          >
            Tất cả ({payments.length})
          </button>
          <button
            onClick={() => setFilter('overdue')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
              filter === 'overdue'
                ? 'bg-brand-danger text-white'
                : 'bg-surface-alt text-ink-soft hover:bg-brand-border/60'
            }`}
          >
            Quá hạn ({overdueCount})
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
              filter === 'upcoming'
                ? 'bg-brand-warning text-white'
                : 'bg-surface-alt text-ink-soft hover:bg-brand-border/60'
            }`}
          >
            Sắp đến hạn ({upcomingCount})
          </button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-surface rounded-xl shadow-sm border border-brand-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-alt text-[11px] uppercase tracking-wider text-ink-soft">
              <tr>
                <th className="px-6 py-3">Trạng thái</th>
                <th className="px-6 py-3">Hợp đồng</th>
                <th className="px-6 py-3">Khách hàng</th>
                <th className="px-6 py-3">Căn hộ</th>
                <th className="px-6 py-3">Đợt TT</th>
                <th className="px-6 py-3">Ngày đáo hạn</th>
                <th className="px-6 py-3 text-right">Số tiền</th>
                <th className="px-6 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-ink-soft">
                    Không có khoản thanh toán nào
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => {
                  const daysUntilDue = getDaysUntilDue(payment.due_date);
                  const isOverdue = payment.status === 'OVERDUE';

                  return (
                    <tr
                      key={payment.id}
                      className={`transition-colors duration-150 ${
                        isOverdue ? 'bg-brand-danger-soft/30 hover:bg-brand-danger-soft/50' : 'hover:bg-surface-alt/60'
                      }`}
                    >
                      <td className="px-6 py-4">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-danger-soft text-brand-danger">
                            <ExclamationTriangleIcon className="w-3 h-3" />
                            Quá hạn {Math.abs(daysUntilDue)} ngày
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-warning-soft text-brand-warning">
                            <ClockIcon className="w-3 h-3" />
                            Còn {daysUntilDue} ngày
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono font-semibold text-ink">
                        {payment.contract?.contract_code}
                      </td>
                      <td className="px-6 py-4 text-ink-soft">
                        {payment.contract?.customers?.name}
                      </td>
                      <td className="px-6 py-4 text-ink-soft">
                        {payment.contract?.apartments?.code}
                      </td>
                      <td className="px-6 py-4 text-ink-soft">
                        Đợt {payment.installment}
                      </td>
                      <td className="px-6 py-4 text-ink-soft">
                        {formatDate(payment.due_date)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono tabular-nums font-bold text-brand-danger">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedPayment(payment)}
                            className="px-3 py-1.5 bg-surface border border-brand-border text-ink text-xs font-semibold rounded-md hover:bg-surface-alt transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircleIcon className="w-4 h-4" />
                            Đã thanh toán
                          </button>
                          <button
                            onClick={() => handleSendReminder(payment.id)}
                            className="p-2 border border-brand-border text-ink-soft hover:text-accent hover:border-accent/40 rounded-md transition-colors cursor-pointer flex items-center"
                            title="Gửi email nhắc nợ"
                          >
                            <EnvelopeIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/crm/contracts/${payment.contract_id}`)}
                            className="text-accent hover:text-accent-hover font-medium text-sm cursor-pointer transition-colors"
                          >
                            Xem chi tiết
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPayment && (
        <MarkPaymentPaidModal
          isOpen={!!selectedPayment}
          onClose={() => setSelectedPayment(null)}
          payment={selectedPayment}
          onPaymentMarked={() => {
            setSelectedPayment(null);
            loadPayments();
          }}
        />
      )}

      <EmailPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        onSend={confirmSendReminder}
        isLoading={sendingEmail}
        data={previewData}
      />
    </div>
  );
};

export default OverduePaymentsPage;
