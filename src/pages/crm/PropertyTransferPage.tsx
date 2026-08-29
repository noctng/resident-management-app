import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CrmSubNav } from '../../components/crm/CrmSubNav';
import { api } from '../../services/api';
import { useToast, useConfirm } from '../../components/ui';
import {
  ArrowsRightLeftIcon,
  DocumentTextIcon,
  PlusIcon,
  ArrowPathIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  BuildingOfficeIcon,
  UserIcon,
  PrinterIcon,
  SparklesIcon,
} from '../../components/icons';
import { StatCard } from '../../components/ui/Card';

interface PropertyTransferPageProps {
  onNavigate?: (route: string) => void;
  onBack?: () => void;
}

export const PropertyTransferPage: React.FC<PropertyTransferPageProps> = ({ onNavigate, onBack }) => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalTransfers: 0,
    totalInheritedValue: 0,
    thisMonthTransfers: 0,
    multiTransfersCount: 0,
  });

  const [phaseFilter, setPhaseFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isChainModalOpen, setIsChainModalOpen] = useState(false);
  const [isDocPreviewModalOpen, setIsDocPreviewModalOpen] = useState(false);
  const [selectedTransferForDoc, setSelectedTransferForDoc] = useState<any>(null);

  // Transfer Chain State
  const [chainData, setChainData] = useState<any>(null);
  const [loadingChain, setLoadingChain] = useState(false);

  // Create Form State
  const [availableContracts, setAvailableContracts] = useState<any[]>([]);
  const [selectedContractId, setSelectedContractId] = useState('');
  const [eligibility, setEligibility] = useState<any>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  const [createForm, setCreateForm] = useState({
    new_customer_name: '',
    new_customer_phone: '',
    new_customer_id_number: '',
    new_customer_address: '',
    new_customer_email: '',
    notary_office: 'Văn phòng Công chứng Thành Phố Cà Phê',
    notary_number: '',
    notary_date: new Date().toISOString().slice(0, 10),
    tax_receipt_number: '',
    tax_clearance_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  useEffect(() => {
    loadTransfers();
    loadAvailableContracts();
  }, [phaseFilter, searchQuery]);

  // Handle auto-open with query param contract_id
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const contractId = params.get('contract_id');
    if (contractId) {
      setSelectedContractId(contractId);
      setIsCreateModalOpen(true);
      checkContractEligibility(contractId);
    }
  }, [location.search]);

  const loadTransfers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(phaseFilter !== 'ALL' ? { phase: phaseFilter } : {}),
        ...(searchQuery ? { search: searchQuery } : {}),
      });
      const res: any = await api.get(`/crm/transfers?${params.toString()}`);
      if (res && res.success) {
        setTransfers(res.transfers || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách chuyển nhượng:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableContracts = async () => {
    try {
      const res: any = await api.get('/crm/contracts');
      if (res && (res.contracts || Array.isArray(res))) {
        const raw = res.contracts || res;
        setAvailableContracts(raw.filter((c: any) => ['SIGNED', 'PAYING'].includes(c.status)));
      }
    } catch (err) {
      console.error('Lỗi tải danh sách hợp đồng:', err);
    }
  };

  const checkContractEligibility = async (contractId: string) => {
    if (!contractId) {
      setEligibility(null);
      return;
    }
    try {
      setCheckingEligibility(true);
      const res: any = await api.get(`/crm/transfers/check-eligibility/${contractId}`);
      if (res && res.success) {
        setEligibility(res);
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kiểm tra điều kiện chuyển nhượng');
      setEligibility(null);
    } finally {
      setCheckingEligibility(false);
    }
  };

  const handleContractSelect = (contractId: string) => {
    setSelectedContractId(contractId);
    checkContractEligibility(contractId);
  };

  const handleCreateTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractId) {
      toast.error('Vui lòng chọn Hợp đồng chuyển nhượng');
      return;
    }

    if (!eligibility?.eligible) {
      toast.error('Hợp đồng chưa đủ điều kiện chuyển nhượng theo quy định!');
      return;
    }

    const ok = await confirm({
      title: 'Xác Nhận Chuyển Nhượng HĐMB',
      description: `Bạn có chắc chắn muốn chuyển nhượng HĐMB ${eligibility.contract?.contract_code} sang bên nhận ${createForm.new_customer_name}? Toàn bộ lịch thanh toán và số tiền ${Number(eligibility.contract?.total_paid).toLocaleString('vi-VN')} đ đã nộp sẽ được kế thừa nguyên vẹn.`,
      confirmLabel: 'Xác Nhận Chuyển Nhượng',
      variant: 'primary',
    });
    if (!ok) return;

    try {
      const payload = {
        contract_id: selectedContractId,
        ...createForm,
      };
      const res: any = await api.post('/crm/transfers', payload);
      if (res && res.success) {
        toast.success(res.message || 'Chuyển nhượng HĐMB thành công!');
        setIsCreateModalOpen(false);
        setSelectedContractId('');
        setEligibility(null);
        setCreateForm({
          new_customer_name: '',
          new_customer_phone: '',
          new_customer_id_number: '',
          new_customer_address: '',
          new_customer_email: '',
          notary_office: 'Văn phòng Công chứng Thành Phố Cà Phê',
          notary_number: '',
          notary_date: new Date().toISOString().slice(0, 10),
          tax_receipt_number: '',
          tax_clearance_date: new Date().toISOString().slice(0, 10),
          notes: '',
        });
        loadTransfers();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi thực hiện chuyển nhượng');
    }
  };

  const handleViewApartmentChain = async (apartmentId: string) => {
    try {
      setLoadingChain(true);
      setIsChainModalOpen(true);
      const res: any = await api.get(`/crm/transfers/apartment-chain/${apartmentId}`);
      if (res && res.success) {
        setChainData(res);
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tải cây lịch sử căn hộ');
    } finally {
      setLoadingChain(false);
    }
  };

  const handleOpenDocPreview = (trf: any) => {
    setSelectedTransferForDoc(trf);
    setIsDocPreviewModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      <CrmSubNav
        current="transfers"
        title="Quản Lý Chuyển Nhượng HĐMB (B.7)"
        subtitle="Tuân thủ Luật KDBĐS 2023 & Điều 7.3: Kiểm tra nợ quá hạn, kế thừa 100% LTT và truy vết chuỗi sở hữu"
        onNavigate={onNavigate}
        onBack={onBack}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <ArrowsRightLeftIcon className="w-7 h-7 text-accent" />
            <span>Quản Lý Chuyển Nhượng Hợp Đồng Mua Bán</span>
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Giao dịch chuyển nhượng kế thừa toàn bộ nghĩa vụ tài chính và lịch sử thanh toán giữa các đời chủ sở hữu
          </p>
        </div>

        <button
          onClick={() => {
            setIsCreateModalOpen(true);
            setSelectedContractId('');
            setEligibility(null);
          }}
          className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold transition-all duration-200 shadow-sm cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <PlusIcon className="w-4 h-4" />
          <span>+ Lập Hồ Sơ Chuyển Nhượng Mới</span>
        </button>
      </div>

      {/* 4 Financial & Operational Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tổng hồ sơ chuyển nhượng"
          value={`${stats.totalTransfers || 0} hồ sơ`}
          subValue="Đã thực hiện trên hệ thống"
          subTone="neutral"
          icon={ArrowsRightLeftIcon}
          iconBg="bg-accent-soft"
          iconColor="text-accent-ink"
        />
        <StatCard
          label="Tổng giá trị đã kế thừa"
          value={`${Number(stats.totalInheritedValue || 0).toLocaleString('vi-VN')} đ`}
          subValue="Bảo lưu lịch sử đã đóng"
          subTone="success"
          valueTone="success"
          icon={CheckCircleIcon}
          iconBg="bg-brand-success-soft"
          iconColor="text-brand-success"
        />
        <StatCard
          label="Chuyển nhượng trong tháng"
          value={`${stats.thisMonthTransfers || 0} hồ sơ`}
          subValue="Phát sinh tháng này"
          subTone="neutral"
          valueTone="accent"
          icon={ClockIcon}
          iconBg="bg-accent-soft"
          iconColor="text-accent-ink"
        />
        <StatCard
          label="Căn chuyển nhượng >2 lần"
          value={`${stats.multiTransfersCount || 0} căn`}
          subValue="Cảnh báo theo dõi đầu cơ"
          subTone="danger"
          valueTone="warning"
          icon={ExclamationTriangleIcon}
          iconBg="bg-brand-warning-soft"
          iconColor="text-brand-warning"
        />
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-brand-border shadow-xs">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
            className="px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
          >
            <option value="ALL">-- Tất cả phân kỳ --</option>
            <option value="CANTATA">Phân kỳ Cantata</option>
            <option value="TESLA">Phân kỳ Tesla</option>
            <option value="DA_VINCI">Phân kỳ Da Vinci</option>
          </select>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo Mã HS, Mã HĐ, Mã Căn, Tên chủ cũ/mới..."
            className="px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-xs text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent min-w-[280px]"
          />
        </div>
      </div>

      {/* Transfers Table */}
      {loading ? (
        <div className="p-16 text-center text-ink-soft bg-surface rounded-xl border border-brand-border">
          <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto text-accent mb-2" />
          <p>Đang tải danh sách hồ sơ chuyển nhượng...</p>
        </div>
      ) : transfers.length === 0 ? (
        <div className="p-16 text-center text-ink-soft bg-surface rounded-xl border border-dashed border-brand-border space-y-3">
          <ArrowsRightLeftIcon className="w-12 h-12 mx-auto text-ink-faint" />
          <p className="font-bold text-ink text-base">Chưa có giao dịch chuyển nhượng nào</p>
          <p className="text-xs text-ink-soft max-w-md mx-auto">
            Bấm "+ Lập Hồ Sơ Chuyển Nhượng Mới" để bắt đầu quy trình chuyển nhượng HĐMB theo Điều 7.3 Luật KDBĐS 2023.
          </p>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-brand-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-brand-border">
              <thead className="bg-surface-alt text-ink font-bold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Mã Hồ Sơ & Ngày</th>
                  <th className="py-3.5 px-4">Căn Hộ & HĐ Gốc</th>
                  <th className="py-3.5 px-4">Bên Chuyển Nhượng (Cũ)</th>
                  <th className="py-3.5 px-4">Bên Nhận (Mới)</th>
                  <th className="py-3.5 px-4 text-right">Đã Kế Thừa</th>
                  <th className="py-3.5 px-4 text-right">Nợ Còn Lại</th>
                  <th className="py-3.5 px-4">Công Chứng & Thuế</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border font-mono tabular-nums">
                {transfers.map((trf) => (
                  <tr key={trf.id} className="hover:bg-surface-alt/60 transition-colors">
                    <td className="py-3 px-4 font-sans">
                      <strong className="text-accent block font-mono font-bold">{trf.transfer_code || trf.id}</strong>
                      <span className="text-[11px] text-ink-soft">
                        {new Date(trf.transfer_date).toLocaleDateString('vi-VN')}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-sans">
                      <div className="flex items-center gap-1.5">
                        <strong className="text-ink font-mono">{trf.contracts?.apartments?.code}</strong>
                        <span className="px-1.5 py-0.5 rounded bg-surface-alt text-[10px] text-ink-soft">
                          {trf.contracts?.apartments?.phase_code}
                        </span>
                      </div>
                      <span className="text-[11px] text-ink-soft font-mono">{trf.contracts?.contract_code}</span>
                    </td>

                    <td className="py-3 px-4 font-sans">
                      <strong className="text-ink block">{trf.old_customer?.name}</strong>
                      <span className="text-[11px] text-ink-soft">{trf.old_customer?.phone_number}</span>
                    </td>

                    <td className="py-3 px-4 font-sans">
                      <strong className="text-brand-success block">{trf.new_customer?.name}</strong>
                      <span className="text-[11px] text-ink-soft">{trf.new_customer?.phone_number}</span>
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-brand-success">
                      {Number(trf.inherited_paid_amount || 0).toLocaleString('vi-VN')} đ
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-ink">
                      {Number(trf.remaining_debt_amount || 0).toLocaleString('vi-VN')} đ
                    </td>

                    <td className="py-3 px-4 font-sans text-[11px] text-ink-soft">
                      <div>VPCC: <strong>{trf.notary_office || 'Đã công chứng'}</strong></div>
                      {trf.notary_number && <div>Số: {trf.notary_number}</div>}
                    </td>

                    <td className="py-3 px-4 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleViewApartmentChain(trf.contracts?.apartment_id)}
                          className="px-2.5 py-1 bg-surface border border-brand-border hover:bg-surface-alt text-ink rounded-lg text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs"
                          title="Xem cây lịch sử sở hữu căn hộ"
                        >
                          <ClockIcon className="w-3.5 h-3.5 text-accent" />
                          <span>Cây Sở Hữu</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenDocPreview(trf)}
                          className="px-2.5 py-1 bg-accent-soft hover:bg-accent-soft/80 text-accent-ink rounded-lg text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                          title="In Văn Bản Xác Nhận 3 Bên"
                        >
                          <PrinterIcon className="w-3.5 h-3.5" />
                          <span>Văn Bản</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE TRANSFER ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h3 className="font-bold text-ink text-base flex items-center gap-2">
                <ArrowsRightLeftIcon className="w-5 h-5 text-accent" />
                <span>Lập Hồ Sơ Chuyển Nhượng Hợp Đồng Mua Bán (B.7)</span>
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1.5 text-ink-soft hover:text-ink rounded-lg transition-colors cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransferSubmit} className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              {/* Step 1: Select Contract */}
              <div>
                <label className="block font-semibold text-ink-soft mb-1">
                  Chọn Hợp Đồng Cần Chuyển Nhượng <span className="text-brand-danger">*</span>
                </label>
                <select
                  required
                  value={selectedContractId}
                  onChange={(e) => handleContractSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
                >
                  <option value="">-- Chọn hợp đồng mua bán --</option>
                  {availableContracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.contract_code} — Căn {c.apartments?.code || c.apartment_id} ({c.customers?.name || 'Khách hàng'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Eligibility Check Banner */}
              {checkingEligibility && (
                <div className="p-3 bg-surface-alt rounded-xl border border-brand-border text-center text-ink-soft">
                  <ArrowPathIcon className="w-5 h-5 animate-spin mx-auto text-accent mb-1" />
                  <span>Đang kiểm tra điều kiện chuyển nhượng theo Điều 7.3...</span>
                </div>
              )}

              {eligibility && !checkingEligibility && (
                <div className="space-y-2">
                  {eligibility.eligible ? (
                    <div className="p-3.5 bg-brand-success-soft text-brand-success rounded-xl border border-brand-success/30 flex items-start gap-2.5">
                      <CheckCircleIcon className="w-5 h-5 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <strong>Hợp đồng ĐỦ ĐIỀU KIỆN chuyển nhượng theo Điều 7.3 Luật KDBĐS 2023.</strong>
                        <p className="text-[11px] text-ink-soft">
                          Chủ sở hữu hiện tại: <strong>{eligibility.contract?.customer_name}</strong> • Đã nộp: <strong className="font-mono text-brand-success">{Number(eligibility.contract?.total_paid).toLocaleString('vi-VN')} đ</strong> (100% kế thừa sang bên mới) • Nợ còn lại: <strong className="font-mono">{Number(eligibility.contract?.remaining_debt).toLocaleString('vi-VN')} đ</strong>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-brand-danger-soft text-brand-danger rounded-xl border border-brand-danger/30 flex items-start gap-2.5">
                      <ExclamationTriangleIcon className="w-5 h-5 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <strong>KHÔNG ĐỦ ĐIỀU KIỆN CHUYỂN NHƯỢNG:</strong>
                        <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                          {eligibility.issues?.map((iss: string, idx: number) => (
                            <li key={idx}>{iss}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {eligibility.contract?.is_speculation_warning && (
                    <div className="p-2.5 bg-brand-warning-soft text-brand-warning rounded-lg text-[11px] font-semibold border border-brand-warning/30 flex items-center gap-2">
                      <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
                      <span>Cảnh báo: Căn hộ này đã chuyển nhượng {eligibility.contract?.previous_transfers_count} lần trước đây.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: New Buyer Details */}
              <div className="pt-2 border-t border-brand-border space-y-3">
                <h4 className="font-bold text-ink text-sm flex items-center gap-1.5">
                  <UserIcon className="w-4 h-4 text-accent" />
                  <span>Thông Tin Bên Nhận Chuyển Nhượng (Chủ Mới)</span>
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">
                      Họ và tên bên nhận <span className="text-brand-danger">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={createForm.new_customer_name}
                      onChange={(e) => setCreateForm({ ...createForm, new_customer_name: e.target.value })}
                      placeholder="VD: Nguyễn Văn A"
                      className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">
                      Số điện thoại <span className="text-brand-danger">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={createForm.new_customer_phone}
                      onChange={(e) => setCreateForm({ ...createForm, new_customer_phone: e.target.value })}
                      placeholder="0912xxxxxx"
                      className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink font-mono focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Số CCCD / Hộ chiếu</label>
                    <input
                      type="text"
                      value={createForm.new_customer_id_number}
                      onChange={(e) => setCreateForm({ ...createForm, new_customer_id_number: e.target.value })}
                      placeholder="0400xxxxxxxx"
                      className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink font-mono focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Email</label>
                    <input
                      type="email"
                      value={createForm.new_customer_email}
                      onChange={(e) => setCreateForm({ ...createForm, new_customer_email: e.target.value })}
                      placeholder="nguyenvana@gmail.com"
                      className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Địa chỉ thường trú</label>
                  <input
                    type="text"
                    value={createForm.new_customer_address}
                    onChange={(e) => setCreateForm({ ...createForm, new_customer_address: e.target.value })}
                    placeholder="Địa chỉ liên hệ theo CCCD..."
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </div>
              </div>

              {/* Step 3: Notary & Tax Information */}
              <div className="pt-2 border-t border-brand-border space-y-3">
                <h4 className="font-bold text-ink text-sm flex items-center gap-1.5">
                  <DocumentTextIcon className="w-4 h-4 text-accent" />
                  <span>Hồ Sơ Pháp Lý, Công Chứng & Thuế TNCN</span>
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Văn phòng công chứng</label>
                    <input
                      type="text"
                      value={createForm.notary_office}
                      onChange={(e) => setCreateForm({ ...createForm, notary_office: e.target.value })}
                      className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Số công chứng</label>
                    <input
                      type="text"
                      value={createForm.notary_number}
                      onChange={(e) => setCreateForm({ ...createForm, notary_number: e.target.value })}
                      placeholder="VD: 01829/2026/TPCP"
                      className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink font-mono focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Ngày công chứng</label>
                    <input
                      type="date"
                      value={createForm.notary_date}
                      onChange={(e) => setCreateForm({ ...createForm, notary_date: e.target.value })}
                      className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-ink-soft mb-1">Mã biên lai thuế TNCN</label>
                    <input
                      type="text"
                      value={createForm.tax_receipt_number}
                      onChange={(e) => setCreateForm({ ...createForm, tax_receipt_number: e.target.value })}
                      placeholder="VD: CCT-82910..."
                      className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink font-mono focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Ghi chú chuyển nhượng</label>
                  <textarea
                    rows={2}
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                    placeholder="Ghi chú điều khoản đặc biệt giữa hai bên..."
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-brand-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl font-bold hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!eligibility?.eligible}
                  className={`px-5 py-2 rounded-xl font-bold transition-colors cursor-pointer shadow-sm ${
                    eligibility?.eligible
                      ? 'bg-accent hover:bg-accent-hover text-white'
                      : 'bg-surface-alt text-ink-faint cursor-not-allowed'
                  }`}
                >
                  Xác Nhận Chuyển Nhượng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: APARTMENT TRANSFER CHAIN (LINEAGE TIMELINE) ── */}
      {isChainModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <div>
                <h3 className="font-bold text-ink text-base flex items-center gap-2">
                  <ClockIcon className="w-5 h-5 text-accent" />
                  <span>Cây Lịch Sử Sở Hữu Căn Hộ: {chainData?.apartment?.code}</span>
                </h3>
                <p className="text-xs text-ink-soft mt-0.5">
                  Phân kỳ: {chainData?.apartment?.phase_code} • Tổng số lần chuyển nhượng: {chainData?.apartment?.total_transfers || 0}
                </p>
              </div>
              <button onClick={() => setIsChainModalOpen(false)} className="p-1.5 text-ink-soft hover:text-ink rounded-lg transition-colors cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 text-xs">
              {loadingChain ? (
                <div className="p-12 text-center text-ink-soft">
                  <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto text-accent mb-2" />
                  <p>Đang tải chuỗi sở hữu...</p>
                </div>
              ) : !chainData?.timeline || chainData.timeline.length === 0 ? (
                <div className="p-12 text-center text-ink-soft">Chưa có dữ liệu lịch sử sở hữu.</div>
              ) : (
                <div className="relative pl-6 border-l-2 border-accent/40 space-y-6">
                  {chainData.timeline.map((step: any, idx: number) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-accent border-2 border-surface shadow-xs"></div>
                      <div className="bg-surface-alt p-4 rounded-xl border border-brand-border space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-soft text-accent-ink uppercase">
                              {step.role}
                            </span>
                            <h4 className="font-bold text-ink text-sm mt-1">{step.title}</h4>
                          </div>
                          {step.date && (
                            <span className="font-mono text-xs text-ink-soft">
                              {new Date(step.date).toLocaleDateString('vi-VN')}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-ink-soft space-y-1">
                          <div>
                            Chủ sở hữu: <strong className="text-ink">{step.owner_name}</strong>
                            {step.owner_phone && ` • ${step.owner_phone}`}
                          </div>
                          {step.contract_code && (
                            <div>Mã HĐMB: <strong className="font-mono text-accent">{step.contract_code}</strong></div>
                          )}
                          {step.transfer_code && (
                            <div>Mã HS Chuyển nhượng: <strong className="font-mono text-accent">{step.transfer_code}</strong></div>
                          )}
                          {step.inherited_paid !== undefined && (
                            <div>
                              Số tiền đã kế thừa: <strong className="font-mono text-brand-success">{step.inherited_paid.toLocaleString('vi-VN')} đ</strong>
                            </div>
                          )}
                          {step.notary_office && (
                            <div>Văn phòng công chứng: {step.notary_office}</div>
                          )}
                          {step.notes && <p className="italic text-[11px] pt-1 text-ink-soft border-t border-brand-border">{step.notes}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-brand-border bg-surface-alt flex justify-end">
              <button
                type="button"
                onClick={() => setIsChainModalOpen(false)}
                className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl font-bold hover:bg-surface-alt transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DOCUMENT PREVIEW (VĂN BẢN XÁC NHẬN 3 BÊN) ── */}
      {isDocPreviewModalOpen && selectedTransferForDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h3 className="font-bold text-ink text-base flex items-center gap-2">
                <PrinterIcon className="w-5 h-5 text-accent" />
                <span>Văn Bản Xác Nhận Chuyển Nhượng HĐMB (3 Bên)</span>
              </h3>
              <button onClick={() => setIsDocPreviewModalOpen(false)} className="p-1.5 text-ink-soft hover:text-ink rounded-lg transition-colors cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 text-xs space-y-4 bg-white text-ink leading-relaxed font-sans border-y border-brand-border">
              <div className="text-center space-y-1">
                <h4 className="font-bold uppercase text-sm">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h4>
                <p className="font-bold text-xs">Độc lập - Tự do - Hạnh phúc</p>
                <div className="w-24 h-0.5 bg-ink mx-auto mt-1"></div>
              </div>

              <div className="text-center pt-2">
                <h3 className="text-base font-bold uppercase text-ink">
                  VĂN BẢN XÁC NHẬN CHUYỂN NHƯỢNG HỢP ĐỒNG MUA BÁN
                </h3>
                <p className="text-xs font-mono text-ink-soft mt-0.5">Số: {selectedTransferForDoc.transfer_code || selectedTransferForDoc.id}</p>
              </div>

              <p>Hôm nay, ngày {new Date(selectedTransferForDoc.transfer_date).toLocaleDateString('vi-VN')}, tại Dự Án Thành Phố Cà Phê, chúng tôi gồm có:</p>

              <div className="p-3 bg-surface-alt rounded-lg space-y-1">
                <strong>BÊN A (CHỦ ĐẦU TƯ): CÔNG TY CỔ PHẦN ĐẦU TƯ TRUNG NGUYÊN</strong>
                <p className="text-ink-soft">Địa chỉ: Đường Nguyễn Đình Chiểu, Phường Tân Lợi, TP. Buôn Ma Thuột, Đắk Lắk</p>
              </div>

              <div className="p-3 bg-surface-alt rounded-lg space-y-1">
                <strong>BÊN B (BÊN CHUYỂN NHƯỢNG - CHỦ CŨ): {selectedTransferForDoc.old_customer?.name}</strong>
                <p className="text-ink-soft">Số điện thoại: {selectedTransferForDoc.old_customer?.phone_number} • CCCD: {selectedTransferForDoc.old_customer?.id_number || 'N/A'}</p>
              </div>

              <div className="p-3 bg-surface-alt rounded-lg space-y-1">
                <strong>BÊN C (BÊN NHẬN CHUYỂN NHƯỢNG - CHỦ MỚI): {selectedTransferForDoc.new_customer?.name}</strong>
                <p className="text-ink-soft">Số điện thoại: {selectedTransferForDoc.new_customer?.phone_number} • CCCD: {selectedTransferForDoc.new_customer?.id_number || 'N/A'}</p>
              </div>

              <div className="space-y-2 pt-2">
                <p><strong>Căn cứ:</strong></p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>Luật Kinh Doanh Bất Động Sản số 29/2023/QH15.</li>
                  <li>Hợp đồng Mua bán số <strong>{selectedTransferForDoc.contracts?.contract_code}</strong> đối với Căn hộ số <strong>{selectedTransferForDoc.contracts?.apartments?.code}</strong>.</li>
                  <li>Văn bản công chứng số {selectedTransferForDoc.notary_number || 'N/A'} tại {selectedTransferForDoc.notary_office}.</li>
                </ul>
              </div>

              <div className="p-3 border border-brand-border rounded-lg space-y-1.5">
                <strong className="text-accent">XÁC NHẬN NGHĨA VỤ KẾ THỪA:</strong>
                <p>1. Bên C kế thừa toàn bộ quyền, nghĩa vụ và trách nhiệm từ Bên B theo HĐMB đã ký.</p>
                <p>2. Tổng số tiền đã thanh toán kế thừa: <strong className="font-mono text-brand-success">{Number(selectedTransferForDoc.inherited_paid_amount || 0).toLocaleString('vi-VN')} VNĐ</strong>.</p>
                <p>3. Tổng số tiền còn phải thanh toán tiếp theo tiến độ: <strong className="font-mono text-ink">{Number(selectedTransferForDoc.remaining_debt_amount || 0).toLocaleString('vi-VN')} VNĐ</strong>.</p>
              </div>

              <div className="grid grid-cols-3 text-center pt-8 font-bold">
                <div>
                  <p>ĐẠI DIỆN BÊN A</p>
                  <span className="text-[10px] font-normal text-ink-soft">(Ký, đóng dấu)</span>
                </div>
                <div>
                  <p>BÊN CHUYỂN NHƯỢNG (B)</p>
                  <span className="text-[10px] font-normal text-ink-soft">(Ký, ghi rõ họ tên)</span>
                </div>
                <div>
                  <p>BÊN NHẬN CHUYỂN NHƯỢNG (C)</p>
                  <span className="text-[10px] font-normal text-ink-soft">(Ký, ghi rõ họ tên)</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-brand-border bg-surface-alt flex justify-between items-center">
              <span className="text-xs text-ink-soft">Văn bản xác nhận điện tử được trích xuất từ Hệ thống CRM Thành Phố Cà Phê</span>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
              >
                <PrinterIcon className="w-4 h-4" />
                <span>In Văn Bản</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyTransferPage;
