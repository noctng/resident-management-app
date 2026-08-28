import { CrmSubNav } from '../../components/crm/CrmSubNav';
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { ProductUnit, RealEstatePhase } from '../../types';
import { useToast, useConfirm } from '../../components/ui';
import {
  BuildingOfficeIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  TrashIcon,
  XMarkIcon,
  PencilIcon,
  Squares2x2Icon,
  ZenTreeIcon,
  MuseumIcon,
} from '../../components/icons';

import PhaseManagementModal from '../../components/PhaseManagementModal';

interface ProductInventoryPageProps {
  onNavigate?: (route: string) => void;
  onBack?: () => void;
}

export const ProductInventoryPage: React.FC<ProductInventoryPageProps> = ({ onNavigate, onBack }) => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [phasesList, setPhasesList] = useState<any[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<ProductUnit | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    phase_code: 'CANTATA' as RealEstatePhase,
    block_code: 'Dãy 01',
    lot_number: '',
    house_type: 'SHOPHOUSE',
    floor: 3,
    land_area: 100,
    construction_area: 250,
    usable_area: 250,
    certificate_area: 100,
    land_price_before_vat: 4500000000,
    construction_price_before_vat: 2500000000,
    vat_rate: 8.00,
    direction: 'Đông Nam',
    view_description: 'Mặt tiền đường Phan Đình Giót',
    bedroom_count: 3,
    bathroom_count: 3,
    sales_status: 'AVAILABLE',
  });

  useEffect(() => {
    loadInventory();
    loadPhases();
  }, [selectedPhase, selectedStatus]);

  const loadPhases = async () => {
    try {
      const res: any = await api.get('/project-phases');
      if (res && res.success) {
        setPhasesList(res.phases || []);
      }
    } catch (err) {
      console.error('Failed to load phases:', err);
    }
  };

  const loadInventory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(selectedPhase !== 'ALL' ? { phase: selectedPhase } : {}),
        ...(selectedStatus !== 'ALL' ? { status: selectedStatus } : {}),
        ...(searchTerm ? { search: searchTerm } : {}),
      });

      const res: any = await api.get(`/products/matrix?${params.toString()}`);
      if (res && res.success) {
        setUnits(res.units || []);
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setFormData({
      code: '',
      phase_code: 'CANTATA',
      block_code: 'Dãy 01',
      lot_number: '',
      house_type: 'SHOPHOUSE',
      floor: 3,
      land_area: 100,
      construction_area: 250,
      usable_area: 250,
      certificate_area: 100,
      land_price_before_vat: 4500000000,
      construction_price_before_vat: 2500000000,
      vat_rate: 8.00,
      direction: 'Đông Nam',
      view_description: '',
      bedroom_count: 3,
      bathroom_count: 3,
      sales_status: 'AVAILABLE',
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (unit: ProductUnit) => {
    setSelectedUnit(unit);
    setFormData({
      code: unit.code,
      phase_code: (unit.phase_code || 'CANTATA') as RealEstatePhase,
      block_code: unit.block_code || 'Dãy 01',
      lot_number: unit.lot_number || unit.code,
      house_type: unit.house_type || 'SHOPHOUSE',
      floor: unit.floor || 3,
      land_area: Number(unit.land_area || unit.area || 100),
      construction_area: Number(unit.construction_area || 250),
      usable_area: Number(unit.usable_area || 250),
      certificate_area: Number(unit.certificate_area || 100),
      land_price_before_vat: Number(unit.land_price_before_vat || 4500000000),
      construction_price_before_vat: Number(unit.construction_price_before_vat || 2500000000),
      vat_rate: Number(unit.vat_rate || 8.00),
      direction: unit.direction || 'Đông Nam',
      view_description: unit.view_description || '',
      bedroom_count: unit.bedroom_count || 3,
      bathroom_count: unit.bathroom_count || 3,
      sales_status: unit.sales_status || 'AVAILABLE',
    });
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.post('/products/units', formData);
      if (res && res.success) {
        toast.success(res.message || 'Đã thêm căn mới');
        setIsCreateModalOpen(false);
        loadInventory();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi thêm căn');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit) return;
    try {
      const res: any = await api.put(`/products/units/${selectedUnit.id}`, formData);
      if (res && res.success) {
        toast.success(res.message || 'Đã cập nhật căn');
        setIsEditModalOpen(false);
        loadInventory();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi cập nhật căn');
    }
  };

  const handleDelete = async (unit: ProductUnit) => {
    if (!(await confirm({ title: 'Xóa sản phẩm', description: `Bạn có chắc chắn muốn xóa sản phẩm ${unit.code} khỏi kho hàng BĐS?`, variant: 'danger', confirmLabel: 'Xóa' }))) return;
    try {
      const res: any = await api.delete(`/products/units/${unit.id}`);
      if (res && res.success) {
        toast.success(res.message || 'Đã xóa sản phẩm');
        loadInventory();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi xóa sản phẩm');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return { label: 'Sẵn bán', chip: 'bg-surface text-ink border border-brand-border', dot: 'bg-ink-soft' };
      case 'BOOKED':
        return { label: 'Giữ chỗ', chip: 'bg-accent-soft text-accent-ink border border-accent/30', dot: 'bg-accent' };
      case 'DEPOSITED':
        return { label: 'Đã cọc', chip: 'bg-brand-teal-soft text-brand-teal border border-brand-teal/30', dot: 'bg-brand-teal' };
      case 'CONTRACTED':
        return { label: 'Đã ký HĐMB', chip: 'bg-accent text-white border border-accent', dot: 'bg-white' };
      case 'HANDED_OVER':
        return { label: 'Đã bàn giao', chip: 'bg-brand-success-soft text-brand-success border border-brand-success/25', dot: 'bg-brand-success' };
      case 'LOCKED':
        return { label: 'Khóa bán', chip: 'bg-surface-alt text-ink-faint border border-dashed border-brand-border', dot: 'bg-ink-faint' };
      default:
        return { label: status, chip: 'bg-surface-alt text-ink-soft border border-brand-border', dot: 'bg-ink-soft' };
    }
  };

  // Calculations for Form
  const subtotal = Number(formData.land_price_before_vat || 0) + Number(formData.construction_price_before_vat || 0);
  const vatAmt = Math.round((subtotal * Number(formData.vat_rate || 8)) / 100);
  const maintFee = Math.round(subtotal * 0.02);
  const grandTotal = subtotal + vatAmt + maintFee;

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      <CrmSubNav current="inventory" title="Quản Lý Kho Căn BĐS" subtitle="Thêm, sửa, xóa và cấu hình giá đất / xây dựng / diện tích" onNavigate={onNavigate} onBack={onBack} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <BuildingOfficeIcon className="w-7 h-7 text-primary-600" />
            Cấu Hình & Quản Lý Kho Hàng Sản Phẩm BĐS
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Thêm mới, chỉnh sửa thông số kỹ thuật 4 loại diện tích, cơ cấu giá 2 thành phần và trạng thái căn hộ
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              onClick={() => onNavigate('crm/sales-matrix')}
              className="px-3.5 py-2.5 bg-surface hover:bg-surface-alt border border-brand-border text-ink rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5"
            >
              <Squares2x2Icon className="w-4 h-4" />
              Xem Ma Trận Bán Hàng
            </button>
          )}

          <button
            onClick={() => setIsPhaseModalOpen(true)}
            className="flex items-center justify-center gap-1.5 bg-accent-soft text-accent border border-accent/30 hover:bg-accent hover:text-white px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all duration-200 cursor-pointer"
          >
            <Squares2x2Icon className="w-4 h-4" />
            <span>+ Quản Lý Phân Khu</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all duration-200 cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Thêm Sản Phẩm Mới</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-surface p-4 rounded-xl border border-brand-border flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo mã căn (VD: TES01-01, CAN02-05), dãy, số lô..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadInventory()}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </div>
          <button
            onClick={loadInventory}
            className="px-3 py-2 bg-surface hover:bg-surface-alt border border-brand-border text-ink rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all duration-200"
          >
            <ArrowPathIcon className="w-3.5 h-3.5" />
            <span>Lọc</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Phase Filter Tabs */}
          <div className="flex items-center bg-surface-alt p-1 rounded-xl border border-brand-border flex-wrap">
            {['ALL', ...(phasesList.length > 0 ? phasesList.map((p) => p.phase_code) : ['TESLA', 'CANTATA', 'NOXH'])].map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPhase(p)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                  selectedPhase === p
                    ? 'bg-surface text-accent shadow-sm'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                {p === 'ALL' ? 'Tất cả' : (
                  <>
                    {p === 'TESLA' ? <ZenTreeIcon className="w-3.5 h-3.5" /> : p === 'CANTATA' ? <MuseumIcon className="w-3.5 h-3.5" /> : <BuildingOfficeIcon className="w-3.5 h-3.5" />}
                    {p}
                  </>
                )}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
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

      {/* Inventory Table */}
      <div className="bg-surface rounded-2xl border border-brand-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-ink-soft">
            <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto text-accent mb-2" />
            <span className="text-xs">Đang tải danh sách kho sản phẩm...</span>
          </div>
        ) : units.length === 0 ? (
          <div className="p-16 text-center text-ink-soft">
            <BuildingOfficeIcon className="w-12 h-12 mx-auto text-ink-faint mb-2" />
            <p className="font-bold text-ink">Không tìm thấy sản phẩm phù hợp</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-alt text-[11px] uppercase tracking-wider text-ink-soft font-semibold border-b border-brand-border">
                <tr>
                  <th className="py-3.5 px-4">Mã Căn</th>
                  <th className="py-3.5 px-4">Phân khu / Dãy</th>
                  <th className="py-3.5 px-4">Loại hình & Tầng</th>
                  <th className="py-3.5 px-4 text-right">DT Đất / XD (m²)</th>
                  <th className="py-3.5 px-4 text-right">Giá Đất (trước VAT)</th>
                  <th className="py-3.5 px-4 text-right">Giá XD (trước VAT)</th>
                  <th className="py-3.5 px-4 text-right">Tổng Giá Bán (gồm VAT + PBT)</th>
                  <th className="py-3.5 px-4 text-center">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {units.map((u) => {
                  const badge = getStatusBadge(u.sales_status || 'AVAILABLE');
                  const lPrice = Number(u.land_price_before_vat || 0);
                  const cPrice = Number(u.construction_price_before_vat || 0);
                  const sub = lPrice + cPrice;
                  const vat = Math.round((sub * Number(u.vat_rate || 8)) / 100);
                  const pbt = Math.round(sub * 0.02);
                  const total = sub + vat + pbt;

                  return (
                    <tr key={u.id} className="hover:bg-surface-alt/60 transition-colors duration-150">
                      <td className="py-3.5 px-4 font-mono font-semibold text-ink">
                        {u.code}
                      </td>
                      <td className="py-3.5 px-4">
                        <strong className="text-ink flex items-center gap-1">
                          {u.phase_code === 'TESLA' ? <ZenTreeIcon className="w-3.5 h-3.5" /> : u.phase_code === 'CANTATA' ? <MuseumIcon className="w-3.5 h-3.5" /> : <BuildingOfficeIcon className="w-3.5 h-3.5" />}
                          {u.phase_code}
                        </strong>
                        <span className="text-[10px] text-ink-soft">{u.block_code || 'Dãy 01'} • Lô {u.lot_number || u.code}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-ink block">{u.house_type || 'SHOPHOUSE'}</span>
                        <span className="text-[10px] text-ink-soft">{u.floor || 1} Tầng • {u.direction || 'Đông Nam'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        <strong className="text-ink">{u.land_area || u.area} m²</strong>
                        <span className="text-[10px] text-ink-soft block">XD: {u.construction_area || (Number(u.area) * 0.85).toFixed(1)} m²</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-ink">
                        {lPrice > 0 ? `${(lPrice / 1000000000).toFixed(2)} tỷ` : '0'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-ink">
                        {cPrice > 0 ? `${(cPrice / 1000000000).toFixed(2)} tỷ` : '0'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-accent">
                        {total > 0 ? `${(total / 1000000000).toFixed(3)} tỷ VNĐ` : '0 VNĐ'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${badge.chip}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg border border-brand-border text-ink-soft hover:text-accent hover:border-accent/40 transition-all duration-200 cursor-pointer"
                          >
                            <PencilIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(u)}
                            className="p-1.5 rounded-lg border border-brand-border text-ink-soft hover:text-brand-danger hover:border-brand-danger/40 transition-all duration-200 cursor-pointer"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
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

      {/* CREATE / EDIT MODAL */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-2xl border border-brand-border w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-up">
            <div className="px-6 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between sticky top-0 z-10">
              <h3 className="font-bold text-ink text-base">
                {isCreateModalOpen ? '+ Thêm Mới Sản Phẩm BĐS Vào Kho' : `Cập Nhật Thông Số Căn ${selectedUnit?.code}`}
              </h3>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="p-1.5 rounded-lg border border-brand-border text-ink-soft hover:text-accent hover:border-accent/40 transition-all duration-200 cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={isCreateModalOpen ? handleCreateSubmit : handleEditSubmit} className="p-6 space-y-4 text-xs">
              
              {/* Row 1: Code, Phase, Block, Lot */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Mã Căn / Lô <span className="text-brand-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink font-mono font-bold placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    placeholder="VD: TES01-10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Phân khu <span className="text-brand-danger">*</span>
                  </label>
                  <select
                    value={formData.phase_code}
                    onChange={(e) => setFormData({
                      ...formData,
                      phase_code: e.target.value as any,
                      vat_rate: e.target.value === 'NOXH' ? 5.00 : 8.00,
                    })}
                    className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  >
                    {phasesList.length > 0 ? (
                      phasesList.map((p) => (
                        <option key={p.id} value={p.phase_code}>
                          {p.phase_code} - {p.phase_name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="TESLA">TESLA (Biệt thự/Nhà vườn)</option>
                        <option value="CANTATA">CANTATA (Nhà phố Shophouse)</option>
                        <option value="NOXH">NOXH (Cao tầng)</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Dãy (Block)
                  </label>
                  <input
                    type="text"
                    value={formData.block_code}
                    onChange={(e) => setFormData({ ...formData, block_code: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    placeholder="VD: Dãy 01, Tòa CT1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Số Lô / Tầng
                  </label>
                  <input
                    type="number"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </div>
              </div>

              {/* Row 2: 4 Area Metrics */}
              <div className="p-3 bg-surface-alt/60 rounded-xl border border-brand-border space-y-2">
                <strong className="block text-[11px] text-ink font-bold">
                  4 Loại Diện Tích Chuẩn Hóa
                </strong>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] text-ink-soft mb-1">DT Đất (m²)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={formData.land_area}
                      onChange={(e) => setFormData({ ...formData, land_area: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-brand-border bg-surface text-sm text-ink font-mono font-bold focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-ink-soft mb-1">DT Sàn XD (m²)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.construction_area}
                      onChange={(e) => setFormData({ ...formData, construction_area: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-brand-border bg-surface text-sm text-ink font-mono focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-ink-soft mb-1">DT Sử Dụng (m²)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.usable_area}
                      onChange={(e) => setFormData({ ...formData, usable_area: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-brand-border bg-surface text-sm text-ink font-mono focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-ink-soft mb-1">DT Sổ Hồng (m²)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.certificate_area}
                      onChange={(e) => setFormData({ ...formData, certificate_area: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-brand-border bg-surface text-sm text-ink font-mono focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Two-Component Pricing */}
              <div className="p-3 bg-accent-soft/40 rounded-xl border border-accent/20 space-y-2">
                <strong className="block text-[11px] text-accent-ink font-bold">
                  Cơ Cấu Giá 2 Thành Phần & Thuế Phí
                </strong>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-ink-soft mb-1">Giá Quyền Sử Dụng Đất (VNĐ)</label>
                    <input
                      type="number"
                      required
                      value={formData.land_price_before_vat}
                      onChange={(e) => setFormData({ ...formData, land_price_before_vat: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-brand-border bg-surface text-sm text-ink font-mono font-bold focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-ink-soft mb-1">Giá Xây Dựng Nhà Ở (VNĐ)</label>
                    <input
                      type="number"
                      required
                      value={formData.construction_price_before_vat}
                      onChange={(e) => setFormData({ ...formData, construction_price_before_vat: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-brand-border bg-surface text-sm text-ink font-mono font-bold focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-ink-soft mb-1">Thuế GTGT (%)</label>
                    <select
                      value={formData.vat_rate}
                      onChange={(e) => setFormData({ ...formData, vat_rate: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-brand-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    >
                      <option value={8}>8% (Thương mại)</option>
                      <option value={5}>5% (Ưu đãi NOXH)</option>
                      <option value={10}>10% (Chuẩn)</option>
                    </select>
                  </div>
                </div>

                {/* Auto Calculated Preview */}
                <div className="pt-2 border-t border-accent/30 text-[11px] grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono tabular-nums text-ink-soft">
                  <div>Tiền trước thuế: <strong className="text-ink">{subtotal.toLocaleString('vi-VN')} VNĐ</strong></div>
                  <div>Tiền VAT ({formData.vat_rate}%): <strong className="text-ink">{vatAmt.toLocaleString('vi-VN')} VNĐ</strong></div>
                  <div>Phí bảo trì 2%: <strong className="text-ink">{maintFee.toLocaleString('vi-VN')} VNĐ</strong></div>
                  <div className="text-accent font-bold">Tổng giá: <strong>{grandTotal.toLocaleString('vi-VN')} VNĐ</strong></div>
                </div>
              </div>

              {/* Row 4: Specs & Status */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Hướng Nhà
                  </label>
                  <select
                    value={formData.direction}
                    onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  >
                    <option value="Đông Nam">Đông Nam</option>
                    <option value="Đông Bắc">Đông Bắc</option>
                    <option value="Tây Nam">Tây Nam</option>
                    <option value="Tây Bắc">Tây Bắc</option>
                    <option value="Chính Nam">Chính Nam</option>
                    <option value="Chính Bắc">Chính Bắc</option>
                    <option value="Chính Đông">Chính Đông</option>
                    <option value="Chính Tây">Chính Tây</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Số Phòng Ngủ
                  </label>
                  <input
                    type="number"
                    value={formData.bedroom_count}
                    onChange={(e) => setFormData({ ...formData, bedroom_count: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Số WC
                  </label>
                  <input
                    type="number"
                    value={formData.bathroom_count}
                    onChange={(e) => setFormData({ ...formData, bathroom_count: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Trạng Thái Kho
                  </label>
                  <select
                    value={formData.sales_status}
                    onChange={(e) => setFormData({ ...formData, sales_status: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  >
                    <option value="AVAILABLE">Sẵn bán (Available)</option>
                    <option value="BOOKED">Giữ chỗ (Booked)</option>
                    <option value="DEPOSITED">Đã cọc (Deposited)</option>
                    <option value="CONTRACTED">Đã ký HĐMB (Contracted)</option>
                    <option value="HANDED_OVER">Đã bàn giao (Handed Over)</option>
                    <option value="LOCKED">Khóa bán (Locked)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Mô Tả View & Vị Trí Đặc Điểm
                </label>
                <input
                  type="text"
                  value={formData.view_description}
                  onChange={(e) => setFormData({ ...formData, view_description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  placeholder="VD: Căn góc 2 mặt tiền, view công viên Zen Garden..."
                />
              </div>

              {/* Buttons */}
              <div className="pt-4 border-t border-brand-border flex justify-end gap-2 sticky bottom-0 bg-surface pb-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2 bg-surface hover:bg-surface-alt border border-brand-border text-ink rounded-xl font-bold transition-all duration-200 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold shadow-sm transition-all duration-200 cursor-pointer"
                >
                  {isCreateModalOpen ? 'Lưu Sản Phẩm Mới' : 'Cập Nhật Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phase Management Modal */}
      <PhaseManagementModal
        isOpen={isPhaseModalOpen}
        onClose={() => setIsPhaseModalOpen(false)}
        onPhaseUpdated={() => {
          loadPhases();
          loadInventory();
        }}
      />
    </div>
  );
};

export default ProductInventoryPage;
