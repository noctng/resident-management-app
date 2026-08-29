import React, { useState, useEffect } from 'react';
import { CrmSubNav } from '../../components/crm/CrmSubNav';
import { api } from '../../services/api';
import { useToast, useConfirm } from '../../components/ui';
import {
  TagIcon,
  SparklesIcon,
  ArrowPathIcon,
  PlusIcon,
  CheckCircleIcon,
  XMarkIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  ClockIcon,
  CalculatorIcon,
  CheckBadgeIcon,
  TrashIcon,
} from '../../components/icons';

interface PricingPolicyPageProps {
  onNavigate?: (route: string) => void;
  onBack?: () => void;
}

export const PricingPolicyPage: React.FC<PricingPolicyPageProps> = ({ onNavigate, onBack }) => {
  const toast = useToast();
  const { confirm } = useConfirm();

  const [activeTab, setActiveTab] = useState<'pricebooks' | 'promotions'>('pricebooks');
  const [loading, setLoading] = useState(true);

  // Pricebook state
  const [pricebooks, setPricebooks] = useState<any[]>([]);
  const [pbPhaseFilter, setPbPhaseFilter] = useState<string>('ALL');
  const [pbStatusFilter, setPbStatusFilter] = useState<string>('ALL');
  const [isCreatePbModalOpen, setIsCreatePbModalOpen] = useState(false);
  const [selectedPbDetail, setSelectedPbDetail] = useState<any>(null);
  const [isPbDetailModalOpen, setIsPbDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [createPbForm, setCreatePbForm] = useState({
    name: '',
    phase_code: 'CANTATA',
    effective_from: new Date().toISOString().slice(0, 10),
    effective_to: '',
    description: '',
    populate_current_units: true,
  });

  // Promotion state
  const [promotions, setPromotions] = useState<any[]>([]);
  const [promoTypeFilter, setPromoTypeFilter] = useState<string>('ALL');
  const [isCreatePromoModalOpen, setIsCreatePromoModalOpen] = useState(false);
  const [createPromoForm, setCreatePromoForm] = useState({
    name: '',
    promo_type: 'DIRECT_DISCOUNT',
    discount_type: 'PERCENTAGE',
    discount_value: 2,
    gift_description: '',
    applies_to_phase: 'ALL',
    min_units_required: 1,
    max_discount_cap_percent: 10,
    requires_approval_above_percent: 2,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    terms_conditions: '',
  });

  // Calculator state
  const [calcBasePrice, setCalcBasePrice] = useState<number>(5000000000);
  const [calcSelectedPromos, setCalcSelectedPromos] = useState<string[]>([]);
  const [calcResult, setCalcResult] = useState<any>(null);
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);

  useEffect(() => {
    if (activeTab === 'pricebooks') {
      loadPricebooks();
    } else {
      loadPromotions();
    }
  }, [activeTab, pbPhaseFilter, pbStatusFilter, promoTypeFilter]);

  const loadPricebooks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(pbPhaseFilter !== 'ALL' ? { phase: pbPhaseFilter } : {}),
        ...(pbStatusFilter !== 'ALL' ? { status: pbStatusFilter } : {}),
      });
      const res: any = await api.get(`/crm/pricebooks?${params.toString()}`);
      if (res && res.success) {
        setPricebooks(res.pricebooks || []);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách bảng giá:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPromotions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(promoTypeFilter !== 'ALL' ? { type: promoTypeFilter } : {}),
      });
      const res: any = await api.get(`/crm/promotions?${params.toString()}`);
      if (res && res.success) {
        setPromotions(res.promotions || []);
      }
    } catch (err) {
      console.error('Lỗi tải ưu đãi:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePricebook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.post('/crm/pricebooks', createPbForm);
      if (res && res.success) {
        toast.success(res.message || 'Tạo bảng giá thành công');
        setIsCreatePbModalOpen(false);
        setCreatePbForm({
          name: '',
          phase_code: 'CANTATA',
          effective_from: new Date().toISOString().slice(0, 10),
          effective_to: '',
          description: '',
          populate_current_units: true,
        });
        loadPricebooks();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tạo bảng giá');
    }
  };

  const handleViewPricebookDetail = async (pbId: string) => {
    try {
      setLoadingDetail(true);
      setIsPbDetailModalOpen(true);
      const res: any = await api.get(`/crm/pricebooks/${pbId}`);
      if (res && res.success) {
        setSelectedPbDetail(res.pricebook);
      }
    } catch (err) {
      console.error('Lỗi tải chi tiết bảng giá:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleApprovePricebook = async (pbId: string, activateNow = true) => {
    const ok = await confirm({
      title: activateNow ? 'Phê duyệt & Kích hoạt Bảng giá' : 'Phê duyệt Bảng giá',
      description: activateNow
        ? 'Phê duyệt và áp dụng Bảng giá này làm biểu giá chính thức hiện hành? Các bảng giá cũ cùng phân kỳ sẽ được chuyển sang Lưu trữ.'
        : 'Phê duyệt bảng giá này?',
      confirmLabel: 'Phê duyệt & Áp dụng',
      variant: 'primary',
    });
    if (!ok) return;

    try {
      const res: any = await api.post(`/crm/pricebooks/${pbId}/approve`, { activate_now: activateNow });
      if (res && res.success) {
        toast.success(res.message || 'Đã phê duyệt bảng giá');
        loadPricebooks();
        if (selectedPbDetail && selectedPbDetail.id === pbId) {
          handleViewPricebookDetail(pbId);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi phê duyệt bảng giá');
    }
  };

  const handleDeletePricebook = async (pbId: string) => {
    const ok = await confirm({
      title: 'Xóa bảng giá nháp',
      description: 'Bạn có chắc chắn muốn xóa bản nháp bảng giá này không?',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const res: any = await api.delete(`/crm/pricebooks/${pbId}`);
      if (res && res.success) {
        toast.success(res.message || 'Đã xóa bảng giá');
        loadPricebooks();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xóa bảng giá');
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.post('/crm/promotions', createPromoForm);
      if (res && res.success) {
        toast.success(res.message || 'Tạo chương trình ưu đãi thành công');
        setIsCreatePromoModalOpen(false);
        setCreatePromoForm({
          name: '',
          promo_type: 'DIRECT_DISCOUNT',
          discount_type: 'PERCENTAGE',
          discount_value: 2,
          gift_description: '',
          applies_to_phase: 'ALL',
          min_units_required: 1,
          max_discount_cap_percent: 10,
          requires_approval_above_percent: 2,
          start_date: new Date().toISOString().slice(0, 10),
          end_date: '',
          terms_conditions: '',
        });
        loadPromotions();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tạo chương trình ưu đãi');
    }
  };

  const handleTogglePromoStatus = async (promoId: string) => {
    try {
      const res: any = await api.post(`/crm/promotions/${promoId}/toggle-status`);
      if (res && res.success) {
        toast.success(res.message || 'Đã cập nhật trạng thái');
        loadPromotions();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật trạng thái');
    }
  };

  const handleRunCalculator = async () => {
    try {
      const res: any = await api.post('/crm/promotions/calculate-discount', {
        base_price: calcBasePrice,
        promotion_ids: calcSelectedPromos,
      });
      if (res && res.success) {
        setCalcResult(res);
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tính chiết khấu');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      <CrmSubNav
        current="pricing-policy"
        title="Bảng Giá Phiên Bản & Ưu Đãi (B.9)"
        subtitle="Quản lý Sổ giá phiên bản (Pricebook), Chính sách ưu đãi & Luồng phê duyệt chiết khấu"
        onNavigate={onNavigate}
        onBack={onBack}
      />

      {/* Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <TagIcon className="w-7 h-7 text-accent" />
            <span>Bảng Giá Phiên Bản & Chiến Dịch Ưu Đãi</span>
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Tuân thủ BLUEPRINT B.9.1 & B.9.2: Quản lý giá 2 thành phần, lưu vết snapshot giá HĐ và trần hạn mức chiết khấu
          </p>
        </div>

        {/* Tab Switcher & Calculator Trigger */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsCalcModalOpen(true);
              setCalcSelectedPromos(promotions.filter((p) => p.status === 'ACTIVE').map((p) => p.id));
            }}
            className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-alt border border-brand-border text-ink text-xs font-bold transition-colors duration-150 cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
          >
            <CalculatorIcon className="w-4 h-4 text-accent" />
            <span>Tính Thử Chiết Khấu</span>
          </button>

          <div className="flex items-center bg-surface-alt p-1.5 rounded-xl border border-brand-border">
            <button
              onClick={() => setActiveTab('pricebooks')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors duration-150 cursor-pointer ${
                activeTab === 'pricebooks' ? 'bg-surface text-accent shadow-sm' : 'text-ink-soft hover:text-ink'
              }`}
            >
              Sổ Giá Phiên Bản ({pricebooks.length})
            </button>
            <button
              onClick={() => setActiveTab('promotions')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors duration-150 cursor-pointer ${
                activeTab === 'promotions' ? 'bg-surface text-accent shadow-sm' : 'text-ink-soft hover:text-ink'
              }`}
            >
              Chiến Dịch Ưu Đãi ({promotions.length})
            </button>
          </div>
        </div>
      </div>

      {/* ── TAB 1: PRICEBOOKS ── */}
      {activeTab === 'pricebooks' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-brand-border shadow-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={pbPhaseFilter}
                onChange={(e) => setPbPhaseFilter(e.target.value)}
                className="px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
              >
                <option value="ALL">-- Tất cả phân kỳ --</option>
                <option value="CANTATA">Phân kỳ Cantata</option>
                <option value="TESLA">Phân kỳ Tesla</option>
                <option value="DA_VINCI">Phân kỳ Da Vinci</option>
              </select>

              <select
                value={pbStatusFilter}
                onChange={(e) => setPbStatusFilter(e.target.value)}
                className="px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
              >
                <option value="ALL">-- Tất cả trạng thái --</option>
                <option value="ACTIVE">Đang Kích Hoạt (ACTIVE)</option>
                <option value="DRAFT">Bản Nháp (DRAFT)</option>
                <option value="APPROVED">Đã Duyệt (APPROVED)</option>
                <option value="ARCHIVED">Lưu Trữ (ARCHIVED)</option>
              </select>
            </div>

            <button
              onClick={() => setIsCreatePbModalOpen(true)}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold transition-all duration-200 shadow-sm cursor-pointer inline-flex items-center gap-1.5"
            >
              <PlusIcon className="w-4 h-4" />
              <span>+ Tạo Phiên Bản Bảng Giá Mới</span>
            </button>
          </div>

          {/* Pricebooks Cards Grid */}
          {loading ? (
            <div className="p-16 text-center text-ink-soft bg-surface rounded-xl border border-brand-border">
              <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto text-accent mb-2" />
              <p className="text-sm font-medium">Đang tải danh sách bảng giá phiên bản...</p>
            </div>
          ) : pricebooks.length === 0 ? (
            <div className="p-16 text-center text-ink-soft bg-surface rounded-xl border border-dashed border-brand-border space-y-3">
              <BuildingOfficeIcon className="w-12 h-12 mx-auto text-ink-faint" />
              <p className="font-bold text-ink text-base">Chưa có phiên bản bảng giá nào</p>
              <p className="text-xs text-ink-soft max-w-md mx-auto">
                Bấm "+ Tạo Phiên Bản Bảng Giá Mới" để thiết lập bảng giá theo đợt mở bán, hỗ trợ tính toán giá 2 thành phần và phê duyệt chính thức.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pricebooks.map((pb) => {
                const isActive = pb.status === 'ACTIVE';
                const isDraft = pb.status === 'DRAFT';
                const isApproved = pb.status === 'APPROVED';

                return (
                  <div
                    key={pb.id}
                    className={`bg-surface rounded-2xl p-5 border shadow-sm space-y-4 transition-all duration-200 hover:shadow-md ${
                      isActive ? 'border-brand-success/40 ring-2 ring-brand-success/10' : 'border-brand-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-ink text-base">{pb.name}</h3>
                        </div>
                        <span className="font-mono text-xs text-ink-soft font-semibold">{pb.code}</span>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                          isActive
                            ? 'bg-brand-success-soft text-brand-success'
                            : isApproved
                            ? 'bg-accent-soft text-accent-ink'
                            : isDraft
                            ? 'bg-brand-warning-soft text-brand-warning'
                            : 'bg-surface-alt text-ink-soft'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {isActive ? 'ĐANG ÁP DỤNG' : isApproved ? 'ĐÃ DUYỆT' : isDraft ? 'BẢN NHÁP' : 'LƯU TRỮ'}
                      </span>
                    </div>

                    <div className="p-3 bg-surface-alt rounded-xl text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-ink-soft">Phân kỳ áp dụng:</span>
                        <strong className="text-ink font-semibold">{pb.phase_code || 'Tất cả'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-soft">Phiên bản:</span>
                        <strong className="font-mono text-ink">v{pb.version}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-soft">Số lượng sản phẩm:</span>
                        <strong className="font-mono text-ink">{pb._count?.pricebook_items || 0} căn</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-soft">Hiệu lực từ:</span>
                        <span className="font-mono text-ink">{new Date(pb.effective_from).toLocaleDateString('vi-VN')}</span>
                      </div>
                      {pb.approved_by && (
                        <div className="flex justify-between text-[11px] text-ink-soft pt-1 border-t border-brand-border">
                          <span>Duyệt bởi:</span>
                          <strong>{pb.approved_by}</strong>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-brand-border flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleViewPricebookDetail(pb.id)}
                        className="px-3 py-1.5 bg-surface border border-brand-border hover:bg-surface-alt text-ink rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <DocumentTextIcon className="w-3.5 h-3.5 text-accent" />
                        <span>Xem Chi Tiết Căn</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {(isDraft || isApproved) && (
                          <button
                            type="button"
                            onClick={() => handleApprovePricebook(pb.id, true)}
                            className="px-3 py-1.5 bg-brand-success hover:bg-brand-success/90 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs"
                            title="Phê duyệt và áp dụng làm biểu giá chính thức"
                          >
                            <CheckBadgeIcon className="w-3.5 h-3.5" />
                            <span>Kích Hoạt</span>
                          </button>
                        )}

                        {isDraft && (
                          <button
                            type="button"
                            onClick={() => handleDeletePricebook(pb.id)}
                            className="p-1.5 text-ink-soft hover:text-brand-danger hover:bg-brand-danger-soft rounded-lg transition-colors cursor-pointer"
                            title="Xóa bản nháp"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: PROMOTIONS ── */}
      {activeTab === 'promotions' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-brand-border shadow-xs">
            <div className="flex items-center gap-3">
              <select
                value={promoTypeFilter}
                onChange={(e) => setPromoTypeFilter(e.target.value)}
                className="px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
              >
                <option value="ALL">-- Tất cả loại ưu đãi --</option>
                <option value="DIRECT_DISCOUNT">Chiết khấu trực tiếp (%)</option>
                <option value="EARLY_PAYMENT">Thanh toán sớm</option>
                <option value="GIFT_PACKAGE">Gói quà tặng / Nội thất</option>
                <option value="AGENCY_CHANNEL">Ưu đãi kênh / Đại lý</option>
                <option value="COMBO">Ưu đãi mua nhiều căn</option>
              </select>
            </div>

            <button
              onClick={() => setIsCreatePromoModalOpen(true)}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold transition-all duration-200 shadow-sm cursor-pointer inline-flex items-center gap-1.5"
            >
              <PlusIcon className="w-4 h-4" />
              <span>+ Tạo Chương Trình Ưu Đãi Mới</span>
            </button>
          </div>

          {/* Promotions Grid */}
          {loading ? (
            <div className="p-16 text-center text-ink-soft bg-surface rounded-xl border border-brand-border">
              <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto text-accent mb-2" />
              <p className="text-sm font-medium">Đang tải danh sách chương trình ưu đãi...</p>
            </div>
          ) : promotions.length === 0 ? (
            <div className="p-16 text-center text-ink-soft bg-surface rounded-xl border border-dashed border-brand-border space-y-3">
              <SparklesIcon className="w-12 h-12 mx-auto text-ink-faint" />
              <p className="font-bold text-ink text-base">Chưa có chương trình ưu đãi nào</p>
              <p className="text-xs text-ink-soft max-w-md mx-auto">
                Tạo các chương trình chiết khấu trực tiếp, quà tặng nội thất hoặc ưu đãi thanh toán sớm theo quy định BLUEPRINT B.9.2.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {promotions.map((p) => {
                const isActive = p.status === 'ACTIVE';

                return (
                  <div
                    key={p.id}
                    className={`bg-surface rounded-2xl p-5 border shadow-sm space-y-3 transition-all duration-200 hover:shadow-md ${
                      isActive ? 'border-accent/40 ring-2 ring-accent/10' : 'border-brand-border opacity-75'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-ink text-base">{p.name}</h3>
                        <span className="font-mono text-xs text-accent font-semibold">{p.code}</span>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive ? 'bg-brand-success-soft text-brand-success' : 'bg-surface-alt text-ink-soft'
                        }`}
                      >
                        {isActive ? 'ĐANG HIỆU LỰC' : 'TẠM NGƯNG'}
                      </span>
                    </div>

                    <div className="p-3 bg-surface-alt rounded-xl text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-ink-soft">Loại ưu đãi:</span>
                        <strong className="text-ink font-semibold">
                          {p.promo_type === 'DIRECT_DISCOUNT'
                            ? 'Chiết khấu trực tiếp'
                            : p.promo_type === 'EARLY_PAYMENT'
                            ? 'Thanh toán sớm'
                            : p.promo_type === 'GIFT_PACKAGE'
                            ? 'Gói quà tặng'
                            : p.promo_type === 'AGENCY_CHANNEL'
                            ? 'Ưu đãi kênh'
                            : 'Ưu đãi combo'}
                        </strong>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-ink-soft">Mức ưu đãi:</span>
                        <strong className="text-accent font-bold text-sm">
                          {p.discount_type === 'PERCENTAGE'
                            ? `${p.discount_value}%`
                            : `${Number(p.discount_value).toLocaleString('vi-VN')} VNĐ`}
                        </strong>
                      </div>

                      {p.gift_description && (
                        <div className="text-[11px] text-ink-soft pt-1 border-t border-brand-border">
                          <span className="font-semibold text-ink">Quà tặng:</span> {p.gift_description}
                        </div>
                      )}

                      <div className="flex justify-between text-[11px] text-ink-soft pt-1 border-t border-brand-border">
                        <span>Trần tối đa / Hạn mức:</span>
                        <span className="font-mono">{p.max_discount_cap_percent}% (Duyệt nếu &gt;{p.requires_approval_above_percent}%)</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-brand-border flex items-center justify-between text-xs">
                      <span className="text-ink-soft text-[11px]">
                        Từ: {new Date(p.start_date).toLocaleDateString('vi-VN')}
                        {p.end_date ? ` - ${new Date(p.end_date).toLocaleDateString('vi-VN')}` : ' (Vô thời hạn)'}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleTogglePromoStatus(p.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-brand-warning-soft hover:bg-brand-warning/30 text-brand-warning'
                            : 'bg-brand-success hover:bg-brand-success/90 text-white'
                        }`}
                      >
                        {isActive ? 'Tạm Ngưng' : 'Kích Hoạt'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: CREATE PRICEBOOK ── */}
      {isCreatePbModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h3 className="font-bold text-ink text-base">+ Tạo Phiên Bản Bảng Giá Mới</h3>
              <button onClick={() => setIsCreatePbModalOpen(false)} className="p-1.5 text-ink-soft hover:text-ink rounded-lg transition-colors cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePricebook} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">
                  Tên bảng giá <span className="text-brand-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createPbForm.name}
                  onChange={(e) => setCreatePbForm({ ...createPbForm, name: e.target.value })}
                  placeholder="VD: Bảng giá Mở bán Đợt 1 Phân kỳ Cantata"
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Phân kỳ áp dụng</label>
                  <select
                    value={createPbForm.phase_code}
                    onChange={(e) => setCreatePbForm({ ...createPbForm, phase_code: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
                  >
                    <option value="ALL">Toàn KĐT (Tất cả)</option>
                    <option value="CANTATA">Cantata</option>
                    <option value="TESLA">Tesla</option>
                    <option value="DA_VINCI">Da Vinci</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Ngày hiệu lực <span className="text-brand-danger">*</span></label>
                  <input
                    type="date"
                    required
                    value={createPbForm.effective_from}
                    onChange={(e) => setCreatePbForm({ ...createPbForm, effective_from: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Mô tả / Căn cứ phê duyệt</label>
                <textarea
                  rows={2}
                  value={createPbForm.description}
                  onChange={(e) => setCreatePbForm({ ...createPbForm, description: e.target.value })}
                  placeholder="Theo quyết định phê duyệt giá bán số 28/2026/QĐ-BĐS..."
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div className="p-3 bg-accent-soft text-accent-ink rounded-xl border border-accent/30 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="popUnits"
                  checked={createPbForm.populate_current_units}
                  onChange={(e) => setCreatePbForm({ ...createPbForm, populate_current_units: e.target.checked })}
                  className="rounded text-accent focus:ring-accent cursor-pointer"
                />
                <label htmlFor="popUnits" className="text-xs font-semibold cursor-pointer">
                  Tự động nạp toàn bộ danh mục căn hộ hiện tại vào bảng giá
                </label>
              </div>

              <div className="pt-3 border-t border-brand-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatePbModalOpen(false)}
                  className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl font-bold hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-colors cursor-pointer shadow-sm"
                >
                  Tạo Bảng Giá
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE PROMOTION ── */}
      {isCreatePromoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-lg overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h3 className="font-bold text-ink text-base">+ Tạo Chương Trình Ưu Đãi Mới</h3>
              <button onClick={() => setIsCreatePromoModalOpen(false)} className="p-1.5 text-ink-soft hover:text-ink rounded-lg transition-colors cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">
                  Tên chương trình ưu đãi <span className="text-brand-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createPromoForm.name}
                  onChange={(e) => setCreatePromoForm({ ...createPromoForm, name: e.target.value })}
                  placeholder="VD: Tri Ân Cư Dân Tiên Phong - Chiết Khấu 2%"
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Loại ưu đãi</label>
                  <select
                    value={createPromoForm.promo_type}
                    onChange={(e) => setCreatePromoForm({ ...createPromoForm, promo_type: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
                  >
                    <option value="DIRECT_DISCOUNT">Chiết khấu trực tiếp</option>
                    <option value="EARLY_PAYMENT">Thanh toán sớm</option>
                    <option value="GIFT_PACKAGE">Gói quà tặng nội thất</option>
                    <option value="AGENCY_CHANNEL">Ưu đãi kênh / Đại lý</option>
                    <option value="COMBO">Mua nhiều căn (Combo)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Hình thức giảm</label>
                  <select
                    value={createPromoForm.discount_type}
                    onChange={(e) => setCreatePromoForm({ ...createPromoForm, discount_type: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
                  >
                    <option value="PERCENTAGE">Theo tỷ lệ % trên giá HĐ</option>
                    <option value="FIXED_AMOUNT">Số tiền cố định (VNĐ)</option>
                    <option value="GIFT">Hiện vật / Quà tặng</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">
                    Giá trị ({createPromoForm.discount_type === 'PERCENTAGE' ? '%' : 'VNĐ'})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={createPromoForm.discount_value}
                    onChange={(e) => setCreatePromoForm({ ...createPromoForm, discount_value: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Áp dụng phân kỳ</label>
                  <select
                    value={createPromoForm.applies_to_phase}
                    onChange={(e) => setCreatePromoForm({ ...createPromoForm, applies_to_phase: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
                  >
                    <option value="ALL">Tất cả phân kỳ</option>
                    <option value="CANTATA">Cantata</option>
                    <option value="TESLA">Tesla</option>
                    <option value="DA_VINCI">Da Vinci</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Mô tả quà tặng (nếu có)</label>
                <input
                  type="text"
                  value={createPromoForm.gift_description}
                  onChange={(e) => setCreatePromoForm({ ...createPromoForm, gift_description: e.target.value })}
                  placeholder="VD: Tặng gói hoàn thiện nội thất 150 triệu VNĐ"
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Ngày bắt đầu <span className="text-brand-danger">*</span></label>
                  <input
                    type="date"
                    required
                    value={createPromoForm.start_date}
                    onChange={(e) => setCreatePromoForm({ ...createPromoForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={createPromoForm.end_date}
                    onChange={(e) => setCreatePromoForm({ ...createPromoForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-brand-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatePromoModalOpen(false)}
                  className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl font-bold hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-colors cursor-pointer shadow-sm"
                >
                  Tạo Chương Trình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: VIEW PRICEBOOK DETAIL ── */}
      {isPbDetailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <div>
                <h3 className="font-bold text-ink text-base flex items-center gap-2">
                  <span>Chi Tiết Bảng Giá: {selectedPbDetail?.name || 'Đang tải...'}</span>
                  <span className="font-mono text-xs text-accent">({selectedPbDetail?.code})</span>
                </h3>
                <p className="text-xs text-ink-soft mt-0.5">
                  Phân kỳ: {selectedPbDetail?.phase_code} • Phiên bản v{selectedPbDetail?.version} • Hiệu lực từ: {selectedPbDetail?.effective_from ? new Date(selectedPbDetail.effective_from).toLocaleDateString('vi-VN') : ''}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {selectedPbDetail?.status === 'DRAFT' && (
                  <button
                    type="button"
                    onClick={() => handleApprovePricebook(selectedPbDetail.id, true)}
                    className="px-3.5 py-1.5 bg-brand-success hover:bg-brand-success/90 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs"
                  >
                    <CheckBadgeIcon className="w-4 h-4" />
                    <span>Kích Hoạt (ACTIVE)</span>
                  </button>
                )}

                <button onClick={() => setIsPbDetailModalOpen(false)} className="p-1.5 text-ink-soft hover:text-ink rounded-lg transition-colors cursor-pointer">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 text-xs">
              {loadingDetail ? (
                <div className="p-16 text-center text-ink-soft">
                  <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto text-accent mb-2" />
                  <p>Đang tải chi tiết đơn giá từng căn...</p>
                </div>
              ) : (!selectedPbDetail?.pricebook_items || selectedPbDetail.pricebook_items.length === 0) ? (
                <div className="p-12 text-center text-ink-soft">Bảng giá này chưa có dữ liệu căn hộ nào.</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-brand-border">
                  <table className="w-full text-left divide-y divide-brand-border">
                    <thead className="bg-surface-alt text-ink font-bold text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-3">Mã Căn</th>
                        <th className="py-3 px-3 text-right">DT Đất (m²)</th>
                        <th className="py-3 px-3 text-right">Giá Đất (chưa VAT)</th>
                        <th className="py-3 px-3 text-right">Giá Xây Dựng (chưa VAT)</th>
                        <th className="py-3 px-3 text-center">VAT</th>
                        <th className="py-3 px-3 text-right">Tổng Giá Sau VAT</th>
                        <th className="py-3 px-3 text-right">Phí Bảo Trì (2%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border font-mono tabular-nums">
                      {selectedPbDetail.pricebook_items.map((it: any) => (
                        <tr key={it.id} className="hover:bg-surface-alt/60 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-ink">{it.apartments?.code}</td>
                          <td className="py-2.5 px-3 text-right">{it.apartments?.land_area || it.apartments?.area}</td>
                          <td className="py-2.5 px-3 text-right">{Number(it.land_price_before_vat).toLocaleString('vi-VN')} đ</td>
                          <td className="py-2.5 px-3 text-right">{Number(it.construction_price_before_vat).toLocaleString('vi-VN')} đ</td>
                          <td className="py-2.5 px-3 text-center font-sans font-semibold">{it.vat_rate}%</td>
                          <td className="py-2.5 px-3 text-right font-bold text-accent">
                            {Number(it.total_price_after_vat).toLocaleString('vi-VN')} đ
                          </td>
                          <td className="py-2.5 px-3 text-right text-brand-success">
                            {Number(it.maintenance_fee_2percent || 0).toLocaleString('vi-VN')} đ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-brand-border bg-surface-alt flex justify-end">
              <button
                type="button"
                onClick={() => setIsPbDetailModalOpen(false)}
                className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl font-bold hover:bg-surface-alt transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DISCOUNT CALCULATOR ── */}
      {isCalcModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-lg overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h3 className="font-bold text-ink text-base flex items-center gap-2">
                <CalculatorIcon className="w-5 h-5 text-accent" />
                <span>Công Cụ Tính Thử Chiết Khấu (Discount Engine)</span>
              </h3>
              <button onClick={() => setIsCalcModalOpen(false)} className="p-1.5 text-ink-soft hover:text-ink rounded-lg transition-colors cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">Giá trị căn hộ gốc (VNĐ)</label>
                <input
                  type="number"
                  value={calcBasePrice}
                  onChange={(e) => setCalcBasePrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink font-mono tabular-nums font-bold focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-right"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-2">Chọn các chương trình ưu đãi áp dụng cùng lúc:</label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {promotions.filter((p) => p.status === 'ACTIVE').map((p) => {
                    const isChecked = calcSelectedPromos.includes(p.id);

                    return (
                      <label
                        key={p.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                          isChecked ? 'bg-accent-soft border-accent/40 text-accent-ink' : 'bg-surface-alt border-brand-border text-ink'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCalcSelectedPromos([...calcSelectedPromos, p.id]);
                              } else {
                                setCalcSelectedPromos(calcSelectedPromos.filter((id) => id !== p.id));
                              }
                            }}
                            className="rounded text-accent focus:ring-accent"
                          />
                          <span className="font-semibold">{p.name}</span>
                        </div>
                        <span className="font-mono font-bold">
                          {p.discount_type === 'PERCENTAGE' ? `-${p.discount_value}%` : `-${Number(p.discount_value).toLocaleString('vi-VN')} đ`}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunCalculator}
                className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold shadow-sm transition-colors cursor-pointer"
              >
                Tính Toán Mức Giảm Thực Tế
              </button>

              {/* Result View */}
              {calcResult && (
                <div className="p-4 bg-surface-alt rounded-2xl border border-brand-border space-y-2 animate-fade-in">
                  <div className="flex justify-between">
                    <span className="text-ink-soft">Tổng giảm giá:</span>
                    <strong className="font-mono text-brand-danger text-sm">
                      -{Number(calcResult.total_discount_amount).toLocaleString('vi-VN')} VNĐ ({calcResult.discount_percent.toFixed(2)}%)
                    </strong>
                  </div>
                  <div className="flex justify-between border-t border-brand-border pt-1.5">
                    <span className="text-ink font-bold">Giá sau chiết khấu:</span>
                    <strong className="font-mono text-accent text-base">
                      {Number(calcResult.final_price).toLocaleString('vi-VN')} VNĐ
                    </strong>
                  </div>

                  {calcResult.requires_approval && (
                    <div className="p-2 bg-brand-warning-soft text-brand-warning rounded-lg text-[11px] font-semibold border border-brand-warning/30">
                      ⚠️ Mức chiết khấu {calcResult.discount_percent.toFixed(2)}% &gt; 2% bắt buộc trình Giám đốc Kinh doanh phê duyệt!
                    </div>
                  )}

                  {calcResult.exceeds_cap && (
                    <div className="p-2 bg-brand-danger-soft text-brand-danger rounded-lg text-[11px] font-semibold border border-brand-danger/30">
                      ⛔ Vượt trần chiết khấu tối đa 10% theo quy định BLUEPRINT B.9.2!
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingPolicyPage;
