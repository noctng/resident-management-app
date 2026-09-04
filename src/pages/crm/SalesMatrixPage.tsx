import { CrmSubNav } from '../../components/crm/CrmSubNav';
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { ProductUnit, SalesMatrixStats, RealEstatePhase, ProductSalesStatus } from '../../types';
import { useToast, useConfirm } from '../../components/ui';
import { EmptyState } from '../../components/ui';
import {
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  XMarkIcon,
  DocumentTextIcon,
  SparklesIcon,
  Cog6ToothIcon,
  PinIcon,
  PencilIcon,
  ZenTreeIcon,
  MuseumIcon,
} from '../../components/icons';
import { StatCard } from '../../components/ui/Card';

interface SalesMatrixPageProps {
  onNavigate?: (route: string) => void;
  onBack?: () => void;
  

}

export const SalesMatrixPage: React.FC<SalesMatrixPageProps> = ({ onNavigate, onBack }) => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [activePhase, setActivePhase] = useState<RealEstatePhase>('CANTATA');
  const [matrixData, setMatrixData] = useState<Record<string, Record<string, ProductUnit[]>>>({});
  const [stats, setStats] = useState<SalesMatrixStats>({
    total: 0,
    available: 0,
    booked: 0,
    deposited: 0,
    contracted: 0,
    handedOver: 0,
    locked: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedUnit, setSelectedUnit] = useState<ProductUnit | null>(null);
  const [unitDetailLoading, setUnitDetailLoading] = useState(false);

  // Quick Booking Prompt State
  const [isQuickBookingOpen, setIsQuickBookingOpen] = useState(false);
  const [quickBookingForm, setQuickBookingForm] = useState({ customer_name: '', customer_phone: '' });

  useEffect(() => {
    loadSalesMatrix();
  }, [activePhase, statusFilter]);

  const loadSalesMatrix = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        phase: activePhase,
        status: statusFilter,
        ...(searchTerm ? { search: searchTerm } : {}),
      });

      const res: any = await api.get(`/products/matrix?${params.toString()}`);
      if (res && res.success) {
        setMatrixData(res.matrix || {});
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load sales matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUnit = async (unit: ProductUnit) => {
    try {
      setSelectedUnit(unit);
      setUnitDetailLoading(true);
      const res: any = await api.get(`/products/units/${unit.id}`);
      if (res && res.success) {
        setSelectedUnit(res.unit);
      }
    } catch (err) {
      console.error('Failed to load unit detail:', err);
    } finally {
      setUnitDetailLoading(false);
    }
  };

  const handleQuickBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit) return;
    try {
      const res: any = await api.post('/crm/bookings', {
        apartment_id: selectedUnit.id,
        customer_name: quickBookingForm.customer_name,
        customer_phone: quickBookingForm.customer_phone,
        booking_fee: 50000000,
        deposit_intent_amount: 100000000,
        notes: 'Giữ chỗ trực tiếp từ Ma Trận Bán Hàng',
      });
      if (res && res.success) {
        toast.success(res.message || 'Đã giữ chỗ');
        setSelectedUnit(null);
        setIsQuickBookingOpen(false);
        loadSalesMatrix();
      }
    } catch (e: any) {
      toast.error(e.message || 'Lỗi giữ chỗ');
    }
  };

  const currentPhaseBlocks = matrixData[activePhase] || {};
  const blockKeys = Object.keys(currentPhaseBlocks);

  const getStatusBadge = (status?: ProductSalesStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return { label: 'Sẵn bán', cell: 'bg-surface text-ink border-brand-border', dot: 'bg-ink-soft' };
      case 'BOOKED':
        return { label: 'Giữ chỗ', cell: 'bg-accent-soft text-accent-ink border-accent/30', dot: 'bg-accent' };
      case 'DEPOSITED':
        return { label: 'Đã cọc', cell: 'bg-brand-teal-soft text-brand-teal border-brand-teal/30', dot: 'bg-brand-teal' };
      case 'CONTRACTED':
        return { label: 'Đã ký HĐMB', cell: 'bg-accent text-white border-accent', dot: 'bg-white' };
      case 'HANDED_OVER':
        return { label: 'Đã bàn giao', cell: 'bg-brand-success-soft text-brand-success border-brand-success/25', dot: 'bg-brand-success' };
      case 'LOCKED':
        return { label: 'Khóa bán', cell: 'bg-surface-alt text-ink-faint border-dashed border-brand-border', dot: 'bg-ink-faint' };
      default:
        return { label: 'Sẵn bán', cell: 'bg-surface text-ink border-brand-border', dot: 'bg-ink-soft' };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <CrmSubNav current="sales-matrix" title="Ma Trận Căn BĐS" subtitle="Bản đồ trực quan sản phẩm phân khu TESLA, CANTATA & NOXH" onNavigate={onNavigate} onBack={onBack} />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink flex items-center gap-2">
            <BuildingOfficeIcon className="w-7 h-7 text-primary-600" />
            Ma Trận Bán Hàng Trực Quan (Sales Matrix)
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Quản lý tồn kho BĐS theo sơ đồ phân khu, trạng thái giỏ hàng, giữ chỗ và hợp đồng
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              onClick={() => onNavigate('crm/inventory')}
              className="px-3.5 py-2 bg-surface hover:bg-surface-alt text-ink rounded-xl text-xs font-bold border border-brand-border transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Cog6ToothIcon className="w-3.5 h-3.5" />
              Cấu Hình & Quản Lý Kho Căn
            </button>
          )}

          {/* Phase Selector Tabs */}
          <div className="flex items-center bg-surface-alt p-1.5 rounded-2xl border border-brand-border">
            <button
              onClick={() => setActivePhase('TESLA')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activePhase === 'TESLA'
                  ? 'bg-surface text-accent shadow-sm'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              <ZenTreeIcon className="w-3.5 h-3.5" />
              Phân khu TESLA (Nhà mặt đất)
            </button>
            <button
              onClick={() => setActivePhase('CANTATA')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activePhase === 'CANTATA'
                  ? 'bg-surface text-accent shadow-sm'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              <MuseumIcon className="w-3.5 h-3.5" />
              Phân khu CANTATA (Nhà mặt đất)
            </button>
            <button
              onClick={() => setActivePhase('NOXH')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                activePhase === 'NOXH'
                  ? 'bg-surface text-accent shadow-sm'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              <BuildingOfficeIcon className="w-3.5 h-3.5" />
              Phân khu NOXH (Cao tầng)
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Sẵn bán', count: stats.available, tone: 'ink' as const, dot: 'bg-ink-soft' },
          { label: 'Giữ chỗ', count: stats.booked, tone: 'accent' as const, dot: 'bg-accent' },
          { label: 'Đã cọc', count: stats.deposited, tone: 'teal' as const, dot: 'bg-brand-teal' },
          { label: 'Đã ký HĐ', count: stats.contracted, tone: 'accent' as const, dot: 'bg-accent' },
          { label: 'Đã bàn giao', count: stats.handedOver, tone: 'success' as const, dot: 'bg-brand-success' },
          { label: 'Khóa bán', count: stats.locked, tone: 'ink' as const, dot: 'bg-ink-faint' },
        ].map((item, idx) => (
          <StatCard
            key={idx}
            label={item.label}
            value={item.count}
            valueTone={item.tone}
            className="border-l-4"
            subValue={<span className={`inline-block w-2.5 h-2.5 rounded-full ${item.dot}`} />}
          />
        ))}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-surface p-4 rounded-xl border border-brand-border flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo mã căn, số lô, dãy..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadSalesMatrix()}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </div>
          <button
            onClick={loadSalesMatrix}
            className="px-3 py-2 bg-surface hover:bg-surface-alt border border-brand-border text-ink rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all duration-200"
          >
            <ArrowPathIcon className="w-3.5 h-3.5" />
            <span>Lọc</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-soft font-medium">Trạng thái:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="AVAILABLE">Sẵn bán</option>
            <option value="BOOKED">Giữ chỗ</option>
            <option value="DEPOSITED">Đã cọc</option>
            <option value="CONTRACTED">Đã ký HĐMB</option>
            <option value="HANDED_OVER">Đã bàn giao</option>
            <option value="LOCKED">Khóa bán</option>
          </select>
        </div>
      </div>

      {/* Main Interactive Matrix Board */}
      <div className="space-y-6">
        {loading ? (
          <div className="bg-surface p-16 rounded-2xl border border-brand-border text-center text-ink-soft">
            <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto text-accent mb-3" />
            <p className="text-sm font-medium">Đang tải dữ liệu ma trận bán hàng phân khu {activePhase}...</p>
          </div>
        ) : blockKeys.length === 0 ? (
          <EmptyState
            icon={BuildingOfficeIcon}
            tone="neutral"
            title="Chưa có sản phẩm nào trong phân khu này"
            description="Vui lòng chọn phân khu khác hoặc thay đổi bộ lọc tìm kiếm."
            size="md"
          />
        ) : (
          blockKeys.map((blockName) => {
            const unitsInBlock = currentPhaseBlocks[blockName] || [];
            return (
              <div
                key={blockName}
                className="bg-surface rounded-2xl border border-brand-border p-5 shadow-sm space-y-4"
              >
                {/* Block Title Header */}
                <div className="flex items-center justify-between border-b border-brand-border pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                    <h2 className="font-bold text-ink text-base">
                      {activePhase === 'NOXH' ? `Tòa / Tầng: ${blockName}` : `Dãy / Block: ${blockName}`}
                    </h2>
                    <span className="text-sm text-ink-soft bg-surface-alt px-2 py-0.5 rounded-full font-medium">
                      {unitsInBlock.length} căn/lô
                    </span>
                  </div>
                </div>

                {/* Unit Matrix Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {unitsInBlock.map((unit) => {
                    const badge = getStatusBadge(unit.effectiveStatus);
                    const isSelected = selectedUnit?.id === unit.id;

                    return (
                      <div
                        key={unit.id}
                        onClick={() => handleSelectUnit(unit)}
                        className={`min-h-[44px] p-3 rounded-lg border transition-all duration-200 cursor-pointer text-center relative overflow-hidden hover:border-accent/40 hover:shadow-sm ${badge.cell} ${
                          isSelected ? 'ring-2 ring-accent/60 ring-offset-1 ring-offset-bg' : ''
                        }`}
                      >
                        <div className="text-xs font-mono font-semibold truncate mt-0.5">
                          {unit.code}
                        </div>
                        <div className="text-[10px] opacity-70 mt-0.5 truncate">
                          {unit.land_area || unit.area} m²
                        </div>

                        <div className="mt-2 flex items-center justify-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          <span className="text-[10px] font-semibold">{badge.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Consultation & Unit Detail Drawer Modal */}
      {selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
            
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent-soft text-accent-ink rounded-xl">
                  <BuildingOfficeIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-ink text-base flex items-center gap-2">
                    Căn / Lô: {selectedUnit.code}
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border ${getStatusBadge(selectedUnit.effectiveStatus).cell}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${getStatusBadge(selectedUnit.effectiveStatus).dot}`} />
                      {getStatusBadge(selectedUnit.effectiveStatus).label}
                    </span>
                  </h2>
                  <p className="text-sm text-ink-soft">
                    Phân khu: <strong className="text-ink">{selectedUnit.phase_code || activePhase}</strong> • Dãy: <strong className="text-ink">{selectedUnit.block_code || 'N/A'}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUnit(null)}
                className="p-1.5 rounded-lg border border-brand-border text-ink-soft hover:text-accent hover:border-accent/40 transition-all duration-200 cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 custom-scrollbar">
              {unitDetailLoading ? (
                <div className="p-12 text-center text-ink-soft">
                  <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto text-accent mb-2" />
                  <span className="text-xs">Đang tải thông số chi tiết...</span>
                </div>
              ) : (
                <>
                  {/* 4 Types of Areas (Blueprint B.1.2) */}
                  <div>
                    <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-2.5">
                      4 Loại Diện Tích Tiêu Chuẩn (Blueprint B.1.2)
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-3 bg-surface-alt rounded-xl border border-brand-border">
                        <div className="text-[11px] text-ink-soft">Diện tích đất</div>
                        <div className="text-sm font-bold text-ink mt-0.5">
                          {selectedUnit.land_area || selectedUnit.area} m²
                        </div>
                      </div>
                      <div className="p-3 bg-surface-alt rounded-xl border border-brand-border">
                        <div className="text-[11px] text-ink-soft">Diện tích xây dựng</div>
                        <div className="text-sm font-bold text-ink mt-0.5">
                          {selectedUnit.construction_area || (selectedUnit.area * 0.85).toFixed(1)} m²
                        </div>
                      </div>
                      <div className="p-3 bg-surface-alt rounded-xl border border-brand-border">
                        <div className="text-[11px] text-ink-soft">Thông thủy</div>
                        <div className="text-sm font-bold text-ink mt-0.5">
                          {selectedUnit.usable_area || (selectedUnit.area * 0.80).toFixed(1)} m²
                        </div>
                      </div>
                      <div className="p-3 bg-surface-alt rounded-xl border border-brand-border">
                        <div className="text-[11px] text-ink-soft">Diện tích sổ</div>
                        <div className="text-sm font-bold text-brand-teal mt-0.5">
                          {selectedUnit.certificate_area || 'Chờ trích lục'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2-Component Price Breakdown (Blueprint B.5.3 / Phụ lục 02) */}
                  <div>
                    <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-2.5">
                      Cơ Cấu Giá Bán 2 Thành Phần (Phụ lục 02 Thực Tế)
                    </h4>
                    <div className="p-4 bg-accent-soft/40 rounded-xl border border-accent/20 space-y-2 text-xs">
                      <div className="flex justify-between items-center gap-3 text-ink-soft">
                        <span>1. Giá đất sau CK (chưa VAT):</span>
                        <strong className="text-ink font-mono tabular-nums text-right">
                          {(selectedUnit.priceBreakdown?.landPrice || selectedUnit.land_price_before_vat || 4500000000).toLocaleString('vi-VN')} VNĐ
                        </strong>
                      </div>
                      <div className="flex justify-between items-center gap-3 text-ink-soft">
                        <span>2. Giá xây dựng sau CK (chưa VAT):</span>
                        <strong className="text-ink font-mono tabular-nums text-right">
                          {(selectedUnit.priceBreakdown?.constructionPrice || selectedUnit.construction_price_before_vat || 2500000000).toLocaleString('vi-VN')} VNĐ
                        </strong>
                      </div>
                      <div className="flex justify-between items-center gap-3 text-ink-soft">
                        <span>3. Thuế GTGT (VAT {selectedUnit.vat_rate || (activePhase === 'NOXH' ? 5 : 8)}%):</span>
                        <strong className="text-ink font-mono tabular-nums text-right">
                          {(selectedUnit.priceBreakdown?.vatAmount || 560000000).toLocaleString('vi-VN')} VNĐ
                        </strong>
                      </div>
                      <div className="flex justify-between items-center gap-3 text-ink-soft">
                        <span>4. Phí bảo trì 2% (thu trước bàn giao):</span>
                        <strong className="text-ink font-mono tabular-nums text-right">
                          {(selectedUnit.priceBreakdown?.maintenanceFee2Pct || 140000000).toLocaleString('vi-VN')} VNĐ
                        </strong>
                      </div>
                      <div className="pt-2 border-t border-accent/30 flex justify-between items-center gap-3 text-sm font-bold text-ink">
                        <span>TỔNG GIÁ TRỊ HỢP ĐỒNG:</span>
                        <span className="text-base text-accent font-black font-mono tabular-nums text-right">
                          {(selectedUnit.priceBreakdown?.grandTotal || 7700000000).toLocaleString('vi-VN')} VNĐ
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Customer / Contract summary if occupied */}
                  {selectedUnit.contracts && selectedUnit.contracts.length > 0 && (
                    <div className="p-3 bg-brand-success-soft rounded-xl border border-brand-success/25 text-xs">
                      <div className="font-bold text-brand-success mb-1 flex items-center gap-1.5">
                        <DocumentTextIcon className="w-3.5 h-3.5" />
                        Hợp Đồng Mua Bán: {selectedUnit.contracts[0].contract_code}
                      </div>
                      <div className="text-ink-soft">
                        Khách hàng: <strong className="text-ink">{selectedUnit.contracts[0].customers?.name}</strong> • SĐT: {selectedUnit.contracts[0].customers?.phone_number}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="px-5 py-3.5 bg-surface-alt border-t border-brand-border flex items-center justify-between gap-3">
              <div className="text-sm text-ink-soft">
                Mã định danh: <code className="font-mono text-[11px] text-ink-soft">{selectedUnit.id}</code>
              </div>

              <div className="flex items-center gap-2">
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUnit(null);
                      onNavigate('crm/inventory');
                    }}
                    className="px-3 py-2 bg-surface hover:bg-surface-alt border border-brand-border text-ink rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5"
                  >
                    <PencilIcon className="w-3.5 h-3.5" />
                    Sửa Thông Số
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res: any = await api.post('/crm/bookings/cart', {
                        apartment_id: selectedUnit.id,
                        notes: `Thêm từ ma trận bán hàng phân khu ${selectedUnit.phase_code || activePhase}`,
                      });
                      if (res && res.success) {
                        toast.success(res.message || `Đã thêm căn ${selectedUnit.code} vào giỏ hàng tư vấn!`);
                      }
                    } catch (e: any) {
                      toast.error(e.message || 'Lỗi khi thêm giỏ hàng');
                    }
                  }}
                  className="px-3.5 py-2 bg-surface hover:bg-surface-alt border border-brand-border text-ink rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5"
                >
                  <SparklesIcon className="w-3.5 h-3.5" />
                  Thêm Giỏ Hàng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickBookingForm({ customer_name: '', customer_phone: '' });
                    setIsQuickBookingOpen(true);
                  }}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold shadow-sm transition-all duration-200 cursor-pointer flex items-center gap-1.5"
                >
                  <PinIcon className="w-3.5 h-3.5" />
                  Giữ Chỗ Ngay (Atomic Lock)
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Quick Booking Prompt Modal */}
      {isQuickBookingOpen && selectedUnit && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h2 className="font-bold text-ink text-base flex items-center gap-1.5">
                <PinIcon className="w-4 h-4 text-accent" />
                Giữ Chỗ Căn {selectedUnit.code}
              </h2>
              <button
                onClick={() => setIsQuickBookingOpen(false)}
                className="p-1.5 rounded-lg border border-brand-border text-ink-soft hover:text-accent hover:border-accent/40 transition-all duration-200 cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickBookingSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Họ tên khách hàng giữ chỗ <span className="text-brand-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={quickBookingForm.customer_name}
                  onChange={(e) => setQuickBookingForm({ ...quickBookingForm, customer_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  placeholder="VD: Nguyễn Văn A"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Số điện thoại khách hàng <span className="text-brand-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={quickBookingForm.customer_phone}
                  onChange={(e) => setQuickBookingForm({ ...quickBookingForm, customer_phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  placeholder="VD: 0987654321"
                />
              </div>

              <div className="pt-3 border-t border-brand-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickBookingOpen(false)}
                  className="px-4 py-2 bg-surface hover:bg-surface-alt border border-brand-border text-ink rounded-xl font-bold transition-all duration-200 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold shadow-sm transition-all duration-200 cursor-pointer"
                >
                  Xác Nhận Giữ Chỗ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesMatrixPage;
