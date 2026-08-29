import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast, useConfirm } from '../../components/ui';
import {
  BuildingOfficeIcon,
  PlusIcon,
  ArrowPathIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BanknotesIcon,
  UsersIcon,
  DocumentTextIcon,
  ClockIcon,
  WrenchScrewdriverIcon,
} from '../../components/icons';
import { StatCard } from '../../components/ui/Card';
import ContractorManagementModal from '../../components/ContractorManagementModal';

interface ConstructionFitoutPageProps {
  onNavigate?: (route: string) => void;
  onBack?: () => void;
}

export const ConstructionFitoutPage: React.FC<ConstructionFitoutPageProps> = () => {
  const toast = useToast();
  const { confirm } = useConfirm();

  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [apartments, setApartments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'registrations' | 'workers' | 'violations'>('registrations');

  const [stats, setStats] = useState<any>({
    totalRegs: 0,
    activeConstructing: 0,
    totalDepositHeld: 0,
    totalWorkers: 0,
    totalViolationsFine: 0,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isViolationModalOpen, setIsViolationModalOpen] = useState(false);
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [isContractorModalOpen, setIsContractorModalOpen] = useState(false);
  const [selectedReg, setSelectedReg] = useState<any>(null);

  // Forms
  const [createForm, setCreateForm] = useState({
    apartment_id: '',
    contractor_name: '',
    contact_person: '',
    phone: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    scope_description: '',
    notes: '',
  });

  const [depositForm, setDepositForm] = useState({
    deposit_payment_ref: '',
    notes: '',
  });

  const [violationForm, setViolationForm] = useState({
    violation_type: 'SAI_HANG_MUC',
    fine_amount: 2000000,
    description: '',
  });

  const [workerForm, setWorkerForm] = useState({
    full_name: '',
    id_number: '',
    phone: '',
    role: 'THO_CHINH',
  });

  const [settleForm, setSettleForm] = useState({
    inspection_notes: 'Nghiệm thu hoàn công đạt chuẩn, các căn lân cận không khiếu nại',
  });

  useEffect(() => {
    loadRegistrations();
    loadApartments();
  }, [statusFilter, searchQuery]);

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
        ...(searchQuery ? { search: searchQuery } : {}),
      });
      const res: any = await api.get(`/operations/construction?${params.toString()}`);
      if (res && res.success) {
        setRegistrations(res.registrations || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error('Lỗi tải hồ sơ thi công:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadApartments = async () => {
    try {
      const res: any = await api.get('/apartments');
      if (res && (res.apartments || Array.isArray(res))) {
        setApartments(res.apartments || res);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách căn hộ:', err);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.post('/operations/construction', createForm);
      if (res && res.success) {
        toast.success(res.message || 'Tạo hồ sơ đăng ký thi công thành công!');
        setIsCreateModalOpen(false);
        setCreateForm({
          apartment_id: '',
          contractor_name: '',
          contact_person: '',
          phone: '',
          start_date: new Date().toISOString().slice(0, 10),
          end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          scope_description: '',
          notes: '',
        });
        loadRegistrations();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi lập hồ sơ thi công');
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReg) return;
    try {
      const res: any = await api.post(`/operations/construction/${selectedReg.id}/deposit-confirm`, depositForm);
      if (res && res.success) {
        toast.success(res.message || 'Đã xác nhận thu tiền ký quỹ!');
        setIsDepositModalOpen(false);
        loadRegistrations();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xác nhận ký quỹ');
    }
  };

  const handleViolationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReg) return;
    try {
      const res: any = await api.post(`/operations/construction/${selectedReg.id}/violations`, violationForm);
      if (res && res.success) {
        toast.success(res.message || 'Đã lập biên bản vi phạm!');
        setIsViolationModalOpen(false);
        loadRegistrations();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi lập biên bản vi phạm');
    }
  };

  const handleWorkerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReg) return;
    try {
      const res: any = await api.post(`/operations/construction/${selectedReg.id}/workers`, workerForm);
      if (res && res.success) {
        toast.success(res.message || 'Cấp thẻ tạm thành công!');
        setIsWorkerModalOpen(false);
        setWorkerForm({ full_name: '', id_number: '', phone: '', role: 'THO_CHINH' });
        loadRegistrations();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cấp thẻ công nhân');
    }
  };

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReg) return;
    try {
      const res: any = await api.post(`/operations/construction/${selectedReg.id}/settlement`, settleForm);
      if (res && res.success) {
        toast.success(res.message || 'Đã quyết toán hoàn ký quỹ!');
        setIsSettleModalOpen(false);
        loadRegistrations();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi quyết toán');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <BuildingOfficeIcon className="w-7 h-7 text-accent" />
            <span>Quản Lý Thi Công, Cải Tạo & Ký Quỹ (C.9 / E.5.6)</span>
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Quản lý hồ sơ hoàn thiện nội thất, ký quỹ 100.000.000đ, cấp thẻ tạm công nhân và xử lý vi phạm nội quy
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsContractorModalOpen(true)}
            className="px-4 py-2 bg-brand-warning-soft text-brand-warning border border-brand-warning/30 hover:bg-brand-warning hover:text-white rounded-xl text-xs font-bold transition-all duration-200 shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <WrenchScrewdriverIcon className="w-4 h-4" />
            <span>+ Danh Bạ Nhà Thầu</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold transition-all duration-200 shadow-sm cursor-pointer inline-flex items-center gap-1.5"
          >
            <PlusIcon className="w-4 h-4" />
            <span>+ Đăng Ký Thi Công Mới</span>
          </button>
        </div>
      </div>

      {/* 4 Financial & Operational Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Hồ sơ đang thi công"
          value={`${stats.activeConstructing || 0} căn`}
          subValue="Giới hạn ≤ 3 căn/block"
          subTone="neutral"
          icon={BuildingOfficeIcon}
          iconBg="bg-accent-soft"
          iconColor="text-accent-ink"
        />
        <StatCard
          label="Tiền ký quỹ 100Tr đang giữ"
          value={`${Number(stats.totalDepositHeld || 0).toLocaleString('vi-VN')} đ`}
          subValue="Ký quỹ bảo lãnh mặt bằng"
          subTone="success"
          valueTone="success"
          icon={BanknotesIcon}
          iconBg="bg-brand-success-soft"
          iconColor="text-brand-success"
        />
        <StatCard
          label="Thẻ công nhân hoạt động"
          value={`${stats.totalWorkers || 0} thẻ thợ`}
          subValue="Được phép ra vào theo giờ"
          subTone="neutral"
          valueTone="accent"
          icon={UsersIcon}
          iconBg="bg-accent-soft"
          iconColor="text-accent-ink"
        />
        <StatCard
          label="Tiền phạt vi phạm trừ ký quỹ"
          value={`${Number(stats.totalViolationsFine || 0).toLocaleString('vi-VN')} đ`}
          subValue="Theo biểu phí E.5.6"
          subTone="danger"
          valueTone="danger"
          icon={ExclamationTriangleIcon}
          iconBg="bg-brand-danger-soft"
          iconColor="text-brand-danger"
        />
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-4 border-b border-brand-border text-xs font-bold">
        <button
          onClick={() => setActiveTab('registrations')}
          className={`pb-3 transition cursor-pointer border-b-2 flex items-center gap-1.5 ${
            activeTab === 'registrations' ? 'border-accent text-accent' : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <BuildingOfficeIcon className="w-4 h-4" />
          <span>Hồ Sơ Thi Công & Ký Quỹ ({registrations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('workers')}
          className={`pb-3 transition cursor-pointer border-b-2 flex items-center gap-1.5 ${
            activeTab === 'workers' ? 'border-accent text-accent' : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <UsersIcon className="w-4 h-4" />
          <span>Quản Lý Thẻ Tạm Công Nhân ({stats.totalWorkers})</span>
        </button>

        <button
          onClick={() => setActiveTab('violations')}
          className={`pb-3 transition cursor-pointer border-b-2 flex items-center gap-1.5 ${
            activeTab === 'violations' ? 'border-accent text-accent' : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <ExclamationTriangleIcon className="w-4 h-4" />
          <span>Biên Bản Vi Phạm & Phạt Thi Công</span>
        </button>
      </div>

      {/* TAB 1: REGISTRATIONS */}
      {activeTab === 'registrations' && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-16 text-center text-ink-soft bg-surface rounded-xl border border-brand-border">
              <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto text-accent mb-2" />
              <p>Đang tải danh sách hồ sơ thi công...</p>
            </div>
          ) : registrations.length === 0 ? (
            <div className="p-16 text-center text-ink-soft bg-surface rounded-xl border border-dashed border-brand-border space-y-3">
              <BuildingOfficeIcon className="w-12 h-12 mx-auto text-ink-faint" />
              <p className="font-bold text-ink text-base">Chưa có hồ sơ đăng ký thi công nào</p>
              <p className="text-xs text-ink-soft max-w-md mx-auto">
                Bấm "+ Đăng Ký Thi Công Mới" để lập hồ sơ hoàn thiện nội thất và theo dõi tiền ký quỹ 100.000.000đ.
              </p>
            </div>
          ) : (
            <div className="bg-surface rounded-2xl border border-brand-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs divide-y divide-brand-border">
                  <thead className="bg-surface-alt text-ink font-bold text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Mã Hồ Sơ & Căn Hộ</th>
                      <th className="py-3.5 px-4">Nhà Thầu & Liên Hệ</th>
                      <th className="py-3.5 px-4">Thời Gian Thi Công</th>
                      <th className="py-3.5 px-4 text-right">Ký Quỹ (100Tr)</th>
                      <th className="py-3.5 px-4">Thợ / Vi Phạm</th>
                      <th className="py-3.5 px-4">Trạng Thái</th>
                      <th className="py-3.5 px-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border font-mono tabular-nums">
                    {registrations.map((reg) => {
                      const totalFines = reg.construction_violations?.reduce(
                        (sum: number, v: any) => sum + Number(v.fine_amount || 0),
                        0
                      ) || 0;

                      return (
                        <tr key={reg.id} className="hover:bg-surface-alt/60 transition-colors">
                          <td className="py-3 px-4 font-sans">
                            <strong className="text-accent block font-mono font-bold">{reg.reg_code}</strong>
                            <span className="font-mono font-semibold text-ink">Căn {reg.apartments?.code}</span>
                          </td>

                          <td className="py-3 px-4 font-sans">
                            <strong className="text-ink block">{reg.contractor_name}</strong>
                            <span className="text-[11px] text-ink-soft">{reg.contact_person} ({reg.phone})</span>
                          </td>

                          <td className="py-3 px-4 font-sans text-[11px]">
                            <div>Từ: {new Date(reg.start_date).toLocaleDateString('vi-VN')}</div>
                            <div>Đến: {new Date(reg.end_date).toLocaleDateString('vi-VN')}</div>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <span className="font-bold text-brand-success block">
                              {Number(reg.deposit_amount || 100000000).toLocaleString('vi-VN')} đ
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                              reg.deposit_status === 'DEPOSITED' ? 'bg-brand-success-soft text-brand-success' : 'bg-brand-warning-soft text-brand-warning'
                            }`}>
                              {reg.deposit_status === 'DEPOSITED' ? 'Đã Nộp Ký Quỹ' : 'Chờ Nộp 100Tr'}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-sans text-[11px]">
                            <div>👷 {reg.construction_workers?.length || 0} công nhân</div>
                            {totalFines > 0 && (
                              <div className="text-brand-danger font-semibold">
                                ⚠️ Phạt: {totalFines.toLocaleString('vi-VN')} đ
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 font-sans">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              reg.status === 'CONSTRUCTING'
                                ? 'bg-brand-warning-soft text-brand-warning'
                                : reg.status === 'SETTLED'
                                ? 'bg-brand-success-soft text-brand-success'
                                : 'bg-surface-alt text-ink-soft'
                            }`}>
                              {reg.status === 'CONSTRUCTING'
                                ? 'Đang Thi Công'
                                : reg.status === 'SETTLED'
                                ? 'Đã Quyết Toán'
                                : 'Chờ Phê Duyệt'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right font-sans">
                            <div className="flex items-center justify-end gap-1.5">
                              {reg.deposit_status === 'PENDING_DEPOSIT' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedReg(reg);
                                    setIsDepositModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 bg-brand-success hover:bg-brand-success/90 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                                >
                                  Thu 100Tr
                                </button>
                              )}

                              {reg.status === 'CONSTRUCTING' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedReg(reg);
                                      setIsWorkerModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 bg-surface border border-brand-border text-ink hover:bg-surface-alt rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                                  >
                                    + Thẻ Thợ
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedReg(reg);
                                      setIsViolationModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 bg-brand-danger-soft text-brand-danger hover:bg-brand-danger-soft/80 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                                  >
                                    Phạt VP
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedReg(reg);
                                      setIsSettleModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 bg-accent hover:bg-accent-hover text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                                  >
                                    Nghiệm Thu
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
            </div>
          )}
        </div>
      )}

      {/* TAB 2: WORKERS LIST */}
      {activeTab === 'workers' && (
        <div className="bg-surface rounded-2xl border border-brand-border p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-ink text-sm flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-accent" />
            <span>Danh Sách Thẻ Tạm Thi Công Cấp Cho Công Nhân</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {registrations.flatMap((r) => r.construction_workers?.map((w: any) => ({ ...w, reg: r })) || []).map((worker: any) => (
              <div key={worker.id} className="p-4 bg-surface-alt rounded-xl border border-brand-border space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <strong className="text-ink text-sm block">{worker.full_name}</strong>
                  <span className="px-1.5 py-0.2 rounded bg-brand-success-soft text-brand-success text-[10px] font-bold">
                    {worker.status}
                  </span>
                </div>
                <p className="font-mono text-accent font-bold">{worker.pass_code}</p>
                <div className="text-ink-soft text-[11px] space-y-0.5">
                  <div>Căn: <strong>{worker.reg?.apartments?.code}</strong></div>
                  <div>Nhà thầu: {worker.reg?.contractor_name}</div>
                  <div>CCCD: {worker.id_number || 'N/A'} • SĐT: {worker.phone || 'N/A'}</div>
                  <div>Hạn thẻ: {new Date(worker.valid_to).toLocaleDateString('vi-VN')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: VIOLATIONS LIST */}
      {activeTab === 'violations' && (
        <div className="bg-surface rounded-2xl border border-brand-border p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-ink text-sm flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-brand-danger" />
            <span>Biên Bản Vi Phạm Thi Công & Khấu Trừ Ký Quỹ (Phụ Lục E.5.6)</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-brand-border">
              <thead className="bg-surface-alt text-ink font-bold text-[11px] uppercase">
                <tr>
                  <th className="py-3 px-4">Mã Biên Bản</th>
                  <th className="py-3 px-4">Căn Hộ & Nhà Thầu</th>
                  <th className="py-3 px-4">Hành Vi Vi Phạm</th>
                  <th className="py-3 px-4 text-right">Số Tiền Phạt</th>
                  <th className="py-3 px-4">Người Lập</th>
                  <th className="py-3 px-4">Khấu Trừ Ký Quỹ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border font-mono">
                {registrations.flatMap((r) => r.construction_violations?.map((v: any) => ({ ...v, reg: r })) || []).map((viol: any) => (
                  <tr key={viol.id} className="hover:bg-surface-alt/60">
                    <td className="py-3 px-4 text-accent font-bold">{viol.violation_code}</td>
                    <td className="py-3 px-4 font-sans">
                      <strong className="text-ink block">Căn {viol.reg?.apartments?.code}</strong>
                      <span className="text-ink-soft text-[11px]">{viol.reg?.contractor_name}</span>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span className="font-bold text-brand-danger block">{viol.violation_type}</span>
                      <span className="text-ink-soft text-[11px]">{viol.description}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-brand-danger">
                      {Number(viol.fine_amount || 0).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-3 px-4 font-sans text-ink-soft">{viol.recorded_by}</td>
                    <td className="py-3 px-4 font-sans text-brand-success font-semibold">
                      ✓ Đã tự động trừ ký quỹ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE REGISTRATION ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-2xl border border-brand-border w-full max-w-lg overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h3 className="font-bold text-ink text-base flex items-center gap-2">
                <BuildingOfficeIcon className="w-5 h-5 text-accent" />
                <span>Đăng Ký Thi Công Hoàn Thiện & Ký Quỹ 100Tr (C.9)</span>
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1.5 text-ink-soft hover:text-ink rounded-lg transition-colors cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">
                  Chọn Căn Hộ Thi Công <span className="text-brand-danger">*</span>
                </label>
                <select
                  required
                  value={createForm.apartment_id}
                  onChange={(e) => setCreateForm({ ...createForm, apartment_id: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
                >
                  <option value="">-- Chọn căn hộ --</option>
                  {apartments.map((apt) => (
                    <option key={apt.id} value={apt.id}>
                      {apt.code} ({apt.phase_code || 'Phân kỳ'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">
                    Tên Đơn Vị Thi Công <span className="text-brand-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.contractor_name}
                    onChange={(e) => setCreateForm({ ...createForm, contractor_name: e.target.value })}
                    placeholder="VD: Công ty Nội Thất An Cường"
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Người Liên Hệ / SĐT</label>
                  <input
                    type="text"
                    value={createForm.contact_person}
                    onChange={(e) => setCreateForm({ ...createForm, contact_person: e.target.value })}
                    placeholder="VD: Anh Nam (0912345678)"
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Ngày Bắt Đầu</label>
                  <input
                    type="date"
                    required
                    value={createForm.start_date}
                    onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Ngày Hoàn Thành Dự Kiến</label>
                  <input
                    type="date"
                    required
                    value={createForm.end_date}
                    onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </div>
              </div>

              <div className="p-3 bg-brand-success-soft rounded-xl border border-brand-success/30 text-brand-success space-y-1">
                <strong>Số tiền ký quỹ quy định: 100.000.000 VNĐ / căn</strong>
                <p className="text-[11px] text-ink-soft">
                  Tiền ký quỹ dùng để bảo đảm nguyên trạng hạ tầng khu đô thị và sẽ được hoàn trả 100% sau nghiệm thu hoàn công (trừ tiền phạt vi phạm nếu có).
                </p>
              </div>

              <div className="pt-3 border-t border-brand-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl font-bold hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-colors cursor-pointer shadow-sm"
                >
                  Lập Hồ Sơ Thi Công
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRM 100M DEPOSIT ── */}
      {isDepositModalOpen && selectedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-2xl border border-brand-border w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h3 className="font-bold text-ink text-base flex items-center gap-2">
                <BanknotesIcon className="w-5 h-5 text-brand-success" />
                <span>Xác Nhận Nộp Tiền Ký Quỹ: {selectedReg.reg_code}</span>
              </h3>
              <button onClick={() => setIsDepositModalOpen(false)} className="p-1.5 text-ink-soft hover:text-ink rounded-lg transition-colors cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-surface-alt rounded-xl border border-brand-border space-y-1">
                <div>Căn hộ: <strong className="text-ink">{selectedReg.apartments?.code}</strong></div>
                <div>Số tiền ký quỹ: <strong className="text-brand-success font-mono text-base">100.000.000 VNĐ</strong></div>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Mã tham chiếu / Số Ủy nhiệm chi (UNC)</label>
                <input
                  type="text"
                  required
                  value={depositForm.deposit_payment_ref}
                  onChange={(e) => setDepositForm({ ...depositForm, deposit_payment_ref: e.target.value })}
                  placeholder="VD: UNC-VCB-8910293"
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink font-mono focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div className="pt-3 border-t border-brand-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl font-bold hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-success hover:bg-brand-success/90 text-white rounded-xl font-bold transition-colors cursor-pointer shadow-sm"
                >
                  Xác Nhận Đã Thu 100Tr
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE VIOLATION ── */}
      {isViolationModalOpen && selectedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-2xl border border-brand-border w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h3 className="font-bold text-ink text-base flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-brand-danger" />
                <span>Lập Biên Bản Vi Phạm: {selectedReg.reg_code}</span>
              </h3>
              <button onClick={() => setIsViolationModalOpen(false)} className="p-1.5 text-ink-soft hover:text-ink rounded-lg transition-colors cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleViolationSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">Hành vi vi phạm theo Quy chế E.5.6</label>
                <select
                  value={violationForm.violation_type}
                  onChange={(e) => {
                    const type = e.target.value;
                    let fine = 1000000;
                    if (type === 'SAI_HANG_MUC') fine = 2000000;
                    else if (type === 'THIEU_PCCC') fine = 2000000;
                    else if (type === 'CAU_MAC_DIEN') fine = 5000000;
                    else if (type === 'KHONG_BAO_HO') fine = 200000;
                    else if (type === 'KHONG_GIAM_SAT') fine = 500000;
                    setViolationForm({ ...violationForm, violation_type: type, fine_amount: fine });
                  }}
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
                >
                  <option value="SAI_HANG_MUC">Thi công sai hạng mục đăng ký (2.000.000 đ)</option>
                  <option value="THIEU_PCCC">Thiếu 2 bình chữa cháy bột/CO2 (2.000.000 đ)</option>
                  <option value="CAU_MAC_DIEN">Tự ý câu mắc điện nước chung (5.000.000 đ)</option>
                  <option value="KHONG_BAO_HO">Công nhân không mặc bảo hộ (200.000 đ)</option>
                  <option value="KHONG_GIAM_SAT">Không có cán bộ giám sát (500.000 đ)</option>
                  <option value="HAN_KHONG_PHEP">Hàn điện/hàn gió không phép (1.000.000 đ)</option>
                  <option value="TIENG_ON_NGOAI_GIO">Gây ồn ngoài khung giờ quy định (1.000.000 đ)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Mô tả hành vi & Bằng chứng</label>
                <textarea
                  rows={2}
                  required
                  value={violationForm.description}
                  onChange={(e) => setViolationForm({ ...violationForm, description: e.target.value })}
                  placeholder="Ghi nhận cụ thể thời gian, vị trí vi phạm..."
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div className="pt-3 border-t border-brand-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsViolationModalOpen(false)}
                  className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl font-bold hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-danger hover:bg-brand-danger/90 text-white rounded-xl font-bold transition-colors cursor-pointer shadow-sm"
                >
                  Lập Biên Bản & Trừ Ký Quỹ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD WORKER ── */}
      {isWorkerModalOpen && selectedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-2xl border border-brand-border w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h3 className="font-bold text-ink text-base flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-accent" />
                <span>Cấp Thẻ Tạm Cho Công Nhân: {selectedReg.reg_code}</span>
              </h3>
              <button onClick={() => setIsWorkerModalOpen(false)} className="p-1.5 text-ink-soft hover:text-ink rounded-lg transition-colors cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWorkerSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">
                  Họ và tên công nhân <span className="text-brand-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={workerForm.full_name}
                  onChange={(e) => setWorkerForm({ ...workerForm, full_name: e.target.value })}
                  placeholder="VD: Trần Văn Bình"
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Số CCCD</label>
                  <input
                    type="text"
                    value={workerForm.id_number}
                    onChange={(e) => setWorkerForm({ ...workerForm, id_number: e.target.value })}
                    placeholder="0400..."
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink font-mono focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Vai trò</label>
                  <select
                    value={workerForm.role}
                    onChange={(e) => setWorkerForm({ ...workerForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
                  >
                    <option value="CHI_HUY">Chỉ huy trưởng / Giám sát</option>
                    <option value="THO_CHINH">Thợ chính</option>
                    <option value="THO_DIEN">Thợ điện</option>
                    <option value="THO_NUOC">Thợ nước</option>
                    <option value="THO_NE">Thợ nề / ốp lát</option>
                    <option value="THO_MOC">Thợ mộc / nội thất</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-brand-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsWorkerModalOpen(false)}
                  className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl font-bold hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-colors cursor-pointer shadow-sm"
                >
                  Cấp Thẻ Tạm Ra Vào
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: SETTLEMENT & REFUND ── */}
      {isSettleModalOpen && selectedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-2xl border border-brand-border w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h3 className="font-bold text-ink text-base flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-brand-success" />
                <span>Nghiệm Thu Hoàn Công & Hoàn Ký Quỹ</span>
              </h3>
              <button onClick={() => setIsSettleModalOpen(false)} className="p-1.5 text-ink-soft hover:text-ink rounded-lg transition-colors cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSettleSubmit} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-surface-alt rounded-xl border border-brand-border space-y-1">
                <div>Căn hộ: <strong className="text-ink">{selectedReg.apartments?.code}</strong></div>
                <div>Tiền ký quỹ ban đầu: <strong className="font-mono">100.000.000 đ</strong></div>
                <div>
                  Tổng tiền phạt vi phạm:{' '}
                  <strong className="font-mono text-brand-danger">
                    {(
                      selectedReg.construction_violations?.reduce(
                        (sum: number, v: any) => sum + Number(v.fine_amount || 0),
                        0
                      ) || 0
                    ).toLocaleString('vi-VN')}{' '}
                    đ
                  </strong>
                </div>
                <div className="pt-1 border-t border-brand-border font-bold text-brand-success text-sm flex justify-between">
                  <span>Số tiền hoàn trả:</span>
                  <span className="font-mono">
                    {(
                      100000000 -
                      (selectedReg.construction_violations?.reduce(
                        (sum: number, v: any) => sum + Number(v.fine_amount || 0),
                        0
                      ) || 0)
                    ).toLocaleString('vi-VN')}{' '}
                    đ
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Ý kiến nghiệm thu của BQL</label>
                <textarea
                  rows={2}
                  value={settleForm.inspection_notes}
                  onChange={(e) => setSettleForm({ ...settleForm, inspection_notes: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div className="pt-3 border-t border-brand-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSettleModalOpen(false)}
                  className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl font-bold hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-colors cursor-pointer shadow-sm"
                >
                  Quyết Toán Hoàn Ký Quỹ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contractor Management Modal */}
      <ContractorManagementModal
        isOpen={isContractorModalOpen}
        onClose={() => setIsContractorModalOpen(false)}
        onContractorUpdated={() => {
          loadRegistrations();
        }}
      />
    </div>
  );
};

export default ConstructionFitoutPage;
