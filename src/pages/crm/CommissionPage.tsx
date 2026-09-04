import React, { useState, useEffect } from 'react';
import { CrmSubNav } from '../../components/crm/CrmSubNav';
import { api } from '../../services/api';
import { useToast, useConfirm } from '../../components/ui';
import { EmptyState } from '../../components/ui';
import {
  BanknotesIcon,
  SparklesIcon,
  ArrowPathIcon,
  PlusIcon,
  CheckCircleIcon,
  XMarkIcon,
  DocumentTextIcon,
  CheckBadgeIcon,
  UserIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  BuildingOfficeIcon,
} from '../../components/icons';
import { StatCard } from '../../components/ui/Card';

interface CommissionPageProps {
  onNavigate?: (route: string) => void;
  onBack?: () => void;
}

export const CommissionPage: React.FC<CommissionPageProps> = ({ onNavigate, onBack }) => {
  const toast = useToast();
  const { confirm } = useConfirm();

  const [activeTab, setActiveTab] = useState<'commissions' | 'policies' | 'payouts'>('commissions');
  const [loading, setLoading] = useState(true);

  // Commissions State
  const [commissions, setCommissions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalCommission: 0,
    totalPaid: 0,
    totalPending: 0,
    pendingApprovalCount: 0,
  });
  const [beneficiaryFilter, setBeneficiaryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Policy State
  const [policies, setPolicies] = useState<any[]>([]);
  const [isCreatePolicyModalOpen, setIsCreatePolicyModalOpen] = useState(false);
  const [createPolicyForm, setCreatePolicyForm] = useState({
    policy_name: '',
    beneficiary_type: 'INTERNAL_SALE',
    phase_code: 'ALL',
    commission_rate: 1.5,
    trigger_milestone: 'ON_CONTRACT_SIGNED',
    description: '',
  });

  // Payout Modal State
  const [selectedCmsForPayout, setSelectedCmsForPayout] = useState<any>(null);
  const [payoutForm, setPayoutForm] = useState({
    amount: 0,
    payout_date: new Date().toISOString().slice(0, 10),
    payment_method: 'BANK_TRANSFER',
    reference_doc: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [activeTab, beneficiaryFilter, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'commissions' || activeTab === 'payouts') {
        const params = new URLSearchParams({
          ...(beneficiaryFilter !== 'ALL' ? { beneficiary_type: beneficiaryFilter } : {}),
          ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
        });
        const res: any = await api.get(`/crm/commissions?${params.toString()}`);
        if (res && res.success) {
          setCommissions(res.commissions || []);
          if (res.stats) setStats(res.stats);
        }
      }

      if (activeTab === 'policies') {
        const res: any = await api.get('/crm/commissions/policies');
        if (res && res.success) {
          setPolicies(res.policies || []);
        }
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu hoa hồng:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.post('/crm/commissions/policies', createPolicyForm);
      if (res && res.success) {
        toast.success(res.message || 'Tạo chính sách hoa hồng thành công');
        setIsCreatePolicyModalOpen(false);
        setCreatePolicyForm({
          policy_name: '',
          beneficiary_type: 'INTERNAL_SALE',
          phase_code: 'ALL',
          commission_rate: 1.5,
          trigger_milestone: 'ON_CONTRACT_SIGNED',
          description: '',
        });
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tạo chính sách hoa hồng');
    }
  };

  const handleApproveCommission = async (id: string) => {
    const ok = await confirm({
      title: 'Phê duyệt hoa hồng',
      description: 'Phê duyệt quyết toán khoản hoa hồng này cho nhân viên/đại lý?',
      confirmLabel: 'Phê duyệt',
      variant: 'primary',
    });
    if (!ok) return;

    try {
      const res: any = await api.post(`/crm/commissions/${id}/approve`, { notes: 'Đạt điều kiện duyệt' });
      if (res && res.success) {
        toast.success(res.message || 'Đã phê duyệt hoa hồng');
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi phê duyệt hoa hồng');
    }
  };

  const handleOpenPayout = (cms: any) => {
    setSelectedCmsForPayout(cms);
    setPayoutForm({
      amount: Number(cms.remaining_amount || 0),
      payout_date: new Date().toISOString().slice(0, 10),
      payment_method: 'BANK_TRANSFER',
      reference_doc: `UNC-${cms.contracts?.contract_code || 'HH'}`,
      notes: `Chi trả hoa hồng HĐ ${cms.contracts?.contract_code}`,
    });
  };

  const handleCreatePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCmsForPayout) return;
    try {
      const res: any = await api.post(`/crm/commissions/${selectedCmsForPayout.id}/payout`, payoutForm);
      if (res && res.success) {
        toast.success(res.message || 'Đã lập phiếu chi hoa hồng');
        setSelectedCmsForPayout(null);
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi lập phiếu chi');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      <CrmSubNav
        current="commissions"
        title="Quản Lý Hoa Hồng Bán Hàng & Đại Lý (B.9.3)"
        subtitle="Chính sách hoa hồng, phê duyệt quyết toán & quản lý lịch sử chi trả giải ngân"
        onNavigate={onNavigate}
        onBack={onBack}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink flex items-center gap-2">
            <SparklesIcon className="w-7 h-7 text-accent" />
            <span>Quản Lý Hoa Hồng Sale & Kênh Phân Phối</span>
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Tuân thủ BLUEPRINT B.9.3: Quản lý vòng đời hoa hồng (Tính toán ➔ Duyệt ➔ Tạm ứng ➔ Quyết toán)
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-surface-alt p-1.5 rounded-xl border border-brand-border">
          <button
            onClick={() => setActiveTab('commissions')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors duration-150 cursor-pointer ${
              activeTab === 'commissions' ? 'bg-surface text-accent shadow-sm' : 'text-ink-soft hover:text-ink'
            }`}
          >
            Bảng Kê Hoa Hồng ({commissions.length})
          </button>
          <button
            onClick={() => setActiveTab('policies')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors duration-150 cursor-pointer ${
              activeTab === 'policies' ? 'bg-surface text-accent shadow-sm' : 'text-ink-soft hover:text-ink'
            }`}
          >
            Chính Sách Hoa Hồng ({policies.length})
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors duration-150 cursor-pointer ${
              activeTab === 'payouts' ? 'bg-surface text-accent shadow-sm' : 'text-ink-soft hover:text-ink'
            }`}
          >
            Lịch Sử Giải Ngân
          </button>
        </div>
      </div>

      {/* 4 Financial Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
            className="motion-safe:animate-fade-in-1 [animation-fill-mode:both]"

          label="Tổng hoa hồng phát sinh"
          value={`${Number(stats.totalCommission || 0).toLocaleString('vi-VN')} đ`}
          subValue="Theo toàn bộ HĐMB đã ký"
          subTone="neutral"
          icon={BanknotesIcon}
          iconBg="bg-accent-soft"
          iconColor="text-accent-ink"
        />
        <StatCard
            className="motion-safe:animate-fade-in-2 [animation-fill-mode:both]"

          label="Đã giải ngân chi trả"
          value={`${Number(stats.totalPaid || 0).toLocaleString('vi-VN')} đ`}
          subValue="Đã thanh toán thực tế"
          subTone="success"
          valueTone="success"
          icon={CheckCircleIcon}
          iconBg="bg-brand-success-soft"
          iconColor="text-brand-success"
        />
        <StatCard
            className="motion-safe:animate-fade-in-3 [animation-fill-mode:both]"

          label="Công nợ hoa hồng còn lại"
          value={`${Number(stats.totalPending || 0).toLocaleString('vi-VN')} đ`}
          subValue="Chờ các đợt giải ngân tiếp theo"
          subTone="neutral"
          valueTone="accent"
          icon={ClockIcon}
          iconBg="bg-brand-warning-soft"
          iconColor="text-brand-warning"
        />
        <StatCard
            className="motion-safe:animate-fade-in-4 [animation-fill-mode:both]"

          label="Hồ sơ chờ phê duyệt"
          value={`${stats.pendingApprovalCount || 0} HĐ`}
          subValue="Cần GĐKD duyệt chi"
          subTone="danger"
          valueTone="warning"
          icon={DocumentTextIcon}
          iconBg="bg-brand-warning-soft"
          iconColor="text-brand-warning"
        />
      </div>

      {/* ── TAB 1: COMMISSIONS TABLE ── */}
      {activeTab === 'commissions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-brand-border shadow-xs">
            <div className="flex items-center gap-3">
              <select
                value={beneficiaryFilter}
                onChange={(e) => setBeneficiaryFilter(e.target.value)}
                className="px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
              >
                <option value="ALL">-- Tất cả đối tượng --</option>
                <option value="INTERNAL_SALE">Sale nội bộ</option>
                <option value="AGENCY">Đại lý phân phối</option>
                <option value="FREELANCER">Môi giới tự do</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
              >
                <option value="ALL">-- Tất cả trạng thái --</option>
                <option value="PENDING_APPROVAL">Chờ Duyệt</option>
                <option value="APPROVED">Đã Duyệt (Chờ chi)</option>
                <option value="PARTIALLY_PAID">Đã Chi 1 Phần</option>
                <option value="COMPLETED">Đã Hoàn Tất Chi</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center text-ink-soft bg-surface rounded-xl border border-brand-border">
              <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto text-accent mb-2" />
              <p>Đang tải danh sách hoa hồng...</p>
            </div>
          ) : commissions.length === 0 ? (
            <EmptyState
              icon={SparklesIcon}
              tone="neutral"
              title="Chưa có bản ghi hoa hồng nào"
              description="Hoa hồng sẽ tự động phát sinh khi Hợp đồng Mua bán được kích hoạt."
              size="md"
            />
          ) : (
            <div className="bg-surface rounded-2xl border border-brand-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs divide-y divide-brand-border">
                  <thead className="bg-surface-alt text-ink font-bold text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Hợp Đồng & Căn Hộ</th>
                      <th className="py-3.5 px-4">Người Thụ Hưởng</th>
                      <th className="py-3.5 px-4 text-right">Giá Trị HĐ</th>
                      <th className="py-3.5 px-4 text-center">Tỷ Lệ</th>
                      <th className="py-3.5 px-4 text-right">Tổng Hoa Hồng</th>
                      <th className="py-3.5 px-4 text-right">Đã Chi</th>
                      <th className="py-3.5 px-4 text-right">Còn Lại</th>
                      <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                      <th className="py-3.5 px-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border font-mono tabular-nums">
                    {commissions.map((cms) => {
                      const isPending = cms.status === 'PENDING_APPROVAL';
                      const isApproved = cms.status === 'APPROVED';
                      const isPartial = cms.status === 'PARTIALLY_PAID';
                      const isCompleted = cms.status === 'COMPLETED';

                      return (
                        <tr key={cms.id} className="hover:bg-surface-alt/60 transition-colors">
                          <td className="py-3 px-4 font-sans">
                            <strong className="text-ink block font-mono">{cms.contracts?.contract_code}</strong>
                            <span className="text-[11px] text-ink-soft">
                              Căn: <strong>{cms.contracts?.apartments?.code}</strong> • Khách: {cms.contracts?.customers?.name}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-sans">
                            <strong className="text-ink block">{cms.beneficiary_name}</strong>
                            <span className="text-[11px] text-ink-soft">
                              {cms.beneficiary_type === 'INTERNAL_SALE' ? 'Sale nội bộ' : 'Đại lý phân phối'}
                              {cms.beneficiary_phone ? ` • ${cms.beneficiary_phone}` : ''}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right font-bold text-ink">
                            {Number(cms.total_contract_value).toLocaleString('vi-VN')} đ
                          </td>

                          <td className="py-3 px-4 text-center font-bold text-accent font-sans">
                            {cms.commission_rate}%
                          </td>

                          <td className="py-3 px-4 text-right font-bold text-accent">
                            {Number(cms.total_commission_amount).toLocaleString('vi-VN')} đ
                          </td>

                          <td className="py-3 px-4 text-right font-bold text-brand-success">
                            {Number(cms.paid_amount || 0).toLocaleString('vi-VN')} đ
                          </td>

                          <td className="py-3 px-4 text-right font-bold text-ink">
                            {Number(cms.remaining_amount || 0).toLocaleString('vi-VN')} đ
                          </td>

                          <td className="py-3 px-4 text-center font-sans">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                isCompleted
                                  ? 'bg-brand-success-soft text-brand-success'
                                  : isPartial
                                  ? 'bg-accent-soft text-accent-ink'
                                  : isApproved
                                  ? 'bg-brand-warning-soft text-brand-warning'
                                  : 'bg-surface-alt text-ink-soft'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                              {isCompleted ? 'Hoàn tất' : isPartial ? 'Đã chi 1 phần' : isApproved ? 'Đã duyệt' : 'Chờ duyệt'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right font-sans">
                            <div className="flex items-center justify-end gap-1.5">
                              {isPending && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveCommission(cms.id)}
                                  className="px-2.5 py-1 bg-brand-success hover:bg-brand-success/90 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1"
                                >
                                  <CheckBadgeIcon className="w-3.5 h-3.5" />
                                  Duyệt
                                </button>
                              )}

                              {(isApproved || isPartial) && Number(cms.remaining_amount) > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPayout(cms)}
                                  className="px-2.5 py-1 bg-accent hover:bg-accent-hover text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1"
                                >
                                  <BanknotesIcon className="w-3.5 h-3.5" />
                                  Chi Trả
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: POLICIES ── */}
      {activeTab === 'policies' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-surface p-4 rounded-xl border border-brand-border shadow-xs">
            <h2 className="font-bold text-ink text-sm">Chính Sách Hoa Hồng Định Mức</h2>
            <button
              onClick={() => setIsCreatePolicyModalOpen(true)}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold transition-all duration-200 shadow-sm cursor-pointer inline-flex items-center gap-1.5"
            >
              <PlusIcon className="w-4 h-4" />
              <span>+ Thêm Chính Sách Mới</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {policies.map((pol) => (
              <div key={pol.id} className="bg-surface rounded-2xl p-5 border border-brand-border shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-ink text-base">{pol.policy_name}</h4>
                    <span className="font-mono text-xs text-accent font-semibold">{pol.policy_code}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-brand-success-soft text-brand-success rounded-full text-[10px] font-bold">
                    HIỆU LỰC
                  </span>
                </div>

                <div className="p-3 bg-surface-alt rounded-xl text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-ink-soft">Đối tượng:</span>
                    <strong className="text-ink">
                      {pol.beneficiary_type === 'INTERNAL_SALE' ? 'Sale nội bộ' : 'Đại lý phân phối'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-soft">Tỷ lệ hoa hồng:</span>
                    <strong className="text-accent text-sm font-mono font-bold">{pol.commission_rate}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-soft">Mốc kích hoạt:</span>
                    <span className="font-semibold text-ink">
                      {pol.trigger_milestone === 'ON_CONTRACT_SIGNED'
                        ? 'Khi ký HĐMB'
                        : pol.trigger_milestone === 'ON_FIRST_INSTALLMENT'
                        ? 'Thu đủ Đợt 1'
                        : 'Khi bàn giao'}
                    </span>
                  </div>
                </div>

                {pol.description && <p className="text-xs text-ink-soft">{pol.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: PAYOUTS HISTORY ── */}
      {activeTab === 'payouts' && (
        <div className="space-y-4">
          <div className="bg-surface rounded-2xl border border-brand-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-brand-border bg-surface-alt">
              <h2 className="font-bold text-ink text-sm">Lịch Sử Chi Trả Giải Ngân Hoa Hồng</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-brand-border">
                <thead className="bg-surface-alt text-ink font-bold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Mã Phiếu Chi</th>
                    <th className="py-3 px-4">Hợp Đồng & Người Nhận</th>
                    <th className="py-3 px-4">Ngày Chi</th>
                    <th className="py-3 px-4 text-right">Số Tiền Giải Ngân</th>
                    <th className="py-3 px-4">Phương Thức</th>
                    <th className="py-3 px-4">Chứng Từ / Ghi Chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border font-mono tabular-nums">
                  {commissions.flatMap((c) =>
                    (c.commission_payouts || []).map((p: any) => (
                      <tr key={p.id} className="hover:bg-surface-alt/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-accent">{p.payout_code}</td>
                        <td className="py-3 px-4 font-sans">
                          <strong className="text-ink block">{c.beneficiary_name}</strong>
                          <span className="text-[11px] text-ink-soft font-mono">HĐ: {c.contracts?.contract_code}</span>
                        </td>
                        <td className="py-3 px-4 text-ink-soft">
                          {new Date(p.payout_date).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-brand-success text-sm">
                          {Number(p.amount).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3 px-4 font-sans">
                          {p.payment_method === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt'}
                        </td>
                        <td className="py-3 px-4 font-sans text-ink-soft">
                          {p.reference_doc || p.notes || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE POLICY ── */}
      {isCreatePolicyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h2 className="font-bold text-ink text-base">+ Thêm Chính Sách Hoa Hồng</h2>
              <button onClick={() => setIsCreatePolicyModalOpen(false)} className="p-1.5 text-ink-soft hover:text-ink rounded-lg transition-colors cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePolicy} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">
                  Tên chính sách <span className="text-brand-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createPolicyForm.policy_name}
                  onChange={(e) => setCreatePolicyForm({ ...createPolicyForm, policy_name: e.target.value })}
                  placeholder="VD: Chính sách hoa hồng Sale nội bộ 2026"
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Đối tượng</label>
                  <select
                    value={createPolicyForm.beneficiary_type}
                    onChange={(e) => setCreatePolicyForm({ ...createPolicyForm, beneficiary_type: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
                  >
                    <option value="INTERNAL_SALE">Sale nội bộ</option>
                    <option value="AGENCY">Đại lý phân phối</option>
                    <option value="FREELANCER">Môi giới tự do</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">
                    Tỷ lệ hoa hồng (%) <span className="text-brand-danger">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={createPolicyForm.commission_rate}
                    onChange={(e) => setCreatePolicyForm({ ...createPolicyForm, commission_rate: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink font-mono tabular-nums font-bold focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Mốc kích hoạt</label>
                <select
                  value={createPolicyForm.trigger_milestone}
                  onChange={(e) => setCreatePolicyForm({ ...createPolicyForm, trigger_milestone: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
                >
                  <option value="ON_CONTRACT_SIGNED">Kích hoạt khi Ký HĐMB</option>
                  <option value="ON_FIRST_INSTALLMENT">Kích hoạt khi Thu Đủ Đợt 1</option>
                  <option value="ON_HANDOVER">Kích hoạt khi Bàn Giao Căn Hộ</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Mô tả chính sách</label>
                <textarea
                  rows={2}
                  value={createPolicyForm.description}
                  onChange={(e) => setCreatePolicyForm({ ...createPolicyForm, description: e.target.value })}
                  placeholder="Ghi chú điều kiện bổ sung..."
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div className="pt-3 border-t border-brand-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatePolicyModalOpen(false)}
                  className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl font-bold hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-colors cursor-pointer shadow-sm"
                >
                  Lưu Chính Sách
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: PAYOUT FORM ── */}
      {selectedCmsForPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-accent-soft flex items-center justify-between">
              <h2 className="font-bold text-accent-ink text-base flex items-center gap-2">
                <BanknotesIcon className="w-5 h-5 text-accent" />
                <span>Lập Phiếu Chi Trả Hoa Hồng</span>
              </h2>
              <button onClick={() => setSelectedCmsForPayout(null)} className="p-1.5 text-ink-soft hover:text-ink rounded-lg transition-colors cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePayoutSubmit} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-surface-alt rounded-xl border border-brand-border space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-ink-soft">Người thụ hưởng:</span>
                  <strong className="text-ink">{selectedCmsForPayout.beneficiary_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-soft">Hợp đồng:</span>
                  <strong className="font-mono text-ink">{selectedCmsForPayout.contracts?.contract_code}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-soft">Tổng hoa hồng:</span>
                  <strong className="font-mono text-ink">{Number(selectedCmsForPayout.total_commission_amount).toLocaleString('vi-VN')} đ</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-soft">Đã thanh toán:</span>
                  <strong className="font-mono text-brand-success">{Number(selectedCmsForPayout.paid_amount || 0).toLocaleString('vi-VN')} đ</strong>
                </div>
                <div className="flex justify-between border-t border-brand-border pt-1.5 text-sm font-bold text-accent">
                  <span>Còn nợ hoa hồng:</span>
                  <span className="font-mono">{Number(selectedCmsForPayout.remaining_amount || 0).toLocaleString('vi-VN')} đ</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">
                  Số tiền giải ngân đợt này (VNĐ) <span className="text-brand-danger">*</span>
                </label>
                <input
                  type="number"
                  required
                  max={Number(selectedCmsForPayout.remaining_amount || 0)}
                  value={payoutForm.amount}
                  onChange={(e) => setPayoutForm({ ...payoutForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink font-mono tabular-nums text-right font-bold focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Ngày chi</label>
                  <input
                    type="date"
                    required
                    value={payoutForm.payout_date}
                    onChange={(e) => setPayoutForm({ ...payoutForm, payout_date: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Phương thức</label>
                  <select
                    value={payoutForm.payment_method}
                    onChange={(e) => setPayoutForm({ ...payoutForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
                  >
                    <option value="BANK_TRANSFER">Chuyển khoản ngân hàng</option>
                    <option value="CASH">Tiền mặt tại quỹ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Số chứng từ / UNC</label>
                <input
                  type="text"
                  value={payoutForm.reference_doc}
                  onChange={(e) => setPayoutForm({ ...payoutForm, reference_doc: e.target.value })}
                  placeholder="VD: UNC VCB 82910..."
                  className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div className="pt-3 border-t border-brand-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCmsForPayout(null)}
                  className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl font-bold hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-colors cursor-pointer shadow-sm"
                >
                  Xác Nhận Giải Ngân
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionPage;
