import { CrmSubNav } from '../../components/crm/CrmSubNav';
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import type { DepositReceipt, DepositStatus, ProductUnit } from '../../types';
import { useToast, useConfirm } from '../../components/ui';
import {
  BanknotesIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XMarkIcon,
  PlusIcon,
  DocumentTextIcon,
  SparklesIcon,
} from '../../components/icons';

interface DepositListPageProps {
  onNavigate?: (route: string) => void;
  onBack?: () => void;
}

export const DepositListPage: React.FC<DepositListPageProps> = ({ onNavigate, onBack, onNavigate: _onNavigate }) => {
  const toast = useToast();
  const location = useLocation();
  const { confirm } = useConfirm();
  const [deposits, setDeposits] = useState<DepositReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [phaseFilter, setPhaseFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<DepositReceipt | null>(null);
  const [availableUnits, setAvailableUnits] = useState<ProductUnit[]>([]);

  // Confirm Form State
  const [confirmForm, setConfirmForm] = useState({
    paid_amount: 0,
    payment_reference: '',
    notes: '',
  });

  // Transfer Form State
  const [transferForm, setTransferForm] = useState({
    new_apartment_id: '',
    transfer_reason: '',
  });

  // Create Form State
  const [createForm, setCreateForm] = useState({
    apartment_id: '',
    booking_id: '',
    customer_name: '',
    customer_phone: '',
    customer_id_number: '',
    deposit_amount: 100000000,
    paid_amount: 0,
    payment_method: 'BANK_TRANSFER',
    notes: '',
  });

  useEffect(() => {
    loadDeposits();
    loadAvailableUnits();
  }, [statusFilter, phaseFilter]);

  // Handle URL pre-fill from Booking page
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const bookingId = query.get('booking_id');
    const aptId = query.get('apartment_id');
    const custName = query.get('customer_name');
    const custPhone = query.get('customer_phone');
    const depAmt = query.get('deposit_amount');

    if (bookingId || aptId) {
      setCreateForm((prev) => ({
        ...prev,
        booking_id: bookingId || '',
        apartment_id: aptId || prev.apartment_id,
        customer_name: custName || prev.customer_name,
        customer_phone: custPhone || prev.customer_phone,
        deposit_amount: depAmt ? Number(depAmt) : prev.deposit_amount,
      }));
      setIsCreateModalOpen(true);
      toast.info('Đã tải thông tin từ phiếu giữ chỗ để lập phiếu cọc.');
    }
  }, [location.search]);

  const loadDeposits = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
        ...(phaseFilter !== 'ALL' ? { phase: phaseFilter } : {}),
        ...(searchTerm ? { search: searchTerm } : {}),
      });
      const res: any = await api.get(`/crm/deposits?${params.toString()}`);
      if (res && res.success) {
        setDeposits(res.deposits || []);
      }
    } catch (err) {
      console.error('Failed to load deposits:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUnits = async () => {
    try {
      const res: any = await api.get('/products/matrix');
      if (res && res.success && res.matrix) {
        const units: ProductUnit[] = [];
        Object.values(res.matrix).forEach((phaseMap: any) => {
          Object.values(phaseMap).forEach((blockUnits: any) => {
            units.push(...blockUnits.filter((u: any) => u.sales_status === 'AVAILABLE' || u.sales_status === 'BOOKED' || !u.sales_status));
          });
        });
        setAvailableUnits(units);
      }
    } catch (err) {
      console.error('Failed to load available units:', err);
    }
  };

  const handleCreateDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.post('/crm/deposits', createForm);
      if (res && res.success) {
        toast.success(res.message || 'Đã tạo phiếu cọc');
        setIsCreateModalOpen(false);
        setCreateForm({
          apartment_id: '',
          booking_id: '',
          customer_name: '',
          customer_phone: '',
          customer_id_number: '',
          deposit_amount: 100000000,
          paid_amount: 0,
          payment_method: 'BANK_TRANSFER',
          notes: '',
        });
        loadDeposits();
        loadAvailableUnits();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi tạo phiếu cọc');
    }
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeposit) return;
    try {
      const res: any = await api.post(`/crm/deposits/${selectedDeposit.id}/confirm`, confirmForm);
      if (res && res.success) {
        toast.success(res.message || 'Đã xác nhận thanh toán');
        setIsConfirmModalOpen(false);
        loadDeposits();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi xác nhận');
    }
  };

  const handleTransferDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeposit) return;
    try {
      const res: any = await api.post(`/crm/deposits/${selectedDeposit.id}/transfer`, transferForm);
      if (res && res.success) {
        toast.success(res.message || 'Đã chuyển cọc');
        setIsTransferModalOpen(false);
        loadDeposits();
        loadAvailableUnits();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi chuyển cọc');
    }
  };

  const handleOutcome = async (id: string, action: 'REFUND' | 'FORFEIT') => {
    const ok = await confirm({
      title: action === 'REFUND' ? 'Hoàn cọc' : 'Tịch thu cọc',
      description: `Xác nhận ${action === 'REFUND' ? 'hoàn cọc' : 'tịch thu cọc'}? Vui lòng cập nhật lý do vào ghi chú phiếu cọc nếu cần.`,
      variant: 'danger',
      confirmLabel: action === 'REFUND' ? 'Hoàn cọc' : 'Tịch thu',
      cancelLabel: 'Hủy',
    });
    if (!ok) return;
    const reason = '';
    try {
      const res: any = await api.post(`/crm/deposits/${id}/outcome`, { action, reason });
      if (res && res.success) {
        toast.success(res.message || 'Đã xử lý');
        loadDeposits();
        loadAvailableUnits();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xử lý');
    }
  };

  const getStatusBadge = (status: DepositStatus) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return { label: 'Chờ tiền về', cls: 'bg-brand-warning-soft text-brand-warning', dot: 'bg-brand-warning' };
      case 'ACTIVE':
        return { label: 'Đã thu đủ', cls: 'bg-brand-success-soft text-brand-success', dot: 'bg-brand-success' };
      case 'CONVERTED_CONTRACT':
        return { label: 'Đã ký HĐMB', cls: 'bg-brand-teal-soft text-brand-teal', dot: 'bg-brand-teal' };
      case 'REFUNDED':
        return { label: 'Đã hoàn cọc', cls: 'bg-brand-danger-soft text-brand-danger', dot: 'bg-brand-danger' };
      case 'FORFEITED':
        return { label: 'Đã tịch cọc', cls: 'bg-brand-danger-soft text-brand-danger', dot: 'bg-brand-danger' };
      default:
        return { label: status, cls: 'bg-surface-alt text-ink-soft', dot: 'bg-ink-soft' };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <CrmSubNav current="deposits" title="Phiếu Thu Đặt Cọc (PDC)" subtitle="Quản lý phiếu đặt cọc, chuyển cọc & kế toán xác nhận thanh toán" onNavigate={onNavigate} onBack={onBack} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <BanknotesIcon className="w-7 h-7 text-primary-600" />
            Quản Lý Đặt Cọc (Deposit Receipts - PDC)
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Tách bạch Lập phiếu (Sale) và Xác nhận thu tiền (Kế toán), Cọc chuyển căn và Hoàn/Tịch cọc
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-colors duration-200 cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          <span>+ Lập Phiếu Đặt Cọc</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-surface p-4 rounded-xl border border-brand-border flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo mã phiếu, căn hộ, khách hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadDeposits()}
              className="w-full pl-9 pr-4 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-ink-faint"
            />
          </div>
          <button
            onClick={loadDeposits}
            className="px-3 py-2 bg-surface border border-brand-border rounded-lg text-xs font-semibold text-ink hover:bg-surface-alt transition-colors duration-150 flex items-center gap-1 cursor-pointer"
          >
            <ArrowPathIcon className="w-3.5 h-3.5" />
            <span>Lọc</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING_PAYMENT">Chờ tiền về</option>
            <option value="ACTIVE">Đã thu đủ</option>
            <option value="CONVERTED_CONTRACT">Đã ký HĐMB</option>
            <option value="REFUNDED">Đã hoàn cọc</option>
            <option value="FORFEITED">Đã tịch cọc</option>
          </select>
        </div>
      </div>

      {/* Deposits Table */}
      <div className="bg-surface rounded-xl border border-brand-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-ink-soft">
            <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto text-accent mb-2" />
            <span className="text-xs">Đang tải danh sách phiếu đặt cọc...</span>
          </div>
        ) : deposits.length === 0 ? (
          <div className="p-16 text-center text-ink-soft">
            <BanknotesIcon className="w-12 h-12 mx-auto text-ink-faint mb-2" />
            <p className="font-bold text-ink">Chưa có phiếu đặt cọc nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-alt text-[11px] uppercase tracking-wider text-ink-soft font-semibold border-b border-brand-border">
                <tr>
                  <th className="py-3.5 px-4">Mã Phiếu PDC</th>
                  <th className="py-3.5 px-4">Căn / Phân khu</th>
                  <th className="py-3.5 px-4">Khách hàng</th>
                  <th className="py-3.5 px-4 text-right">Số tiền cọc</th>
                  <th className="py-3.5 px-4 text-right">Đã nộp</th>
                  <th className="py-3.5 px-4 text-center">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {deposits.map((dep) => {
                  const badge = getStatusBadge(dep.status);
                  return (
                    <tr key={dep.id} className="hover:bg-surface-alt/60 transition-colors duration-150">
                      <td className="py-3.5 px-4 font-mono font-semibold text-ink">
                        {dep.deposit_code}
                      </td>
                      <td className="py-3.5 px-4">
                        <strong className="text-ink block">{dep.apartments?.code}</strong>
                        <span className="text-[10px] text-ink-soft">{dep.apartments?.phase_code || 'CANTATA'}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <strong className="text-ink block">{dep.customer_name}</strong>
                        <span className="font-mono text-ink-soft">{dep.customer_phone}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-ink">
                        {Number(dep.deposit_amount).toLocaleString('vi-VN')} VNĐ
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-brand-success">
                        {Number(dep.paid_amount || 0).toLocaleString('vi-VN')} VNĐ
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {dep.status === 'PENDING_PAYMENT' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDeposit(dep);
                                setConfirmForm({
                                  paid_amount: Number(dep.deposit_amount),
                                  payment_reference: '',
                                  notes: '',
                                });
                                setIsConfirmModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent hover:bg-accent-hover text-white rounded-lg font-bold text-[10px] transition-colors duration-150 cursor-pointer shadow-xs"
                            >
                              <CheckCircleIcon className="w-3 h-3" />
                              Xác Nhận Thu Tiền
                            </button>
                          )}

                          {dep.status === 'ACTIVE' && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDeposit(dep);
                                  setIsTransferModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-surface border border-brand-border text-ink hover:bg-surface-alt rounded-lg font-bold text-[10px] transition-colors duration-150 cursor-pointer"
                              >
                                <ArrowPathIcon className="w-3 h-3" />
                                Chuyển Căn
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOutcome(dep.id, 'REFUND')}
                                className="px-2 py-1 bg-surface border border-brand-border text-ink hover:bg-surface-alt rounded-lg font-bold text-[10px] transition-colors duration-150 cursor-pointer"
                              >
                                Hoàn
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOutcome(dep.id, 'FORFEIT')}
                                className="px-2 py-1 bg-brand-danger text-white rounded-lg font-bold text-[10px] hover:brightness-95 transition cursor-pointer"
                              >
                                Tịch
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Payment Modal (Accountant) */}
      {isConfirmModalOpen && selectedDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-elevation-raised border border-brand-border w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h3 className="font-bold text-ink text-base">
                Xác Nhận Thu Tiền Cọc: {selectedDeposit.deposit_code}
              </h3>
              <button onClick={() => setIsConfirmModalOpen(false)} className="p-1.5 rounded-lg border border-brand-border text-ink-soft hover:text-accent hover:border-accent/40 transition-colors duration-150 cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Số tiền thực nhận (VNĐ) <span className="text-brand-danger">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={confirmForm.paid_amount}
                  onChange={(e) => setConfirmForm({ ...confirmForm, paid_amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink font-mono tabular-nums text-right font-bold focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Mã giao dịch / Tham chiếu ngân hàng
                </label>
                <input
                  type="text"
                  value={confirmForm.payment_reference}
                  onChange={(e) => setConfirmForm({ ...confirmForm, payment_reference: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-ink-faint"
                  placeholder="VD: FT240824123456 (Vietcombank)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Ghi chú kế toán
                </label>
                <textarea
                  rows={2}
                  value={confirmForm.notes}
                  onChange={(e) => setConfirmForm({ ...confirmForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-ink-faint"
                  placeholder="Đã đối soát khớp tiền trên SePay..."
                />
              </div>

              <div className="pt-3 border-t border-brand-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl font-bold hover:bg-surface-alt transition-colors duration-150 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-colors duration-150 cursor-pointer"
                >
                  Xác Nhận & Đổi Trạng Thái
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {isTransferModalOpen && selectedDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-elevation-raised border border-brand-border w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h3 className="font-bold text-ink text-base">
                Cọc Chuyển Căn: Căn hiện tại {selectedDeposit.apartments?.code}
              </h3>
              <button onClick={() => setIsTransferModalOpen(false)} className="p-1.5 rounded-lg border border-brand-border text-ink-soft hover:text-accent hover:border-accent/40 transition-colors duration-150 cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransferDeposit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Chọn căn hộ mới sẵn bán <span className="text-brand-danger">*</span>
                </label>
                <select
                  required
                  value={transferForm.new_apartment_id}
                  onChange={(e) => setTransferForm({ ...transferForm, new_apartment_id: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
                >
                  <option value="">-- Chọn căn hộ sẵn bán --</option>
                  {availableUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.code} ({u.phase_code || 'CANTATA'}) - {u.land_area || u.area} m²
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Lý do chuyển căn
                </label>
                <textarea
                  rows={2}
                  required
                  value={transferForm.transfer_reason}
                  onChange={(e) => setTransferForm({ ...transferForm, transfer_reason: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-ink-faint"
                  placeholder="Khách đổi sang lô góc..."
                />
              </div>

              <div className="pt-3 border-t border-brand-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl font-bold hover:bg-surface-alt transition-colors duration-150 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-colors duration-150 cursor-pointer"
                >
                  Xác Nhận Chuyển Căn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Deposit Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-elevation-raised border border-brand-border w-full max-w-lg overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h3 className="font-bold text-ink text-base">
                + Lập Phiếu Đặt Cọc (PDC)
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1.5 rounded-lg border border-brand-border text-ink-soft hover:text-accent hover:border-accent/40 transition-colors duration-150 cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDeposit} className="p-5 space-y-4 text-xs">
              {createForm.booking_id && (
                <div className="p-3 bg-accent-soft text-accent-ink rounded-xl border border-accent/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-accent" />
                    <span>Chuyển tiếp tự động từ Phiếu Giữ Chỗ (Booking)</span>
                  </div>
                  <span className="font-mono font-bold text-[11px] bg-surface px-2 py-0.5 rounded-md border border-brand-border">
                    {createForm.booking_id}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Chọn Căn / Lô <span className="text-brand-danger">*</span>
                </label>
                <select
                  required
                  value={createForm.apartment_id}
                  onChange={(e) => setCreateForm({ ...createForm, apartment_id: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
                >
                  <option value="">-- Chọn căn hộ sẵn bán --</option>
                  {availableUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.code} ({u.phase_code || 'CANTATA'}) - {u.land_area || u.area} m²
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Họ tên khách hàng <span className="text-brand-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.customer_name}
                    onChange={(e) => setCreateForm({ ...createForm, customer_name: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-ink-faint"
                    placeholder="VD: Trần Văn Hoàng"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Số điện thoại <span className="text-brand-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.customer_phone}
                    onChange={(e) => setCreateForm({ ...createForm, customer_phone: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-ink-faint"
                    placeholder="VD: 0912345678"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Số CCCD / Mã số thuế
                  </label>
                  <input
                    type="text"
                    value={createForm.customer_id_number}
                    onChange={(e) => setCreateForm({ ...createForm, customer_id_number: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-ink-faint"
                    placeholder="VD: 066092001234"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Số tiền cọc (VNĐ) <span className="text-brand-danger">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={createForm.deposit_amount}
                    onChange={(e) => setCreateForm({ ...createForm, deposit_amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink font-mono tabular-nums text-right font-bold focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Ghi chú phiếu cọc
                </label>
                <textarea
                  rows={2}
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-ink-faint"
                  placeholder="Ghi chú điều khoản đặc biệt..."
                />
              </div>

              <div className="pt-3 border-t border-brand-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl font-bold hover:bg-surface-alt transition-colors duration-150 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-colors duration-150 cursor-pointer"
                >
                  Tạo Phiếu Đặt Cọc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepositListPage;
