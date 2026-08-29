import React, { useState, useMemo } from 'react';
import type { Apartment, Resident, Occupancy } from '../types';
import {
  PencilIcon,
  ViewfinderCircleIcon,
  DocumentArrowDownIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  KeyIcon,
  UsersIcon,
  BoltIcon,
  BanknotesIcon,
  XMarkIcon,
  SparklesIcon,
  Squares2x2Icon,
  MagnifyingGlassIcon,
} from '../components/icons';
import { StatCard } from '../components/ui/Card';
import { api } from '../services/api';
import { useToast } from '../components/ui';
import ApartmentResidentsModal from '../components/ApartmentResidentsModal';
import ImportApartmentModal from '../components/ImportApartmentModal';
import PhaseManagementModal from '../components/PhaseManagementModal';
import { DocumentArrowUpIcon } from '../components/icons';

interface ApartmentsPageProps {
  apartments: Apartment[];
  residents: Resident[];
  occupancies: Occupancy[];
  onAddApartment: () => void;
  onEditApartment: (apartment: Apartment) => void;
  onViewApartment: (apartment: Apartment) => void;
  onAddResidentToApartment: (apartmentId: string, residentId: string) => void;
  onRemoveResidentFromApartment: (apartmentId: string, residentId: string) => void;
  onEditResident: (resident: Resident) => void;
  onNavigate?: (route: string) => void;
}

