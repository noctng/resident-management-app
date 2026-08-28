import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast, useConfirm } from '../../components/ui';
import {
  WrenchScrewdriverIcon,
  PlusIcon,
  ArrowPathIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  BuildingOfficeIcon,
  UserIcon,
  SparklesIcon,
  ShieldCheckIcon,
} from '../../components/icons';
import ContractorManagementModal from '../../components/ContractorManagementModal';

interface WarrantyManagementPageProps {
  onNavigate?: (route: string) => void;
  onBack?: () => void;
}

export const WarrantyManagementPage: React.FC<WarrantyManagementPageProps> = () => {
  const toast = useToast();
  const { confirm } = useConfirm();

  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<any[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [apartments, setApartments] = useState<any[]>([]);

  const [stats, setStats] = useState<any>({
    totalClaims: 0,
    inProgressCount: 0,
    overdueSlaCount: 0,
    avgRating: '5.0',
  });

  // Filters
  const [phaseFilter, setPhaseFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [contractorFilter, setContractorFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isContractorModalOpen, setIsContractorModalOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);

  // Forms
  const [createForm, setCreateForm] = useState({
    apartment_id: '',
    category: 'KY_THUAT',
    location_detail: '',
    description: '',
    severity: 'NORMAL',
    contractor_id: '',
    notes: '',
  });

  const [assignForm, setAssignForm] = useState({
    contractor_id: '',
    scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    resolution_notes: '',
  });

  const [completeForm, setCompleteForm] = useState({
    customer_rating: 5,
    customer_signature: 'Xác nhận bằng chữ ký điện tử trên App Cư Dân',
    resolution_notes: '',
  });

  useEffect(() => {
    loadClaims();
    loadContractors();
    loadApartments();
  }, [phaseFilter, statusFilter, severityFilter, contractorFilter, searchQuery]);

  const loadClaims = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(phaseFilter !== 'ALL' ? { phase: phaseFilter } : {}),
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
        ...(severityFilter !== 'ALL' ? { severity: severityFilter } : {}),
        ...(contractorFilter !== 'ALL' ? { contractor_id: contractorFilter } : {}),
        ...(searchQuery ? { search: searchQuery } : {}),
      });
      const res: any = await api.get(`/operations/warranty?${params.toString()}`);
      if (res && res.success) {
        setClaims(res.claims || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error('Lỗi tải ticket bảo hành:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadContractors = async () => {
    try {
      const res: any = await api.get('/operations/warranty/contractors');
      if (res && res.success) {
        setContractors(res.contractors || []);
      }
    } catch (err) {
      console.error('Lỗi tải danh mục nhà thầu:', err);
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
      const res: any = await api.post('/operations/warranty', createForm);
      if (res && res.success) {
        toast.success(res.message || 'Tiếp nhận sự cố bảo hành thành công!');
        setIsCreateModalOpen(false);
        setCreateForm({
          apartment_id: '',
          category: 'KY_THUAT',
          location_detail: '',
          description: '',
          severity: 'NORMAL',
          contractor_id: '',
          notes: '',
        });
        loadClaims();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tạo ticket bảo hành');
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaim) return;
    try {
      const res: any = await api.patch(`/operations/warranty/${selectedClaim.id}/assign`, assignForm);
      if (res && res.success) {
        toast.success(res.message || 'Đã điều phối nhà thầu!');
        setIsAssignModalOpen(false);
        loadClaims();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi điều phối nhà thầu');
    }
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaim) return;
    try {
      const res: any = await api.patch(`/operations/warranty/${selectedClaim.id}/complete`, completeForm);
      if (res && res.success) {
        toast.success(res.message || 'Đã nghiệm thu đóng ticket bảo hành!');
        setIsCompleteModalOpen(false);
        loadClaims();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi nghiệm thu');
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return { label: 'Khẩn Cấp (SLA 4h)', bg: 'bg-brand-danger-soft text-brand-danger' };
      case 'HIGH':
        return { label: 'Cao (SLA 24h)', bg: 'bg-brand-warning-soft text-brand-warning' };
      default:
        return { label: 'Tiêu Chuẩn (SLA 48h)', bg: 'bg-surface-alt text-ink-soft' };
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'REPORTED':
        return { label: 'Mới Tiếp Nhận', bg: 'bg-accent-soft text-accent-ink' };
      case 'ASSIGNED':
        return { label: 'Đã Gán Nhà Thầu', bg: 'bg-brand-warning-soft text-brand-warning' };
      case 'IN_PROGRESS':
        return { label: 'Đang Thi Công Sửa', bg: 'bg-brand-warning-soft text-brand-warning' };
      case 'COMPLETED':
        return { label: 'Đã Nghiệm Thu Đóng', bg: 'bg-brand-success-soft text-brand-success' };
      default:
        return { label: st, bg: 'bg-surface-alt text-ink-soft' };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <WrenchScrewdriverIcon className="w-7 h-7 text-accent" />
            <span>Quản Lý Bảo Hành Căn Hộ Sau Bàn Giao (B.8.4 / C.8)</span>
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Tiếp nhận sự cố bảo hành, kiểm tra thời hạn (12–24 tháng), định tuyến nhà thầu và giám sát cam kết SLA
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsContractorModalOpen(true)}
            className="px-4 py-2 bg-brand-warning-soft text-brand-warning border border-brand-warning/30 hover:bg-brand-warning hover:text-white rounded-xl text-xs font-bold transition-all duration-200 shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <WrenchScrewdriverIcon className="w-4 h-4" />
            <span>+ Quản Lý Nhà Thầu</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold transition-all duration-200 shadow-sm cursor-pointer inline-flex items-center gap-1.5"
          >
            <PlusIcon className="w-4 h-4" />
            <span>+ Tiếp Nhận Sự Cố Mới</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-2xl p-5 border border-brand-border shadow-xs space-y-1">
          <span className="text-xs text-ink-soft font-semibold flex items-center gap-1.5">
            <WrenchScrewdriverIcon className="w-4 h-4 text-accent" />
            Tổng yêu cầu bảo hành
          </span>
          <div className="text-2xl font-bold font-mono text-ink tabular-nums">
            {stats.totalClaims || 0} tickets
          </div>
          <p className="text-[11px] text-ink-soft">Tất cả các mốc sau bàn giao</p>
        </div>

        <div className="bg-surface rounded-2xl p-5 border border-brand-border shadow-xs space-y-1">
          <span className="text-xs text-ink-soft font-semibold flex items-center gap-1.5">
            <ClockIcon className="w-4 h-4 text-brand-warning" />
            Đang xử lý trong hạn SLA
          </span>
          <div className="text-2xl font-bold font-mono text-brand-warning tabular-nums">
            {stats.inProgressCount || 0} tickets
          </div>
          <p className="text-[11px] text-brand-warning font-medium">Nhà thầu đang khắc phục</p>
        </div>

        <div className="bg-surface rounded-2xl p-5 border border-brand-border shadow-xs space-y-1">
          <span className="text-xs text-ink-soft font-semibold flex items-center gap-1.5">
            <ExclamationTriangleIcon className="w-4 h-4 text-brand-danger" />
            Cảnh báo quá hạn SLA
          </span>
          <div className="text-2xl font-bold font-mono text-brand-danger tabular-nums">
            {stats.overdueSlaCount || 0} tickets
          </div>
          <p className="text-[11px] text-brand-danger font-medium">Cần đôn đốc khẩn cấp</p>
        </div>

        <div className="bg-surface rounded-2xl p-5 border border-brand-border shadow-xs space-y-1">
          <span className="text-xs text-ink-soft font-semibold flex items-center gap-1.5">
            <SparklesIcon className="w-4 h-4 text-brand-success" />
            Đánh giá CSAT Cư Dân
          </span>
          <div className="text-2xl font-bold font-mono text-brand-success tabular-nums">
            {stats.avgRating} / 5.0 ⭐
          </div>
          <p className="text-[11px] text-brand-success font-medium">Mức độ hài lòng sau sửa chữa</p>
        </div>
      </div>

      {/* Filters Bar */}
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

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
          >
            <option value="ALL">-- Tất cả trạng thái --</option>
            <option value="REPORTED">Mới Tiếp Nhận</option>
            <option value="ASSIGNED">Đã Gán Nhà Thầu</option>
            <option value="IN_PROGRESS">Đang Sửa Chữa</option>
            <option value="COMPLETED">Đã Hoàn Thành</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
          >
            <option value="ALL">-- Mức độ ưu tiên --</option>
            <option value="CRITICAL">Khẩn Cấp (SLA 4h)</option>
            <option value="HIGH">Cao (SLA 24h)</option>
            <option value="NORMAL">Tiêu Chuẩn (SLA 48h)</option>
          </select>

          <select
            value={contractorFilter}
            onChange={(e) => setContractorFilter(e.target.value)}
            className="px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
          >
            <option value="ALL">-- Tất cả nhà thầu --</option>
            {contractors.map((ctr) => (
              <option key={ctr.id} value={ctr.id}>
                {ctr.name} ({ctr.rating}⭐)
              </option>
            ))}
          </select>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo Mã phiếu, Mã Căn, Mô tả sự cố..."
            className="px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-xs text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent min-w-[240px]"
          />
        </div>
      </div>

      {/* Claims Table */}
      {loading ? (
        <div className="p-16 text-center text-ink-soft bg-surface rounded-xl border border-brand-border">
          <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto text-accent mb-2" />
          <p>Đang tải danh sách yêu cầu bảo hành...</p>
        </div>
      ) : claims.length === 0 ? (
        <div className="p-16 text-center text-ink-soft bg-surface rounded-xl border border-dashed border-brand-border space-y-3">
          <WrenchScrewdriverIcon className="w-12 h-12 mx-auto text-ink-faint" />
          <p className="font-bold text-ink text-base">Chưa có yêu cầu bảo hành nào</p>
          <p className="text-xs text-ink-soft max-w-md mx-auto">
            Hệ thống tự động tiếp nhận khi cư dân gửi yêu cầu qua ứng dụng hoặc BQL lập phiếu tiếp nhận sự cố.
          </p>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-brand-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-brand-border">
              <thead className="bg-surface-alt text-ink font-bold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Mã Phiếu & Thời Gian</th>
                  <th className="py-3.5 px-4">Căn Hộ & Chủ Nhà</th>
                  <th className="py-3.5 px-4">Hạng Mục & Vị Trí</th>
                  <th className="py-3.5 px-4">Mô Tả Sự Cố</th>
                  <th className="py-3.5 px-4">Mức Độ & SLA</th>
                  <th className="py-3.5 px-4">Nhà Thầu Phụ Trách</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border font-mono tabular-nums">
                {claims.map((claim) => {
                  const sevBadge = getSeverityBadge(claim.severity);
                  const stBadge = getStatusBadge(claim.status);
                  const isOverdue =
                    !['COMPLETED', 'CANCELLED'].includes(claim.status) &&
                    claim.sla_deadline &&
                    new Date(claim.sla_deadline) < new Date();

                  return (
                    <tr key={claim.id} className="hover:bg-surface-alt/60 transition-colors">
                      <td className="py-3 px-4 font-sans">
                        <strong className="text-accent block font-mono font-bold">{claim.claim_code}</strong>
                        <span className="text-[11px] text-ink-soft">
                          {new Date(claim.created_at).toLocaleString('vi-VN')}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-sans">
                        <strong className="text-ink font-mono">{claim.apartments?.code}</strong>
                        <span className="text-[11px] text-ink-soft block">
                          {claim.contracts?.customers?.name || 'Cư dân'}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-sans">
                        <span className="font-semibold text-ink block">{claim.category}</span>
                        <span className="text-[11px] text-ink-soft">{claim.location_detail}</span>
                      </td>

                      <td className="py-3 px-4 font-sans max-w-xs truncate" title={claim.description}>
                        <p className="truncate text-ink">{claim.description}</p>
                        {claim.is_under_warranty ? (
                          <span className="text-[10px] text-brand-success font-semibold flex items-center gap-1">
                            <ShieldCheckIcon className="w-3.5 h-3.5" /> Còn hạn bảo hành
                          </span>
                        ) : (
                          <span className="text-[10px] text-brand-warning font-semibold">Hết hạn bảo hành</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-sans">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sevBadge.bg}`}>
                          {sevBadge.label}
                        </span>
                        {isOverdue && (
                          <span className="text-[10px] text-brand-danger font-bold block mt-0.5">
                            ⚠️ Quá hạn SLA
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-sans">
                        {claim.contractors ? (
                          <div>
                            <strong className="text-ink block">{claim.contractors.name}</strong>
                            <span className="text-[11px] text-brand-warning font-mono">
                              ⭐ {claim.contractors.rating || '5.0'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-ink-faint italic">Chưa phân công</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-sans">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${stBadge.bg}`}>
                          {stBadge.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          {claim.status === 'REPORTED' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedClaim(claim);
                                setIsAssignModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-accent hover:bg-accent-hover text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Gán Nhà Thầu
                            </button>
                          )}

                          {['ASSIGNED', 'IN_PROGRESS'].includes(claim.status) && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedClaim(claim);
                                setIsCompleteModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-brand-success hover:bg-brand-success/90 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Nghiệm Thu
                            </button>
                          )}

                          {claim.status === 'COMPLETED' && (
                            <span className="text-[11px] text-brand-success font-bold font-mono">
                              Đã đóng ({claim.customer_rating}⭐)
                            </span>
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

      {/* ── MODAL: CREATE WARRANTY CLAIM ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-2xl border border-brand-border w-full max-w-lg overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h3 className="font-bold text-ink text-base flex items-center gap-2">
                <WrenchScrewdriverIcon className="w-5 h-5 text-accent" />
                <span>Tiếp Nhận Sự Cố Bảo Hành Sau Bàn Giao (B.8.4)</span>
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1.5 text-ink-soft hover:text-ink rounded-lg transition-colors cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">
                  Chọn Căn Hộ <span className="text-brand-danger">*</span>
                </label>
                <select
                  required
                  value={createForm.apartment_id}
                  onChange={(e) => setCreateForm({ ...createForm, apartment_id: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
                >
                  <option value="">-- Chọn căn hộ phát sinh sự cố --</option>
                  {apartments.map((apt) => (
                    <option key={apt.id} value={apt.id}>
                      {apt.code} ({apt.phase_code || 'Phân kỳ'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Hạng mục sự cố</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
                  >
                    <option value="DIEN_NUOC">Hệ thống Điện & Nước (24 tháng)</option>
                    <option value="KET_CAU_THAM">Kết cấu & Thấm dột (60 tháng)</option>
                    <option value="CUA_KHOA">Cửa, Khóa & Nhôm kính (24 tháng)</option>
                    <option value="NOI_THAT">Nội thất & Tủ bếp (12 tháng)</option>
                    <option value="SON_BA">Sơn tường & Hoàn thiện (12 tháng)</option>
                    <option value="THIET_BI">Thiết bị gia dụng / Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Mức độ ưu tiên (SLA)</label>
                  <select
                    value={createForm.severity}
                    onChange={(e) => setCreateForm({ ...createForm, severity: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
                  >
                    <option value="CRITICAL">Khẩn Cấp (SLA 4 giờ)</option>
                    <option value="HIGH">Cao (SLA 24 giờ)</option>
                    <option value="NORMAL">Tiêu Chuẩn (SLA 48 giờ)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Vị trí trong nhà</label>
                <input
                  type="text"
                  value={createForm.location_detail}
                  onChange={(e) => setCreateForm({ ...createForm, location_detail: e.target.value })}
                  placeholder="VD: Phòng ngủ Master, Ban công phòng khách..."
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">
                  Mô tả chi tiết sự cố <span className="text-brand-danger">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Mô tả hiện tượng, dấu hiệu hư hỏng hoặc yêu cầu của cư dân..."
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
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
                  Tạo Ticket Bảo Hành
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ASSIGN CONTRACTOR ── */}
      {isAssignModalOpen && selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-2xl border border-brand-border w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h3 className="font-bold text-ink text-base flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-accent" />
                <span>Điều Phối Nhà Thầu: {selectedClaim.claim_code}</span>
              </h3>
              <button onClick={() => setIsAssignModalOpen(false)} className="p-1.5 text-ink-soft hover:text-ink rounded-lg transition-colors cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">
                  Chọn Nhà Thầu Thi Công / Bảo Hành <span className="text-brand-danger">*</span>
                </label>
                <select
                  required
                  value={assignForm.contractor_id}
                  onChange={(e) => setAssignForm({ ...assignForm, contractor_id: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
                >
                  <option value="">-- Chọn nhà thầu --</option>
                  {contractors.map((ctr) => (
                    <option key={ctr.id} value={ctr.id}>
                      {ctr.name} — {ctr.trade_type} ({ctr.rating}⭐)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Lịch hẹn sửa chữa với cư dân</label>
                <input
                  type="datetime-local"
                  value={assignForm.scheduled_at}
                  onChange={(e) => setAssignForm({ ...assignForm, scheduled_at: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Ghi chú điều phối</label>
                <textarea
                  rows={2}
                  value={assignForm.resolution_notes}
                  onChange={(e) => setAssignForm({ ...assignForm, resolution_notes: e.target.value })}
                  placeholder="Yêu cầu mang theo linh kiện thay thế hoặc đồ bảo hộ..."
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div className="pt-3 border-t border-brand-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl font-bold hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-colors cursor-pointer shadow-sm"
                >
                  Xác Nhận Điều Phối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: COMPLETE CLAIM ── */}
      {isCompleteModalOpen && selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-2xl border border-brand-border w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h3 className="font-bold text-ink text-base flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-brand-success" />
                <span>Nghiệm Thu Đóng Phiếu: {selectedClaim.claim_code}</span>
              </h3>
              <button onClick={() => setIsCompleteModalOpen(false)} className="p-1.5 text-ink-soft hover:text-ink rounded-lg transition-colors cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">
                  Đánh giá chất lượng xử lý của Nhà Thầu (1 - 5 Sao)
                </label>
                <select
                  value={completeForm.customer_rating}
                  onChange={(e) => setCompleteForm({ ...completeForm, customer_rating: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ (5 Sao - Xuất sắc, đúng hạn)</option>
                  <option value={4}>⭐⭐⭐⭐ (4 Sao - Tốt, đạt yêu cầu)</option>
                  <option value={3}>⭐⭐⭐ (3 Sao - Trung bình)</option>
                  <option value={2}>⭐⭐ (2 Sao - Kém, trễ hẹn)</option>
                  <option value={1}>⭐ (1 Sao - Rất kém, phải làm lại)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Kết quả khắc phục & Nghiệm thu</label>
                <textarea
                  rows={3}
                  value={completeForm.resolution_notes}
                  onChange={(e) => setCompleteForm({ ...completeForm, resolution_notes: e.target.value })}
                  placeholder="Đã thay van nước mới, kiểm tra rò rỉ đạt chuẩn..."
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div className="pt-3 border-t border-brand-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCompleteModalOpen(false)}
                  className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl font-bold hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-success hover:bg-brand-success/90 text-white rounded-xl font-bold transition-colors cursor-pointer shadow-sm"
                >
                  Nghiệm Thu Hoàn Thành
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
          loadContractors();
          loadClaims();
        }}
      />
    </div>
  );
};

export default WarrantyManagementPage;
