import React, { useState , useRef} from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { api } from '../services/api';
import { formatDate } from '../utils/formatters';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon } from './icons';
import { useToast } from './ui';

interface MarkPaymentPaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: {
    id: string;
    contract_id: string;
    installment: number;
    description: string;
    due_date: string;
    amount: number;
    contract?: {
      contract_code: string;
      customers?: {
        name: string;
      };
    };
  };
  onPaymentMarked: () => void;
}

const MarkPaymentPaidModal: React.FC<MarkPaymentPaidModalProps> = ({
  isOpen,
  onClose,
  payment,
  onPaymentMarked,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen);

  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    paid_amount: payment.amount.toString(),
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.put(`/contracts/payments/${payment.id}`, {
        status: 'PAID',
        payment_date: formData.payment_date,
        paid_amount: parseFloat(formData.paid_amount),
      });

      onPaymentMarked();
      onClose();
      resetForm();
    } catch (err) {
      console.error('Failed to mark payment as paid:', err);
      toast.error('Không thể cập nhật thanh toán. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      payment_date: new Date().toISOString().split('T')[0],
      paid_amount: payment.amount.toString(),
      notes: '',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" ref={dialogRef} role="dialog" aria-modal="true">
      <div className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-2xl max-h-[92vh] overflow-y-auto custom-scrollbar">
        <div className="px-5 py-4 border-b border-brand-border flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <CheckCircleIcon className="w-5 h-5 text-brand-success" />
            <h2 className="text-base font-bold text-ink">Xác nhận Thanh toán</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-surface-alt transition-colors duration-200 cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Payment Info */}
          <div className="p-4 bg-brand-teal-soft rounded-lg space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-ink-soft">Hợp đồng:</span>
                <span className="ml-2 font-semibold text-ink font-mono tabular-nums">
                  {payment.contract?.contract_code}
                </span>
              </div>
              <div>
                <span className="text-ink-soft">Khách hàng:</span>
                <span className="ml-2 font-semibold text-ink">
                  {payment.contract?.customers?.name}
                </span>
              </div>
              <div>
                <span className="text-ink-soft">Đợt thanh toán:</span>
                <span className="ml-2 font-semibold text-ink tabular-nums">
                  Đợt {payment.installment}
                </span>
              </div>
              <div>
                <span className="text-ink-soft">Ngày đáo hạn:</span>
                <span className="ml-2 font-semibold text-ink">
                  {formatDate(payment.due_date)}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-brand-teal/30">
              <span className="text-ink-soft">Số tiền cần thanh toán:</span>
              <span className="ml-2 text-lg font-bold text-brand-teal font-mono tabular-nums">
                {payment.amount.toLocaleString('vi-VN')} VNĐ
              </span>
            </div>
          </div>

          {/* Payment Details Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Ngày thanh toán <span className="text-brand-danger">*</span>
                </label>
                <input
                  required
                  type="date"
                  className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Số tiền thực nhận (VNĐ) <span className="text-brand-danger">*</span>
                </label>
                <input
                  required
                  type="number"
                  className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                  value={formData.paid_amount}
                  onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
                  min="0"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-ink-soft mb-1">
                Ghi chú
              </label>
              <textarea
                className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ghi chú về thanh toán (tùy chọn)"
              />
            </div>
          </div>

          {/* Warning if amount differs */}
          {parseFloat(formData.paid_amount) !== payment.amount && (
            <div className="p-3 bg-brand-warning-soft border border-brand-warning/30 rounded-lg">
              <p className="text-sm text-brand-warning flex items-start gap-1.5">
                <ExclamationTriangleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                Số tiền thực nhận khác với số tiền cần thanh toán
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-brand-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-surface border border-brand-border text-ink hover:bg-surface-alt transition-colors duration-200 text-sm font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors duration-200 disabled:opacity-50 flex items-center gap-2" aria-label="Đóng">
              {loading ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <CheckCircleIcon className="w-5 h-5" />
              )}
              {loading ? 'Đang xử lý...' : 'Xác nhận Đã thanh toán'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MarkPaymentPaidModal;
