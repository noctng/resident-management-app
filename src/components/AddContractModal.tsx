import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Apartment } from '../types';
import { PlusIcon, XMarkIcon } from './icons';
import { useToast } from './ui';

interface AddContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  onContractCreated: () => void;
}

interface PaymentInstallment {
  installment: number;
  description: string;
  due_date: string;
  amount: number;
  status: 'PENDING' | 'PAID';
}

const AddContractModal: React.FC<AddContractModalProps> = ({
  isOpen,
  onClose,
  customerId,
  customerName,
  onContractCreated,
}) => {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(false);
  const [apartmentSearch, setApartmentSearch] = useState(''); // For display in input
  const toast = useToast();
  const [formData, setFormData] = useState({
    contract_code: '',
    apartment_id: '',
    total_value: '',
    vat_percent: '10', // Default 10%
    maintenance_fee: '',
    status: 'DEPOSIT' as const,
    signed_date: '',
    handover_date: '',
  });
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentInstallment[]>([
    {
      installment: 1,
      description: 'Đợt thanh toán thứ 1',
      due_date: '',
      amount: 0,
      status: 'PENDING',
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      loadApartments();
      // Reset apartment search when modal opens
      setApartmentSearch('');
    }
  }, [isOpen]);

  // Auto-generate contract code when apartment is selected
  useEffect(() => {
    if (formData.apartment_id && customerId) {
      generateContractCode();
    }
  }, [formData.apartment_id]);

  const generateContractCode = async () => {
    try {
      // Get apartment code
      const selectedApt = apartments.find((a) => a.id === formData.apartment_id);
      if (!selectedApt) return;

      // Get existing contracts count for this customer to generate sequence
      const customerData = await api.get<{ contracts: any[] }>(`/customers/${customerId}`);
      const contractCount = customerData.contracts?.length || 0;
      const sequence = String(contractCount + 1).padStart(4, '0');

      // Extract customer ID suffix (last 4 chars or full if shorter)
      const customerIdSuffix = customerId.slice(-4).toUpperCase();

      const code = `HD-${selectedApt.code}-${customerIdSuffix}-${sequence}`;
      setFormData((prev) => ({ ...prev, contract_code: code }));
    } catch (err) {
      console.error('Failed to generate contract code:', err);
    }
  };

  const loadApartments = async () => {
    try {
      const data = await api.get<Apartment[]>('/apartments');
      setApartments(data);

      // If apartment_id exists, set the search display
      if (formData.apartment_id) {
        const apt = data.find((a) => a.id === formData.apartment_id);
        if (apt) {
          setApartmentSearch(`${apt.code} - ${apt.houseType} (${apt.area}m²)`);
        }
      }
    } catch (err) {
      console.error('Failed to load apartments:', err);
    }
  };

  const handleApartmentChange = (value: string) => {
    setApartmentSearch(value);

    // Try to find apartment by code or full text
    const apt = apartments.find(
      (a) =>
        `${a.code} - ${a.houseType} (${a.area}m²)` === value ||
        a.code.toLowerCase().includes(value.toLowerCase())
    );

    if (apt) {
      setFormData({ ...formData, apartment_id: apt.id });
    } else {
      setFormData({ ...formData, apartment_id: '' });
    }
  };

  const handleAddPayment = () => {
    setPaymentSchedule([
      ...paymentSchedule,
      {
        installment: paymentSchedule.length + 1,
        description: `Đợt thanh toán thứ ${paymentSchedule.length + 1}`,
        due_date: '',
        amount: 0,
        status: 'PENDING',
      },
    ]);
  };

  const handleRemovePayment = (index: number) => {
    if (paymentSchedule.length > 1) {
      setPaymentSchedule(paymentSchedule.filter((_, i) => i !== index));
    }
  };

  const handlePaymentChange = (index: number, field: keyof PaymentInstallment, value: any) => {
    const updated = [...paymentSchedule];
    updated[index] = { ...updated[index], [field]: value };
    setPaymentSchedule(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const totalValue = parseFloat(formData.total_value);
      const vatPercent = parseFloat(formData.vat_percent || '0');
      const vatAmount = (totalValue * vatPercent) / 100;

      const payload = {
        contract_code: formData.contract_code,
        customer_id: customerId,
        apartment_id: formData.apartment_id,
        total_value: totalValue,
        vat_amount: vatAmount,
        maintenance_fee: parseFloat(formData.maintenance_fee || '0'),
        status: formData.status,
        signed_date: formData.signed_date || undefined,
        handover_date: formData.handover_date || undefined,
        payment_schedule: paymentSchedule.map((p) => ({
          ...p,
          amount: parseFloat(p.amount.toString()),
        })),
      };

      await api.post('/contracts', payload);
      onContractCreated();
      onClose();
      resetForm();
    } catch (err) {
      console.error('Failed to create contract:', err);
      toast.error('Không thể tạo hợp đồng. Vui lòng kiểm tra lại dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      contract_code: '',
      apartment_id: '',
      total_value: '',
      vat_percent: '10',
      maintenance_fee: '',
      status: 'DEPOSIT',
      signed_date: '',
      handover_date: '',
    });
    setApartmentSearch('');
    setPaymentSchedule([
      {
        installment: 1,
        description: 'Đợt thanh toán thứ 1',
        due_date: '',
        amount: 0,
        status: 'PENDING',
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-4xl max-h-[92vh] overflow-y-auto custom-scrollbar">
        <div className="sticky top-0 z-10 px-5 py-4 border-b border-brand-border flex justify-between items-center bg-surface">
          <h2 className="text-base font-bold text-ink">Tạo Hợp đồng mới</h2>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-surface-alt transition-colors duration-200 cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Customer Info */}
          <div className="p-4 bg-brand-teal-soft rounded-lg">
            <div className="text-xs font-semibold text-ink-soft mb-1">Khách hàng</div>
            <div className="text-lg font-bold text-ink">{customerName}</div>
          </div>

          {/* Contract Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-ink-soft mb-1">
                Mã hợp đồng <span className="text-brand-danger">*</span>
              </label>
              <input
                required
                type="text"
                readOnly
                className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink font-mono tabular-nums cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                value={formData.contract_code}
                placeholder="Chọn căn hộ để tự động tạo mã"
              />
              <p className="text-xs text-ink-soft">
                Mã tự động: HD-&lt;MÃ_CĂN_HỘ&gt;-&lt;MÃ_KH&gt;-&lt;STT&gt;
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-ink-soft mb-1">
                Căn hộ <span className="text-brand-danger">*</span>
              </label>
              <input
                required
                type="text"
                list="apartment-list"
                className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                value={apartmentSearch}
                onChange={(e) => handleApartmentChange(e.target.value)}
                placeholder="Nhập mã căn hộ (VD: A101, B201...)"
              />
              <datalist id="apartment-list">
                {apartments.map((apt) => (
                  <option key={apt.id} value={`${apt.code} - ${apt.houseType} (${apt.area}m²)`} />
                ))}
              </datalist>
              {formData.apartment_id && apartments.find((a) => a.id === formData.apartment_id) && (
                <p className="text-xs text-brand-success">
                  Đã chọn: {apartments.find((a) => a.id === formData.apartment_id)?.code}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-ink-soft mb-1">
                Tổng giá trị (VNĐ) <span className="text-brand-danger">*</span>
              </label>
              <input
                required
                type="number"
                className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink font-mono tabular-nums placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                value={formData.total_value}
                onChange={(e) => setFormData({ ...formData, total_value: e.target.value })}
                placeholder="3000000000"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-ink-soft mb-1">
                VAT (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                value={formData.vat_percent}
                onChange={(e) => setFormData({ ...formData, vat_percent: e.target.value })}
                placeholder="10"
              />
              {formData.total_value && formData.vat_percent && (
                <p className="text-xs text-ink-soft">
                  Số tiền VAT:{' '}
                  <span className="font-mono tabular-nums">
                    {(
                      (parseFloat(formData.total_value) * parseFloat(formData.vat_percent)) /
                      100
                    ).toLocaleString('vi-VN')}{' '}
                    VNĐ
                  </span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-ink-soft mb-1">
                Phí bảo trì (VNĐ)
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink font-mono tabular-nums placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                value={formData.maintenance_fee}
                onChange={(e) => setFormData({ ...formData, maintenance_fee: e.target.value })}
                placeholder="60000000"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-ink-soft mb-1">
                Trạng thái
              </label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
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
              <label className="block text-xs font-semibold text-ink-soft mb-1">
                Ngày ký
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                value={formData.signed_date}
                onChange={(e) => setFormData({ ...formData, signed_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-ink-soft mb-1">
                Ngày bàn giao
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                value={formData.handover_date}
                onChange={(e) => setFormData({ ...formData, handover_date: e.target.value })}
              />
            </div>
          </div>

          {/* Payment Schedule */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">Lịch thanh toán</h3>
              <button
                type="button"
                onClick={handleAddPayment}
                className="flex items-center gap-1.5 text-sm bg-brand-teal hover:brightness-95 text-white px-3 py-1.5 rounded-lg transition-all duration-200"
              >
                <PlusIcon className="w-4 h-4" />
                Thêm đợt
              </button>
            </div>

            {paymentSchedule.map((payment, index) => (
              <div key={index} className="p-4 border border-brand-border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-ink">
                    Đợt {payment.installment}
                  </div>
                  {paymentSchedule.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePayment(index)}
                      aria-label="Xóa đợt thanh toán"
                      className="p-1.5 rounded-lg text-brand-danger hover:bg-brand-danger-soft transition-colors duration-200 cursor-pointer"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-ink-soft mb-1">Mô tả</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                      value={payment.description}
                      onChange={(e) => handlePaymentChange(index, 'description', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-ink-soft mb-1">
                      Hạn thanh toán
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                      value={payment.due_date}
                      onChange={(e) => handlePaymentChange(index, 'due_date', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-ink-soft mb-1">
                      Số tiền (VNĐ)
                    </label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                      value={payment.amount}
                      onChange={(e) =>
                        handlePaymentChange(index, 'amount', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

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
              className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors duration-200 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
              {loading ? 'Đang tạo...' : 'Tạo Hợp đồng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddContractModal;
