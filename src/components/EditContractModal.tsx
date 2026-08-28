import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { XMarkIcon, PencilIcon } from './icons';
import { useToast } from './ui';

interface EditContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: {
    id: string;
    contract_code: string;
    customer_id: string;
    apartment_id: string;
    total_value: number;
    vat_amount: number;
    maintenance_fee: number;
    status: string;
    signed_date?: string;
    handover_date?: string;
  };
  onContractUpdated: () => void;
}

const EditContractModal: React.FC<EditContractModalProps> = ({
  isOpen,
  onClose,
  contract,
  onContractUpdated,
}) => {
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const [formData, setFormData] = useState({
    total_value: '',
    vat_percent: '10',
    maintenance_fee: '',
    status: 'DEPOSIT' as const,
    signed_date: '',
    handover_date: '',
  });

  useEffect(() => {
    if (isOpen && contract) {
      // Calculate VAT percentage from amount
      const vatPercent =
        contract.total_value > 0
          ? ((contract.vat_amount / contract.total_value) * 100).toFixed(1)
          : '10';

      setFormData({
        total_value: contract.total_value.toString(),
        vat_percent: vatPercent,
        maintenance_fee: contract.maintenance_fee.toString(),
        status: contract.status as any,
        signed_date: contract.signed_date ? contract.signed_date.split('T')[0] : '',
        handover_date: contract.handover_date ? contract.handover_date.split('T')[0] : '',
      });
    }
  }, [isOpen, contract]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const totalValue = parseFloat(formData.total_value);
      const vatPercent = parseFloat(formData.vat_percent || '0');
      const vatAmount = (totalValue * vatPercent) / 100;

      const payload = {
        total_value: totalValue,
        vat_amount: vatAmount,
        maintenance_fee: parseFloat(formData.maintenance_fee || '0'),
        status: formData.status,
        signed_date: formData.signed_date || undefined,
        handover_date: formData.handover_date || undefined,
      };

      await api.put(`/contracts/${contract.id}`, payload);
      onContractUpdated();
      onClose();
    } catch (err) {
      console.error('Failed to update contract:', err);
      toast.error('Không thể cập nhật hợp đồng. Vui lòng kiểm tra lại dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-xl border border-brand-border w-full max-w-3xl max-h-[92vh] overflow-y-auto custom-scrollbar">
        <div className="sticky top-0 px-6 py-4 border-b border-brand-border flex justify-between items-center bg-surface-alt">
          <div className="flex items-center gap-3">
            <PencilIcon className="w-6 h-6 text-accent" />
            <h2 className="text-xl font-bold text-ink">Chỉnh sửa Hợp đồng</h2>
          </div>
          <button
            onClick={onClose}
            className="text-ink-faint hover:text-ink-soft transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Contract Info (Read-only) */}
          <div className="p-4 bg-surface-alt border border-brand-border rounded-lg">
            <div className="text-sm text-ink-soft mb-1">Mã hợp đồng</div>
            <div className="text-lg font-bold font-mono tabular-nums text-ink">
              {contract.contract_code}
            </div>
            <div className="text-xs text-ink-faint mt-2">
              * Không thể thay đổi mã hợp đồng, khách hàng và căn hộ
            </div>
          </div>

          {/* Editable Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink">
                Tổng giá trị (VNĐ) *
              </label>
              <input
                required
                type="number"
                className="w-full px-4 py-2 rounded-lg border border-brand-border focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none bg-surface text-ink font-mono tabular-nums"
                value={formData.total_value}
                onChange={(e) => setFormData({ ...formData, total_value: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-ink">
                VAT (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                className="w-full px-4 py-2 rounded-lg border border-brand-border focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none bg-surface text-ink"
                value={formData.vat_percent}
                onChange={(e) => setFormData({ ...formData, vat_percent: e.target.value })}
              />
              {formData.total_value && formData.vat_percent && (
                <p className="text-xs text-ink-soft">
                  Số tiền VAT:{' '}
                  {(
                    (parseFloat(formData.total_value) * parseFloat(formData.vat_percent)) /
                    100
                  ).toLocaleString('vi-VN')}{' '}
                  VNĐ
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-ink">
                Phí bảo trì (VNĐ)
              </label>
              <input
                type="number"
                className="w-full px-4 py-2 rounded-lg border border-brand-border focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none bg-surface text-ink font-mono tabular-nums"
                value={formData.maintenance_fee}
                onChange={(e) => setFormData({ ...formData, maintenance_fee: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-ink">
                Trạng thái
              </label>
              <select
                className="w-full px-4 py-2 rounded-lg border border-brand-border focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none bg-surface text-ink"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="DEPOSIT">Đặt cọc</option>
                <option value="SIGNED">Đã ký</option>
                <option value="PAYING">Đang thanh toán</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-ink">
                Ngày ký
              </label>
              <input
                type="date"
                className="w-full px-4 py-2 rounded-lg border border-brand-border focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none bg-surface text-ink"
                value={formData.signed_date}
                onChange={(e) => setFormData({ ...formData, signed_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-ink">
                Ngày bàn giao
              </label>
              <input
                type="date"
                className="w-full px-4 py-2 rounded-lg border border-brand-border focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none bg-surface text-ink"
                value={formData.handover_date}
                onChange={(e) => setFormData({ ...formData, handover_date: e.target.value })}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-brand-border">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg border border-brand-border hover:bg-surface-alt transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Đang cập nhật...' : 'Cập nhật Hợp đồng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditContractModal;
