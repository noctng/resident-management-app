import React, { useState, useEffect , useRef} from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { api } from '../services/api';
import { XMarkIcon, UserIcon, ArrowRightIcon } from './icons';
import { useToast, useConfirm } from './ui';

interface Customer {
  id: string;
  name: string;
  phone_number: string;
  id_number?: string;
}

interface TransferContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: {
    id: string;
    contract_code: string;
    customer_id: string;
    customers?: {
      name: string;
    };
  };
  onContractTransferred: () => void;
}

const TransferContractModal: React.FC<TransferContractModalProps> = ({
  isOpen,
  onClose,
  contract,
  onContractTransferred,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen);

  const toast = useToast();
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    transfer_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
    }
  }, [isOpen]);

  const loadCustomers = async () => {
    try {
      const data = await api.get<Customer[]>('/customers');
      setCustomers(data.filter((c) => c.id !== contract.customer_id)); // Exclude current owner
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone_number.includes(searchTerm)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomer) {
      toast.warning('Vui lòng chọn khách hàng nhận chuyển nhượng');
      return;
    }

    const ok = await confirm({
      title: 'Xác nhận chuyển nhượng',
      description: `Bạn có chắc chắn muốn chuyển nhượng hợp đồng ${contract.contract_code} cho khách hàng ${selectedCustomer.name}?`,
      variant: 'primary',
      confirmLabel: 'Chuyển nhượng',
      cancelLabel: 'Hủy',
    });
    if (!ok) return;

    setLoading(true);

    try {
      await api.post(`/contracts/${contract.id}/transfer`, {
        new_customer_id: selectedCustomer.id,
        transfer_date: formData.transfer_date,
        notes: formData.notes,
      });

      toast.success('Chuyển nhượng thành công!');
      onContractTransferred();
      onClose();
      resetForm();
    } catch (err) {
      console.error('Failed to transfer contract:', err);
      toast.error('Lỗi: Không thể chuyển nhượng hợp đồng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setSearchTerm('');
    setFormData({
      transfer_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" ref={dialogRef} role="dialog" aria-modal="true">
      <div className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-2xl max-h-[92vh] overflow-y-auto custom-scrollbar">
        <div className="sticky top-0 z-10 px-5 py-4 border-b border-brand-border flex justify-between items-center bg-surface">
          <h2 className="text-base font-bold text-ink flex items-center gap-2.5">
            <UserIcon className="w-5 h-5 text-accent" />
            Chuyển nhượng Hợp đồng
          </h2>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-surface-alt transition-colors duration-200 cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Transfer Flow Visual */}
          <div className="flex items-center justify-between p-4 bg-surface-alt rounded-lg border border-brand-border">
            <div className="text-center w-1/3">
              <div className="text-xs text-ink-soft mb-1">Bên chuyển nhượng</div>
              <div className="font-bold text-ink">
                {contract.customers?.name}
              </div>
            </div>
            <div className="flex flex-col items-center justify-center text-accent">
              <div className="text-xs font-semibold mb-1">CHUYỂN GIAO</div>
              <ArrowRightIcon className="w-6 h-6" />
            </div>
            <div className="text-center w-1/3">
              <div className="text-xs text-ink-soft mb-1">Bên nhận chuyển nhượng</div>
              <div
                className={`font-bold ${selectedCustomer ? 'text-accent' : 'text-ink-faint italic'}`}
              >
                {selectedCustomer ? selectedCustomer.name : '(Chưa chọn)'}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Select New Customer */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-ink-soft mb-1">
                Chọn Khách hàng mới <span className="text-brand-danger">*</span>
              </label>
              {selectedCustomer ? (
                <div className="flex items-center justify-between p-3 bg-accent-soft border border-accent/40 rounded-lg">
                  <div>
                    <div className="font-bold text-accent-ink">{selectedCustomer.name}</div>
                    <div className="text-sm text-accent-ink font-mono tabular-nums">{selectedCustomer.phone_number}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="text-accent hover:text-accent-hover text-sm font-medium transition-colors duration-200"
                  >
                    Thay đổi
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Tìm khách hàng (tên, sđt)..."
                    className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <div className="max-h-48 overflow-y-auto custom-scrollbar border border-brand-border rounded-lg">
                    {filteredCustomers.length === 0 ? (
                      <div className="p-3 text-center text-ink-soft text-sm">
                        Không tìm thấy khách hàng
                      </div>
                    ) : (
                      filteredCustomers.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedCustomer(c);
                            setSearchTerm('');
                          }}
                          className="p-3 hover:bg-surface-alt cursor-pointer border-b last:border-0 border-brand-border transition-colors duration-200"
                        >
                          <div className="font-semibold text-ink">
                            {c.name}
                          </div>
                          <div className="text-sm text-ink-soft font-mono tabular-nums">{c.phone_number}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Transfer Date */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-ink-soft mb-1">
                Ngày chuyển nhượng <span className="text-brand-danger">*</span>
              </label>
              <input
                required
                type="date"
                className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                value={formData.transfer_date}
                onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-ink-soft mb-1">
                Ghi chú / Điều khoản bổ sung
              </label>
              <textarea
                className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                rows={4}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ghi chú về hồ sơ chuyển nhượng, cam kết công nợ..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t border-brand-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-surface border border-brand-border text-ink hover:bg-surface-alt transition-colors duration-200 text-sm font-medium"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={loading || !selectedCustomer}
                className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors duration-200 disabled:opacity-50 flex items-center gap-2" aria-label="Đóng">
                {loading && (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                )}
                {loading ? 'Đang xử lý...' : 'Xác nhận Chuyển nhượng'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TransferContractModal;
