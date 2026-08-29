import React, { useState, useEffect , useRef} from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { XMarkIcon } from '../icons';
import { useToast } from '../ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (installmentDates: string[], remainingAmount: number) => Promise<void>;
  remainingAmount?: number; // Total amount to be divided
}

interface InstallmentRow {
  installmentNumber: number;
  dueDate: string;
  amount: number;
}

const PaymentRestructureModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirm,
  remainingAmount = 0,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen);

  const toast = useToast();
  const [installments, setInstallments] = useState(3);
  const [rows, setRows] = useState<InstallmentRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Initialize rows when installments count changes
  useEffect(() => {
    if (!isOpen) return;

    const today = new Date();
    const amountPerInstallment =
      remainingAmount > 0 ? Math.round(remainingAmount / installments) : 0;

    const newRows: InstallmentRow[] = [];
    for (let i = 0; i < installments; i++) {
      const dueDate = new Date(today);
      dueDate.setMonth(today.getMonth() + i + 1); // Default: monthly intervals

      newRows.push({
        installmentNumber: i + 1,
        dueDate: dueDate.toISOString().split('T')[0],
        amount: amountPerInstallment,
      });
    }

    setRows(newRows);
  }, [installments, isOpen, remainingAmount]);

  if (!isOpen) return null;

  const handleInstallmentsChange = (value: number) => {
    if (value >= 1 && value <= 36) {
      setInstallments(value);
    }
  };

  const handleDateChange = (index: number, newDate: string) => {
    const updatedRows = [...rows];
    updatedRows[index].dueDate = newDate;
    setRows(updatedRows);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all dates are filled
    const hasEmptyDates = rows.some((row) => !row.dueDate);
    if (hasEmptyDates) {
      toast.warning('Vui lòng điền đầy đủ ngày thanh toán cho tất cả các đợt');
      return;
    }

    try {
      setLoading(true);
      const dates = rows.map((row) => row.dueDate);
      await onConfirm(dates, remainingAmount);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" ref={dialogRef} role="dialog" aria-modal="true">
      <div className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-3xl max-h-[92vh] overflow-y-auto custom-scrollbar flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-brand-border">
          <h3 className="text-xl font-bold text-ink">
            Điều chỉnh lịch thanh toán
          </h3>
          <button
            onClick={onClose}
            className="text-ink-soft hover:text-ink transition-colors duration-200 cursor-pointer" aria-label="Đóng">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div className="bg-accent-soft p-4 rounded-md text-sm text-accent-ink">
              Lưu ý: Hệ thống sẽ xóa các đợt chưa thanh toán cũ và tạo lịch thanh toán mới cho số dư
              nợ còn lại. Các đợt đã thanh toán (một phần hoặc toàn bộ) sẽ được giữ nguyên.
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Số đợt thanh toán mới
                </label>
                <input
                  type="number"
                  min="1"
                  max="36"
                  required
                  value={installments}
                  onChange={(e) => handleInstallmentsChange(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-brand-border rounded-md bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Tổng số dư nợ
                </label>
                <div className="px-3 py-2 bg-surface-alt border border-brand-border rounded-md text-ink font-semibold font-mono tabular-nums text-right">
                  {formatCurrency(remainingAmount)}
                </div>
              </div>
            </div>

            {/* Payment Schedule Table */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-ink mb-3">
                Lịch thanh toán chi tiết
              </h4>
              <div className="border border-brand-border rounded-lg overflow-x-auto">
                <table className="w-full min-w-full">
                  <thead className="bg-surface-alt text-[11px] uppercase tracking-wider font-semibold text-ink-soft">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-ink-soft">
                        Đợt
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider font-semibold text-ink-soft">
                        Ngày thanh toán
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wider font-semibold text-ink-soft">
                        Số tiền
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface divide-y divide-brand-border">
                    {rows.map((row, index) => (
                      <tr key={index} className="hover:bg-surface-alt/60 transition-colors duration-150">
                        <td className="px-4 py-3 text-sm font-medium text-ink">
                          Đợt {row.installmentNumber}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            required
                            value={row.dueDate}
                            onChange={(e) => handleDateChange(index, e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-brand-border rounded-md bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono tabular-nums font-semibold text-ink">
                          {formatCurrency(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-surface-alt">
                    <tr>
                      <td
                        colSpan={2}
                        className="px-4 py-3 text-sm font-bold text-ink text-right"
                      >
                        Tổng cộng:
                      </td>
                      <td className="px-4 py-3 text-sm font-bold font-mono tabular-nums text-ink text-right">
                        {formatCurrency(rows.reduce((sum, row) => sum + row.amount, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 p-6 border-t border-brand-border bg-surface-alt">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-ink bg-surface border border-brand-border rounded-lg hover:bg-surface-alt transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors duration-200 cursor-pointer flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              {loading ? 'Đang xử lý...' : 'Xác nhận thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentRestructureModal;
