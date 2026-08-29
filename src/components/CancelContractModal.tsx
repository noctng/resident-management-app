import React, { useState , useRef} from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { api } from '../services/api';
import { XMarkIcon, ExclamationTriangleIcon } from './icons';
import { useToast, useConfirm } from './ui';

interface CancelContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: {
    id: string;
    contract_code: string;
    total_value: number;
    customers?: {
      name: string;
    };
  };
  totalPaid: number;
  onContractCancelled: () => void;
}

const CancelContractModal: React.FC<CancelContractModalProps> = ({
  isOpen,
  onClose,
  contract,
  totalPaid,
  onContractCancelled,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen);

  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { confirm } = useConfirm();
  const [formData, setFormData] = useState({
    reason: '',
    refund_amount: totalPaid.toString(),
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !(await confirm({
        title: 'Hủy hợp đồng',
        description: 'Bạn có chắc chắn muốn HỦY hợp đồng này? Hành động này không thể hoàn tác!',
        variant: 'danger',
      }))
    ) {
      return;
    }

    setLoading(true);

    try {
      await api.put(`/contracts/${contract.id}`, {
        status: 'CANCELLED',
        cancellation_reason: formData.reason,
        cancellation_date: new Date().toISOString(),
        refund_amount: parseFloat(formData.refund_amount),
        cancellation_notes: formData.notes,
      });

      onContractCancelled();
      onClose();
      resetForm();
    } catch (err) {
      console.error('Failed to cancel contract:', err);
      toast.error('Không thể hủy hợp đồng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      reason: '',
      refund_amount: totalPaid.toString(),
      notes: '',
    });
  };

  if (!isOpen) return null;

  const suggestedRefund = totalPaid * 0.9; // 90% refund policy

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" ref={dialogRef} role="dialog" aria-modal="true">
      <div className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-2xl max-h-[92vh] overflow-y-auto custom-scrollbar">
        <div className="px-6 py-4 border-b border-brand-border flex justify-between items-center bg-brand-danger-soft">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-brand-danger" />
            <h2 className="text-xl font-bold text-ink">Hủy Hợp đồng</h2>
          </div>
          <button
            onClick={onClose}
            className="text-ink-soft hover:text-ink transition-colors duration-200 cursor-pointer" aria-label="Đóng">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Warning */}
          <div className="p-4 bg-brand-warning-soft border border-brand-warning/30 rounded-lg">
            <p className="text-sm text-brand-warning font-medium flex items-start gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
              Cảnh báo: Hành động này sẽ HỦY hợp đồng và không thể hoàn tác. Vui lòng xác nhận kỹ
              trước khi tiếp tục.
            </p>
          </div>

          {/* Contract Info */}
          <div className="p-4 bg-surface-alt rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-ink-soft">Mã hợp đồng:</span>
                <span className="ml-2 font-semibold text-ink">
                  {contract.contract_code}
                </span>
              </div>
              <div>
                <span className="text-ink-soft">Khách hàng:</span>
                <span className="ml-2 font-semibold text-ink">
                  {contract.customers?.name}
                </span>
              </div>
              <div>
                <span className="text-ink-soft">Tổng giá trị:</span>
                <span className="ml-2 font-semibold font-mono tabular-nums text-ink">
                  {contract.total_value.toLocaleString('vi-VN')} VNĐ
                </span>
              </div>
              <div>
                <span className="text-ink-soft">Đã thanh toán:</span>
                <span className="ml-2 font-semibold font-mono tabular-nums text-brand-success">
                  {totalPaid.toLocaleString('vi-VN')} VNĐ
                </span>
              </div>
            </div>
          </div>

          {/* Cancellation Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink">
                Lý do hủy hợp đồng *
              </label>
              <select
                required
                className="w-full px-4 py-2 rounded-lg border border-brand-border bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              >
                <option value="">-- Chọn lý do --</option>
                <option value="customer_request">Yêu cầu của khách hàng</option>
                <option value="payment_default">Khách hàng không thanh toán</option>
                <option value="contract_violation">Vi phạm hợp đồng</option>
                <option value="mutual_agreement">Thỏa thuận chung</option>
                <option value="force_majeure">Bất khả kháng</option>
                <option value="other">Lý do khác</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-ink">
                Số tiền hoàn trả (VNĐ) *
              </label>
              <input
                required
                type="number"
                className="w-full px-4 py-2 rounded-lg border border-brand-border bg-surface text-ink font-mono tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-accent/40"
                value={formData.refund_amount}
                onChange={(e) => setFormData({ ...formData, refund_amount: e.target.value })}
                min="0"
                max={totalPaid}
              />
              <p className="text-xs text-ink-soft">
                Đề xuất hoàn trả 90%: {suggestedRefund.toLocaleString('vi-VN')} VNĐ
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-ink">
                Ghi chú chi tiết
              </label>
              <textarea
                className="w-full px-4 py-2 rounded-lg border border-brand-border bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
                rows={4}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Mô tả chi tiết lý do hủy hợp đồng và các thỏa thuận hoàn tiền..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-brand-border">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg border border-brand-border text-ink bg-surface hover:bg-surface-alt transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-lg bg-brand-danger text-white hover:bg-brand-danger/90 transition-colors duration-200 disabled:opacity-50 cursor-pointer flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40" aria-label="Đóng">
              <ExclamationTriangleIcon className="w-5 h-5" />
              {loading ? 'Đang xử lý...' : 'Xác nhận Hủy Hợp đồng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CancelContractModal;