const ApartmentsPage: React.FC<ApartmentsPageProps> = ({
  apartments = [],
  residents = [],
  occupancies = [],
  onAddApartment,
  onEditApartment,
  onViewApartment,
  onAddResidentToApartment,
  onRemoveResidentFromApartment,
  onEditResident,
  onNavigate,
}) => {
  const [filterPhase, setFilterPhase] = useState<string>('all');
  const [filterBlock, setFilterBlock] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApartmentForModal, setSelectedApartmentForModal] = useState<Apartment | null>(null);
  const [selectedApartmentDetail, setSelectedApartmentDetail] = useState<Apartment | null>(null);
  const [exporting, setExporting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);
  const toast = useToast();

  // Get unique blocks
  const blocks = Array.from(
    new Set(
      apartments.map((apt) => apt.block_code || apt.blockCode || apt.code.split('-')[0])
    )
  ).sort();

  // Get resident count for each apartment
  const getResidentCount = (apartmentId: string) => {
    return occupancies.filter((occ) => occ.apartmentId === apartmentId).length;
  };

  const getResidentsInApartment = (apartmentId: string) => {
    const residentIds = occupancies
      .filter((o) => o.apartmentId === apartmentId)
      .map((o) => o.residentId);
    return residents.filter((r) => residentIds.includes(r.id));
  };

  // Thống kê nhanh cho Dashboard Cards
  const stats = useMemo(() => {
    const total = apartments.length;
    const occupiedApts = apartments.filter((apt) => getResidentCount(apt.id) > 0).length;
    const vacantApts = total - occupiedApts;
    const occupancyRate = total > 0 ? Math.round((occupiedApts / total) * 100) : 0;
    const totalResidents = occupancies.length;
    const avgDensity = occupiedApts > 0 ? (totalResidents / occupiedApts).toFixed(1) : '0';

    const teslaCount = apartments.filter((apt) => (apt.phase_code || apt.phaseCode) === 'TESLA').length;
    const cantataCount = apartments.filter((apt) => (apt.phase_code || apt.phaseCode) === 'CANTATA').length;
    const noxhCount = apartments.filter((apt) => (apt.phase_code || apt.phaseCode) === 'NOXH').length;

    // Tổng giá trị tài sản BĐS đã bàn giao
    const totalAssetValue = apartments.reduce((acc, apt) => {
      const g = Number(apt.grand_total || apt.grandTotal || 0);
      if (g > 0) return acc + g;
      const l = Number(apt.land_price_before_vat || apt.landPrice || 0);
      const c = Number(apt.construction_price_before_vat || apt.constructionPrice || 0);
      const sub = l + c;
      return acc + (sub > 0 ? Math.round(sub * 1.1) : (apt.code.startsWith('TES') ? 14300000000 : 7700000000));
    }, 0);

    return {
      total,
      occupiedApts,
      vacantApts,
      occupancyRate,
      totalResidents,
      avgDensity,
      teslaCount,
      cantataCount,
      noxhCount,
      blocksCount: blocks.length,
      totalAssetValueInBillion: (totalAssetValue / 1000000000).toFixed(1),
    };
  }, [apartments, occupancies, blocks]);

  // Filter apartments
  const filteredApartments = useMemo(() => {
    return apartments.filter((apt) => {
      const phase = apt.phase_code || apt.phaseCode || (apt.code.startsWith('TES') ? 'TESLA' : 'CANTATA');
      const block = apt.block_code || apt.blockCode || apt.code.split('-')[0];
      const residentCount = getResidentCount(apt.id);
      const status = residentCount > 0 ? 'occupied' : 'vacant';

      const matchesPhase = filterPhase === 'all' || phase === filterPhase;
      const matchesBlock = filterBlock === 'all' || block === filterBlock;
      const matchesStatus = filterStatus === 'all' || status === filterStatus;
      const matchesSearch =
        searchQuery === '' ||
        apt.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        block.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesPhase && matchesBlock && matchesStatus && matchesSearch;
    });
  }, [apartments, filterPhase, filterBlock, filterStatus, searchQuery, occupancies]);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const blob = await api.download('/reports/apartments', {}, 'GET');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Danh_sach_can_ho_ban_giao.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Xuất báo cáo thất bại: ' + (error.message || 'Lỗi server'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className=" font-seriftext-2xl sm:text-3xl font-bold text-ink flex items-center gap-2">
            <BuildingOfficeIcon className="w-8 h-8 text-accent" />
            Quản Lý Căn Hộ & Bất Động Sản Bàn Giao
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Theo dõi danh sách toàn bộ căn hộ đã bàn giao cho cư dân, bóc tách 4 loại diện tích, cơ cấu giá BĐS & hồ sơ cư trú
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigate && (
            <>
              <button
                onClick={() => onNavigate('crm/sales-matrix')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-accent-soft text-accent-ink rounded-xl text-xs font-bold border border-transparent hover:border-accent/40 transition-colors cursor-pointer"
              >
                <Squares2x2Icon className="w-4 h-4" />
                <span>Ma Trận CRM</span>
              </button>
              <button
                onClick={() => onNavigate('crm/inventory')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-teal-soft text-brand-teal rounded-xl text-xs font-bold border border-transparent hover:border-brand-teal/40 transition-colors cursor-pointer"
              >
                <BuildingOfficeIcon className="w-4 h-4" />
                <span>Kho Căn BĐS</span>
              </button>
            </>
          )}

          <button
            onClick={() => setIsPhaseModalOpen(true)}
            className="bg-accent-soft text-accent border border-accent/30 px-3.5 py-2 rounded-xl hover:bg-accent hover:text-white transition-colors duration-200 font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Squares2x2Icon className="w-4 h-4" />
            <span>+ Quản Lý Phân Khu</span>
          </button>

          <button
            onClick={onAddApartment}
            className="bg-accent text-white px-4 py-2 rounded-xl hover:bg-accent-hover transition-colors duration-200 font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <span>+ Thêm Căn Hộ</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="bg-surface-alt text-ink-soft hover:text-ink hover:bg-brand-border px-3.5 py-2 rounded-xl transition-colors font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <DocumentArrowDownIcon className="w-4 h-4" />
            <span>{exporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
          </button>
        </div>
      </div>

      {/* ── KPI Summary Dashboard Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatCard
          label="Tổng căn bàn giao"
          value={`${stats.total} căn`}
          subValue={`${stats.teslaCount} TESLA • ${stats.cantataCount} CANTATA`}
          subTone="accent"
          icon={BuildingOfficeIcon}
          iconBg="bg-accent-soft"
          iconColor="text-accent-ink"
        />
        <StatCard
          label="Đang ở (Lấp đầy)"
          value={`${stats.occupiedApts} căn`}
          subValue={`Tỷ lệ lấp đầy: ${stats.occupancyRate}%`}
          subTone="success"
          valueTone="success"
          icon={CheckCircleIcon}
          iconBg="bg-brand-success-soft"
          iconColor="text-brand-success"
        />
        <StatCard
          label="Chưa chuyển vào"
          value={`${stats.vacantApts} căn`}
          subValue="Đã bàn giao chờ nhận nhà"
          subTone="warning"
          valueTone="warning"
          icon={KeyIcon}
          iconBg="bg-brand-warning-soft"
          iconColor="text-brand-warning"
        />
        <StatCard
          label="Tổng nhân khẩu"
          value={`${stats.totalResidents} cư dân`}
          subValue={`~${stats.avgDensity} người/căn`}
          subTone="teal"
          valueTone="teal"
          icon={UsersIcon}
          iconBg="bg-brand-teal-soft"
          iconColor="text-brand-teal"
        />
        <StatCard
          label="Tổng giá trị BĐS"
          value={`~${stats.totalAssetValueInBillion} tỷ VNĐ`}
          subValue="100% căn đã nghiệm thu"
          subTone="accent"
          valueTone="accent"
          icon={BanknotesIcon}
          iconBg="bg-accent-soft"
          iconColor="text-accent-ink"
        />
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="bg-surface rounded-2xl shadow-sm border border-brand-border p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-faint">
              <MagnifyingGlassIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm theo mã căn (VD: TES01-01, CAN02-05), dãy block..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-faint hover:text-ink transition-colors cursor-pointer"
                title="Xóa tìm kiếm"
                aria-label="Xóa tìm kiếm"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Phase Filter Tabs */}
          <div className="flex items-center gap-1">
            {['all', 'TESLA', 'CANTATA', 'NOXH'].map((p) => (
              <button
                key={p}
                onClick={() => setFilterPhase(p)}
                aria-pressed={filterPhase === p}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors cursor-pointer ${
                  filterPhase === p
                    ? 'bg-accent text-white border-accent'
                    : 'bg-surface text-ink-soft border-brand-border hover:border-accent/40'
                }`}
              >
                {p === 'all' ? 'Tất cả phân khu' : p}
              </button>
            ))}
          </div>

          {/* Block & Status Dropdowns */}
          <div className="flex items-center gap-2">
            <select
              value={filterBlock}
              onChange={(e) => setFilterBlock(e.target.value)}
              className="text-xs border border-brand-border rounded-lg px-3 py-2 bg-surface-alt text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors cursor-pointer"
            >
              <option value="all">Tất cả Dãy/Block ({blocks.length})</option>
              {blocks.map((block) => (
                <option key={block} value={block}>
                  Dãy {block}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs border border-brand-border rounded-lg px-3 py-2 bg-surface-alt text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors cursor-pointer"
            >
                  <option value="all">Tất cả trạng thái</option>
              <option value="occupied">Đang ở ({stats.occupiedApts})</option>
              <option value="vacant">Chưa ở ({stats.vacantApts})</option>
            </select>
          </div>

        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="bg-surface rounded-2xl shadow-sm border border-brand-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-alt border-b border-brand-border text-[11px] font-semibold text-ink-soft uppercase tracking-wider">
                <th className="py-3.5 px-4">Mã Căn / Lô</th>
                <th className="py-3.5 px-4">Phân Khu & Dãy</th>
                <th className="py-3.5 px-4 text-right">4 Loại Diện Tích (m²)</th>
                <th className="py-3.5 px-4 text-right">Cơ Cấu Giá Bán (VNĐ)</th>
                <th className="py-3.5 px-4">Cư Dân Đang Sinh Sống</th>
                <th className="py-3.5 px-4 text-center">Trạng Thái BĐS</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredApartments.length > 0 ? (
                filteredApartments.map((apt) => {
                  const residentCount = getResidentCount(apt.id);
                  const residentsInApt = getResidentsInApartment(apt.id);
                  const isOccupied = residentCount > 0;
                  const phase = apt.phase_code || apt.phaseCode || (apt.code.startsWith('TES') ? 'TESLA' : 'CANTATA');
                  const block = apt.block_code || apt.blockCode || apt.code.split('-')[0];
                  
                  const landArea = Number(apt.land_area || apt.landArea || apt.area || 100);
                  const constArea = Number(apt.construction_area || apt.constructionArea || (landArea * 1.2));
                  const usableArea = Number(apt.usable_area || apt.usableArea || constArea);
                  const certArea = Number(apt.certificate_area || apt.certificateArea || landArea);

                  const landPrice = Number(apt.land_price_before_vat || apt.landPrice || 0);
                  const constPrice = Number(apt.construction_price_before_vat || apt.constructionPrice || 0);
                  const subtotal = landPrice + constPrice;
                  const vat = Math.round((subtotal * Number(apt.vat_rate || 8)) / 100);
                  const pbt = Math.round(subtotal * 0.02);
                  const total = subtotal + vat + pbt;

                  const owner = residentsInApt.find((r) => r.relationshipStatus === 'OWNER') || residentsInApt[0];

                  return (
                    <tr
                      key={apt.id}
                      className="hover:bg-surface-alt/60 transition-colors duration-150"
                    >
                      {/* Mã Căn / Lô */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <strong className="text-ink font-mono font-semibold text-sm">
                                {apt.code}
                              </strong>
                              {block && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-surface-alt text-ink-soft rounded font-mono uppercase">
                                  {block}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-ink-faint">
                              {apt.floor ? `Tầng ${apt.floor}` : 'Nhà đất'} • {apt.houseType || 'Biệt thự/Nhà phố'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Phân Khu & Dãy */}
                      <td className="py-3.5 px-4">
                        <strong className="text-ink font-bold block">{phase}</strong>
                        <span className="text-[10px] text-ink-faint block">
                          Dãy {block} • Hướng {apt.direction || 'Đông Nam'}
                        </span>
                      </td>

                      {/* 4 Loại Diện Tích */}
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        <strong className="text-ink font-bold">Đất: {landArea} m²</strong>
                        <span className="text-[10px] text-ink-faint block">
                          Sàn: {constArea} m² • SD: {usableArea} m²
                        </span>
                        <span className="text-[9px] text-brand-success font-semibold block">
                          Sổ hồng: {certArea} m²
                        </span>
                      </td>

                      {/* Cơ Cấu Giá Bán */}
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        <strong className="text-accent font-bold block">
                          {total > 0 ? `${(total / 1000000000).toFixed(2)} tỷ VNĐ` : '14.30 tỷ VNĐ'}
                        </strong>
                        <span className="text-[10px] text-ink-faint block">
                          Đất: {landPrice > 0 ? `${(landPrice / 1000000000).toFixed(1)} tỷ` : '8.5 tỷ'} + XD: {constPrice > 0 ? `${(constPrice / 1000000000).toFixed(1)} tỷ` : '4.5 tỷ'}
                        </span>
                        <span className="text-[9px] text-brand-teal font-semibold block">
                          PBT 2%: {pbt > 0 ? `${(pbt / 1000000).toFixed(0)} tr` : '260 tr'}
                        </span>
                      </td>

                      {/* Cư Dân Đang Sinh Sống */}
                      <td className="py-3.5 px-4">
                        {isOccupied ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <strong className="text-ink font-bold">
                                {owner?.name || 'Cư dân'}
                              </strong>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-brand-success-soft text-brand-success">
                                {owner?.relationshipStatus === 'OWNER' ? 'Chủ hộ' : 'Cư trú'}
                              </span>
                            </div>
                            <span className="text-[10px] text-ink-faint block font-mono">
                              {owner?.phoneNumber || 'Chưa có SĐT'}
                            </span>
                            <button
                              onClick={() => setSelectedApartmentForModal(apt)}
                              className="text-[10px] text-accent font-semibold hover:underline mt-0.5 cursor-pointer"
                            >
                              Xem tất cả {residentCount} nhân khẩu
                            </button>
                          </div>
                        ) : (
                          <div className="text-ink-faint">
                            <span className="text-[11px] italic">Chưa có người ở</span>
                            <button
                              onClick={() => setSelectedApartmentForModal(apt)}
                              className="text-[10px] text-accent font-semibold block hover:underline cursor-pointer"
                            >
                              + Gán Cư Dân
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Trạng Thái BĐS */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isOccupied ? 'bg-brand-success-soft text-brand-success' : 'bg-surface-alt text-ink-soft'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isOccupied ? 'bg-brand-success' : 'bg-ink-faint'}`}></span>
                            {isOccupied ? 'Đã Bàn Giao' : 'Chưa Bàn Giao'}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                              apt.electricityType === 'BUSINESS'
                                ? 'bg-brand-warning-soft text-brand-warning'
                                : 'bg-surface-alt text-ink-soft'
                            }`}
                          >
                            <BoltIcon className="w-2.5 h-2.5 inline" />
                            {apt.electricityType === 'BUSINESS' ? 'Điện KD' : 'Điện SH'}
                          </span>
                        </div>
                      </td>

                      {/* Thao Tác */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedApartmentDetail(apt);
                              if (onViewApartment) onViewApartment(apt);
                            }}
                            className="p-1.5 rounded-lg border border-brand-border bg-surface text-ink-soft hover:text-accent hover:border-accent/40 transition-colors cursor-pointer"
                            title="Xem chi tiết kỹ thuật & BĐS"
                            aria-label="Xem chi tiết kỹ thuật & BĐS"
                          >
                            <ViewfinderCircleIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEditApartment(apt)}
                            className="p-1.5 rounded-lg border border-brand-border bg-surface text-ink-soft hover:text-accent hover:border-accent/40 transition-colors cursor-pointer"
                            title="Chỉnh sửa thông tin căn"
                            aria-label="Chỉnh sửa thông tin căn"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 px-6 text-center text-ink-faint">
                    <BuildingOfficeIcon className="w-10 h-10 mx-auto text-ink-faint mb-2" />
                    <p className="font-bold text-ink-soft">Không tìm thấy căn hộ phù hợp bộ lọc</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Footer ── */}
        <div className="bg-surface-alt/50 border-t border-brand-border px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-ink-soft font-medium">
          <div>
            Đang hiển thị <strong className="text-ink font-bold">{filteredApartments.length}</strong> / <strong className="text-ink font-bold">{apartments.length}</strong> căn hộ đã bàn giao
          </div>
          <div className="text-[11px] text-ink-faint">
            Dữ liệu đồng bộ CRM & Quản lý Đô thị Thành Phố Cà Phê
          </div>
        </div>
      </div>

      {/* ── DETAIL MODAL (CRM & TECHNICAL PROFILE) ── */}
      {selectedApartmentDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-xl shadow-lg border border-brand-border w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-up">
            <div className="px-6 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-ink text-base flex items-center gap-2">
                  <span>Hồ Sơ BĐS Bàn Giao: {selectedApartmentDetail.code}</span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-brand-success-soft text-brand-success text-xs rounded-full font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-success"></span>
                    ĐÃ BÀN GIAO
                  </span>
                </h3>
                <span className="text-sm text-ink-soft">
                  Phân khu {selectedApartmentDetail.phase_code || selectedApartmentDetail.phaseCode || 'CANTATA'} • Dãy {selectedApartmentDetail.block_code || selectedApartmentDetail.blockCode || 'Dãy 01'}
                </span>
              </div>
              <button
                onClick={() => setSelectedApartmentDetail(null)}
                className="p-1.5 rounded-lg text-ink-faint hover:text-ink transition-colors cursor-pointer"
                aria-label="Đóng"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* 4 Area Metrics Grid */}
              <div className="p-4 bg-surface-alt/50 rounded-lg">
                <strong className="text-xs text-ink font-bold block mb-3">
                  4 Loại Diện Tích Chuẩn Hóa BĐS
                </strong>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono tabular-nums">
                  <div className="bg-surface p-2.5 rounded-xl border border-brand-border">
                    <span className="text-[10px] text-ink-faint block">Diện tích đất</span>
                    <strong className="text-sm text-ink">
                      {selectedApartmentDetail.land_area || selectedApartmentDetail.landArea || selectedApartmentDetail.area} m²
                    </strong>
                  </div>
                  <div className="bg-surface p-2.5 rounded-xl border border-brand-border">
                    <span className="text-[10px] text-ink-faint block">Diện tích sàn XD</span>
                    <strong className="text-sm text-ink">
                      {selectedApartmentDetail.construction_area || selectedApartmentDetail.constructionArea || (Number(selectedApartmentDetail.area) * 1.2)} m²
                    </strong>
                  </div>
                  <div className="bg-surface p-2.5 rounded-xl border border-brand-border">
                    <span className="text-[10px] text-ink-faint block">Diện tích sử dụng</span>
                    <strong className="text-sm text-ink">
                      {selectedApartmentDetail.usable_area || selectedApartmentDetail.usableArea || selectedApartmentDetail.construction_area} m²
                    </strong>
                  </div>
                  <div className="bg-surface p-2.5 rounded-xl border border-brand-border">
                    <span className="text-[10px] text-ink-faint block">Diện tích sổ hồng</span>
                    <strong className="text-sm text-brand-success">
                      {selectedApartmentDetail.certificate_area || selectedApartmentDetail.certificateArea || selectedApartmentDetail.land_area || selectedApartmentDetail.area} m²
                    </strong>
                  </div>
                </div>
              </div>

              {/* Two-Component Pricing Breakdown */}
              <div className="p-4 bg-surface-alt/50 rounded-lg">
                <strong className="text-xs text-ink font-bold block mb-3">
                  Cơ Cấu Giá Trị Hợp Đồng Mua Bán (2 Thành Phần)
                </strong>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono tabular-nums">
                  <div className="bg-surface p-2.5 rounded-xl border border-brand-border">
                    <span className="text-[10px] text-ink-faint block">Giá QSD Đất (trước VAT)</span>
                    <strong className="text-sm text-ink text-right block">
                      {Number(selectedApartmentDetail.land_price_before_vat || selectedApartmentDetail.landPrice || 8500000000).toLocaleString('vi-VN')} VNĐ
                    </strong>
                  </div>
                  <div className="bg-surface p-2.5 rounded-xl border border-brand-border">
                    <span className="text-[10px] text-ink-faint block">Giá Xây Dựng (trước VAT)</span>
                    <strong className="text-sm text-ink text-right block">
                      {Number(selectedApartmentDetail.construction_price_before_vat || selectedApartmentDetail.constructionPrice || 4500000000).toLocaleString('vi-VN')} VNĐ
                    </strong>
                  </div>
                  <div className="bg-surface p-2.5 rounded-xl border border-brand-border">
                    <span className="text-[10px] text-ink-faint block">Phí bảo trì 2% (PBT)</span>
                    <strong className="text-sm text-brand-teal text-right block">
                      {Number(selectedApartmentDetail.maintenance_fee_2pct || selectedApartmentDetail.maintenanceFee2pct || 260000000).toLocaleString('vi-VN')} VNĐ
                    </strong>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-brand-border flex items-center justify-between">
                  <span className="font-bold text-ink-soft">Tổng Giá Trị Bàn Giao (gồm VAT 8% & PBT 2%):</span>
                  <strong className="text-base text-accent font-bold font-mono tabular-nums">
                    {Number(selectedApartmentDetail.grand_total || selectedApartmentDetail.grandTotal || 14300000000).toLocaleString('vi-VN')} VNĐ
                  </strong>
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-surface-alt/50 rounded-lg">
                  <span className="text-[10px] text-ink-faint block">Hướng Nhà</span>
                  <strong className="font-bold text-ink">{selectedApartmentDetail.direction || 'Đông Nam'}</strong>
                </div>
                <div className="p-3 bg-surface-alt/50 rounded-lg">
                  <span className="text-[10px] text-ink-faint block">Số Phòng Ngủ</span>
                  <strong className="font-bold text-ink">{selectedApartmentDetail.bedroom_count || selectedApartmentDetail.bedroomCount || 4} PN</strong>
                </div>
                <div className="p-3 bg-surface-alt/50 rounded-lg">
                  <span className="text-[10px] text-ink-faint block">Số Phòng Tắm / WC</span>
                  <strong className="font-bold text-ink">{selectedApartmentDetail.bathroom_count || selectedApartmentDetail.bathroomCount || 4} WC</strong>
                </div>
                <div className="p-3 bg-surface-alt/50 rounded-lg">
                  <span className="text-[10px] text-ink-faint block">Số Tầng</span>
                  <strong className="font-bold text-ink">{selectedApartmentDetail.floor || 3} Tầng</strong>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-ink-faint block mb-1">Mô Tả Vị Trí & View Cảnh Quan</span>
                <p className="p-3 bg-surface-alt/50 rounded-lg text-ink-soft">
                  {selectedApartmentDetail.view_description || selectedApartmentDetail.viewDescription || 'Mặt tiền đường nội khu Zen Garden, view công viên sinh thái Cà Phê'}
                </p>
              </div>

              {/* Buttons */}
              <div className="pt-4 border-t flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const apt = selectedApartmentDetail;
                    setSelectedApartmentDetail(null);
                    setSelectedApartmentForModal(apt);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent-soft text-accent-ink rounded-xl font-bold hover:bg-accent-hover hover:text-white transition-colors cursor-pointer"
                >
                  <UsersIcon className="w-4 h-4" />
                  <span>Quản Lý Cư Dân Trong Căn</span>
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const apt = selectedApartmentDetail;
                      setSelectedApartmentDetail(null);
                      onEditApartment(apt);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-xl font-bold hover:bg-accent-hover transition-colors cursor-pointer"
                  >
                    <PencilIcon className="w-4 h-4" />
                    <span>Chỉnh Sửa Thông Tin</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resident Modal */}
      <ApartmentResidentsModal
        isOpen={!!selectedApartmentForModal}
        onClose={() => setSelectedApartmentForModal(null)}
        apartment={selectedApartmentForModal}
        residentsInApartment={
          selectedApartmentForModal ? getResidentsInApartment(selectedApartmentForModal.id) : []
        }
        allResidents={residents}
        onAddResidentToApartment={(residentId) =>
          selectedApartmentForModal &&
          onAddResidentToApartment(selectedApartmentForModal.id, residentId)
        }
        onRemoveResidentFromApartment={(residentId) =>
          selectedApartmentForModal &&
          onRemoveResidentFromApartment(selectedApartmentForModal.id, residentId)
        }
        onEditResident={onEditResident}
        onOpenEditApartmentModal={() => {
          if (selectedApartmentForModal) {
            onEditApartment(selectedApartmentForModal);
          }
        }}
      />
      <ImportApartmentModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          setIsImportModalOpen(false);
          window.location.reload();
        }}
      />
      <PhaseManagementModal
        isOpen={isPhaseModalOpen}
        onClose={() => setIsPhaseModalOpen(false)}
        onPhaseUpdated={() => window.location.reload()}
      />
    </div>
  );
};

export default ApartmentsPage;
