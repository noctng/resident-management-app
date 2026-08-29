import React, { useState, useMemo } from 'react';
import type { Apartment, Resident, Occupancy } from '../types';
import {
  PencilIcon,
  ViewfinderCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  TrashIcon,
  UsersIcon,
  UserPlusIcon,
  KeyIcon,
  SparklesIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
} from '../components/icons';
import { api } from '../services/api';
import ResidentApartmentsModal from '../components/ResidentApartmentsModal';
import ImportResidentModal from '../components/ImportResidentModal';
import { DocumentArrowUpIcon } from '../components/icons';
import { useToast } from '../components/ui';
import { StatCard } from '../components/ui/Card';

interface ResidentsPageProps {
  residents: Resident[];
  apartments: Apartment[];
  occupancies: Occupancy[];
  onAddResident: () => void;
  onEditResident: (resident: Resident) => void;
  onViewResident: (resident: Resident) => void;
  onAddApartmentToResident: (apartmentId: string, residentId: string) => void;
  onRemoveApartmentFromResident: (apartmentId: string, residentId: string) => void;
  onUpdateResidentStatus: (residentId: string, isActive: boolean) => void;
  onUpdateAmenityAccess: (residentId: string, canUseAmenities: boolean) => void;
  isAdmin?: boolean;
  onDeleteResident?: (residentId: string) => Promise<void>;
}

const ResidentsPage: React.FC<ResidentsPageProps> = ({
  residents,
  apartments,
  occupancies,
  onAddResident,
  onEditResident,
  onViewResident,
  onAddApartmentToResident,
  onRemoveApartmentFromResident,
  onUpdateResidentStatus,
  onUpdateAmenityAccess,
  isAdmin = false,
  onDeleteResident,
}) => {
  const [filterApartment, setFilterApartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResidentForModal, setSelectedResidentForModal] = useState<Resident | null>(null);
  const [selectedResidentForDelete, setSelectedResidentForDelete] = useState<Resident | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const toast = useToast();

  // Thống kê nhanh cho Dashboard Cards
  const stats = useMemo(() => {
    const total = residents ? residents.length : 0;
    const owners = residents.filter((r) => r.relationshipStatus === 'OWNER').length;
    const family = residents.filter((r) => r.relationshipStatus === 'FAMILY').length;
    const tenants = residents.filter((r) => r.relationshipStatus === 'TENANT').length;
    const active = residents.filter((r) => r.isActive !== false).length;
    const inactive = total - active;
    const amenityAllowed = residents.filter((r) => r.canUseAmenities).length;
    const withPhone = residents.filter((r) => r.phoneNumber && r.phoneNumber.trim().length > 0).length;

    return {
      total,
      owners,
      ownersPercent: total > 0 ? Math.round((owners / total) * 100) : 0,
      family,
      tenants,
      familyAndTenants: family + tenants,
      active,
      inactive,
      activePercent: total > 0 ? Math.round((active / total) * 100) : 0,
      amenityAllowed,
      amenityPercent: total > 0 ? Math.round((amenityAllowed / total) * 100) : 0,
      withPhone,
    };
  }, [residents]);

  // Defensive check
  if (!residents || !apartments || !occupancies) {
    return <div className="p-4 text-center text-ink-soft">Đang tải dữ liệu...</div>;
  }


  // Get apartments for a resident
  const getResidentApartments = (residentId: string) => {
    const residentOccupancies = occupancies.filter((occ) => occ.residentId === residentId);
    const residentApartments = residentOccupancies
      .map((occ) => apartments.find((apt) => apt.id === occ.apartmentId))
      .filter((apt): apt is Apartment => !!apt);
    return residentApartments;
  };

  // Helper for normalizing strings (removing accents) for search
  const normalizeString = (str: string) => {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  };

  // Filter residents
  const filteredResidents = residents.filter((res) => {
    const residentApartments = getResidentApartments(res.id);
    const apartmentIds = residentApartments.map((apt) => apt.id);

    const matchesApartment = filterApartment === 'all' || apartmentIds.includes(filterApartment);
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && res.isActive) ||
      (filterStatus === 'inactive' && !res.isActive);

    const searchNorm = normalizeString(searchQuery);
    const nameNorm = normalizeString(res.name);
    const idNorm = normalizeString(res.idNumber);

    const matchesSearch =
      searchQuery === '' ||
      nameNorm.includes(searchNorm) ||
      idNorm.includes(searchNorm) ||
      (res.phoneNumber && res.phoneNumber.includes(searchQuery));

    return matchesApartment && matchesStatus && matchesSearch;
  });

  // Get relationship badge
  const getRelationshipBadge = (status: string) => {
    const badges = {
      OWNER: {
        class: 'bg-accent-soft text-accent-ink',
        dot: 'bg-accent',
        label: 'Chủ hộ',
      },
      FAMILY: {
        class: 'bg-brand-teal-soft text-brand-teal',
        dot: 'bg-brand-teal',
        label: 'Gia đình',
      },
      TENANT: {
        class: 'bg-brand-warning-soft text-brand-warning',
        dot: 'bg-brand-warning',
        label: 'Thuê',
      },
    };
    return badges[status as keyof typeof badges] || badges.FAMILY;
  };

  const ghostIconBtn =
    'p-1.5 rounded-lg border border-brand-border bg-surface text-ink-soft hover:text-accent hover:border-accent/40 transition-colors cursor-pointer';

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const blob = await api.download('/reports/residents', {}, 'GET');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Danh_sach_cu_dan.xlsx`);
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

    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-ink">Quản lý Cư dân</h1>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onAddResident}
            className="bg-accent text-white px-3.5 py-2.5 rounded-lg hover:bg-accent-hover transition-colors duration-200 font-medium text-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
          >
            <span>+ Thêm cư dân</span>
          </button>
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2.5 rounded-lg border border-brand-border bg-surface text-ink font-medium text-xs flex items-center gap-1.5 min-h-[40px] hover:border-accent/40 hover:text-accent transition-colors duration-200 cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-accent/40"
            title="Import danh sách cư dân từ file Excel"
          >
            <DocumentArrowUpIcon className="w-4 h-4" />
            <span>Import Excel</span>
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="px-4 py-2.5 rounded-lg border border-brand-border bg-surface text-ink font-medium flex items-center gap-2 min-h-[44px] hover:border-accent/40 hover:text-accent transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40"
            aria-label="Xuất Excel"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
            {exporting ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
        </div>
      </div>

      {/* ── KPI Summary Dashboard Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <StatCard
          label="Tổng cư dân"
          value={stats.total}
          unit="người"
          icon={UsersIcon}
          iconBg="bg-brand-success-soft"
          iconColor="text-brand-success"
          subValue={`${stats.withPhone} cư dân có SĐT`}
          subTone="success"
        />
        <StatCard
          label="Chủ hộ"
          value={stats.owners}
          unit="chủ hộ"
          icon={KeyIcon}
          iconBg="bg-accent-soft"
          iconColor="text-accent-ink"
          subValue={`Chiếm ${stats.ownersPercent}% tổng nhân khẩu`}
          subTone="accent"
        />
        <StatCard
          label="Gia đình & Thuê"
          value={stats.familyAndTenants}
          unit="người"
          icon={UserPlusIcon}
          iconBg="bg-brand-teal-soft"
          iconColor="text-brand-teal"
          subValue={`${stats.family} người thân • ${stats.tenants} thuê`}
          subTone="teal"
        />
        <StatCard
          label="Tiện ích VIP"
          value={stats.amenityAllowed}
          unit="cư dân"
          icon={SparklesIcon}
          iconBg="bg-brand-warning-soft"
          iconColor="text-brand-warning"
          subValue={`Đạt ${stats.amenityPercent}% được cấp quyền`}
          subTone="warning"
        />
        <StatCard
          label="Đang hoạt động"
          value={stats.active}
          unit="đang ở"
          icon={CheckCircleIcon}
          iconBg="bg-brand-success-soft"
          iconColor="text-brand-success"
          subValue={stats.inactive > 0 ? `${stats.inactive} tạm vắng / dừng HĐ` : 'Tất cả đang sinh sống'}
          subTone="neutral"
          className="col-span-2 sm:col-span-1 lg:col-span-1"
        />
      </div>


      {/* ── Filter & Search Toolbar ── */}
      <div className="bg-surface rounded-xl shadow-sm border border-brand-border p-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-faint">
              <MagnifyingGlassIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Tìm theo tên, số điện thoại, CCCD..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-faint hover:text-ink-soft transition-colors cursor-pointer"
                title="Xóa tìm kiếm"
                aria-label="Xóa tìm kiếm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Select Filters */}
          <div className="flex flex-wrap sm:flex-nowrap gap-2.5 items-center">
            {/* Filter Căn hộ */}
            <div className="min-w-[170px] flex-1 sm:flex-initial">
              <select
                value={filterApartment}
                onChange={(e) => setFilterApartment(e.target.value)}
                className="w-full text-sm border border-brand-border rounded-lg px-3 py-2 bg-surface-alt text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors font-medium cursor-pointer"
              >
                <option value="all">Tất cả căn hộ ({apartments.length})</option>
                {apartments.map((apt) => (
                  <option key={apt.id} value={apt.id}>
                    Căn {apt.code}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Trạng thái */}
            <div className="min-w-[160px] flex-1 sm:flex-initial">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full text-sm border border-brand-border rounded-lg px-3 py-2 bg-surface-alt text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors font-medium cursor-pointer"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Không hoạt động</option>
              </select>
            </div>

            {/* Nút đặt lại khi có lọc */}
            {(searchQuery || filterApartment !== 'all' || filterStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterApartment('all');
                  setFilterStatus('all');
                }}
                className="px-3 py-2 text-xs font-semibold text-brand-danger bg-brand-danger-soft hover:bg-brand-danger hover:text-white rounded-lg transition-colors duration-200 border border-brand-danger/30 whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                Đặt lại
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="bg-surface rounded-xl shadow-sm border border-brand-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-alt border-b border-brand-border text-[11px] font-semibold text-ink-soft uppercase tracking-wider">
                <th className="py-3.5 px-5">Họ và tên</th>
                <th className="py-3.5 px-4 whitespace-nowrap">CCCD / Định danh</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Số điện thoại</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Căn hộ trực thuộc</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Quan hệ</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Trạng thái</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60 text-sm">
              {filteredResidents.length > 0 ? (
                filteredResidents.map((resident) => {
                  const residentApartments = getResidentApartments(resident.id);
                  const badge = getRelationshipBadge(resident.relationshipStatus);

                  return (
                    <tr
                      key={resident.id}
                      className="hover:bg-surface-alt/60 transition-colors duration-150"
                    >
                      {/* Họ tên */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <span className="w-9 h-9 rounded-full bg-accent-soft text-accent-ink font-bold flex items-center justify-center shrink-0">
                            {resident.name.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <div className="font-semibold text-ink leading-tight">
                              {resident.name}
                            </div>
                            {resident.canUseAmenities && (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-brand-warning mt-0.5">
                                <SparklesIcon className="w-3 h-3 inline" /> VIP Tiện ích
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* CCCD */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {resident.idNumber ? (
                          <span className="font-mono text-xs font-medium px-2 py-1 rounded bg-surface-alt text-ink-soft border border-brand-border">
                            {resident.idNumber}
                          </span>
                        ) : (
                          <span className="text-ink-soft text-xs italic">Chưa cập nhật</span>
                        )}
                      </td>

                      {/* SĐT */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {resident.phoneNumber ? (
                          <a
                            href={`tel:${resident.phoneNumber}`}
                            className="font-mono text-xs text-ink-soft hover:text-accent hover:underline transition-colors"
                          >
                            {resident.phoneNumber}
                          </a>
                        ) : (
                          <span className="text-ink-soft text-xs italic">Chưa cập nhật</span>
                        )}
                      </td>

                      {/* Căn hộ */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedResidentForModal(resident)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-soft text-accent-ink hover:bg-accent-hover/20 font-semibold text-xs transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40"
                          title="Bấm để xem hoặc đổi căn hộ"
                          aria-label={`Xem ${residentApartments.length} căn hộ của ${resident.name}`}
                        >
                          <BuildingOfficeIcon className="w-3.5 h-3.5" />
                          <span>{residentApartments.length} căn hộ</span>
                        </button>
                      </td>

                      {/* Quan hệ */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${badge.class}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            resident.isActive
                              ? 'bg-brand-success-soft text-brand-success'
                              : 'bg-brand-warning-soft text-brand-warning'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${resident.isActive ? 'bg-brand-success' : 'bg-brand-warning'}`} />
                          {resident.isActive ? 'Hoạt động' : 'Tạm vắng'}
                        </span>
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onViewResident(resident)}
                            className={ghostIconBtn}
                            title="Xem chi tiết cư dân"
                            aria-label="Xem chi tiết cư dân"
                          >
                            <ViewfinderCircleIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEditResident(resident)}
                            className={ghostIconBtn}
                            title="Chỉnh sửa thông tin"
                            aria-label="Chỉnh sửa thông tin cư dân"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => setSelectedResidentForDelete(resident)}
                              className={`${ghostIconBtn} hover:text-brand-danger hover:border-brand-danger/40`}
                              title="Xóa cư dân"
                              aria-label="Xóa cư dân"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 px-6 text-center text-ink-soft">
                    <div className="max-w-xs mx-auto text-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-surface-alt flex items-center justify-center mx-auto text-ink-soft">
                        <UsersIcon className="w-6 h-6" />
                      </div>
                      <div className="font-semibold text-ink">Không tìm thấy kết quả phù hợp</div>
                      <div className="text-xs text-ink-soft">Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn các bộ lọc</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Footer & Stats Summary ── */}
        <div className="bg-surface-alt border-t border-brand-border px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-soft font-medium">
          <div className="flex items-center gap-2">
            <span>Đang hiển thị <strong className="text-ink font-bold">{filteredResidents.length}</strong> / <strong className="text-ink font-bold">{residents.length}</strong> cư dân</span>
            {filteredResidents.length < residents.length && (
              <span className="bg-accent-soft text-accent-ink px-2 py-0.5 rounded-full font-semibold text-[11px]">
                Đang áp dụng bộ lọc
              </span>
            )}
          </div>
          <div className="text-[11px] text-ink-soft">
            Dữ liệu cư dân Ban Quản Lý Thành Phố Cà Phê
          </div>
        </div>
      </div>


      {/* Resident Apartments Modal */}
      <ResidentApartmentsModal
        isOpen={!!selectedResidentForModal}
        onClose={() => setSelectedResidentForModal(null)}
        resident={selectedResidentForModal}
        apartmentsOfResident={
          selectedResidentForModal ? getResidentApartments(selectedResidentForModal.id) : []
        }
        allApartments={apartments}
        onAddApartmentToResident={(apartmentId) =>
          selectedResidentForModal &&
          onAddApartmentToResident(apartmentId, selectedResidentForModal.id)
        }
        onRemoveApartmentFromResident={(apartmentId) =>
          selectedResidentForModal &&
          onRemoveApartmentFromResident(apartmentId, selectedResidentForModal.id)
        }
        onOpenEditResidentModal={() => {
          if (selectedResidentForModal) {
            onEditResident(selectedResidentForModal);
          }
        }}
        onUpdateResidentStatus={onUpdateResidentStatus}
        onUpdateAmenityAccess={onUpdateAmenityAccess}
      />

      {/* Custom Delete Resident Confirmation Modal */}
      {selectedResidentForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-2xl max-w-md w-full shadow-elevation-raised border border-brand-border overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="bg-brand-danger-soft p-5 border-b border-brand-danger/20 flex items-center gap-3">
              <span className="p-2.5 bg-surface rounded-xl text-brand-danger">
                <TrashIcon className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-ink">
                  Xác nhận xóa cư dân
                </h3>
                <p className="text-xs text-brand-danger font-medium">
                  Hành động nguy hiểm, không thể hoàn tác
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-ink-soft">
                Bạn có chắc chắn muốn xóa cư dân{' '}
                <strong className="text-ink">
                  {selectedResidentForDelete.name}
                </strong>{' '}
                (CCCD: {selectedResidentForDelete.idNumber}) không?
              </p>

              {/* OWNER check warning */}
              {selectedResidentForDelete.relationshipStatus === 'OWNER' ? (
                <div className="p-4 bg-brand-warning-soft border border-brand-warning/30 rounded-xl space-y-2">
                  <p className="text-sm font-semibold text-brand-warning flex items-center gap-1.5">
                    <ExclamationTriangleIcon className="w-4 h-4 inline" /> Không thể xóa cư dân này
                  </p>
                  <p className="text-xs text-ink-soft leading-relaxed">
                    Cư dân này hiện đang là <strong>Chủ sở hữu (Chủ hộ)</strong> của căn hộ. Hệ
                    thống không cho phép xóa Chủ hộ để tránh ảnh hưởng đến việc thanh toán hóa đơn.
                    Vui lòng chuyển quyền chủ hộ sang thành viên khác trước khi thực hiện xóa.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-surface-alt rounded-xl space-y-2 border border-brand-border">
                  <p className="text-xs font-semibold text-ink">
                    Ảnh hưởng dữ liệu khi xóa:
                  </p>
                  <ul className="text-xs text-ink-soft space-y-1.5 list-disc list-inside">
                    <li>
                      Tài khoản Portal cư dân sẽ bị <strong>xóa vĩnh viễn</strong>.
                    </li>
                    <li>Liên kết căn hộ hiện tại sẽ bị xóa bỏ.</li>
                    <li>
                      Lịch sử phản ánh (Feedback) sẽ được giữ lại dưới danh nghĩa{' '}
                      <strong className="text-ink">"Cư dân đã xóa"</strong>.
                    </li>
                    <li>
                      Lịch sử đặt chỗ tiện ích sẽ được <strong>ẩn danh tính</strong> người đặt.
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-surface-alt p-4 border-t border-brand-border flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedResidentForDelete(null)}
                disabled={deleting}
                className="px-4 py-2 bg-surface text-ink-soft border border-brand-border rounded-lg hover:bg-surface-alt hover:text-ink transition-colors duration-200 font-medium text-sm disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                Hủy bỏ
              </button>
              {selectedResidentForDelete.relationshipStatus !== 'OWNER' && (
                <button
                  type="button"
                  disabled={deleting}
                  onClick={async () => {
                    if (!onDeleteResident) return;
                    setDeleting(true);
                    try {
                      await onDeleteResident(selectedResidentForDelete.id);
                      setSelectedResidentForDelete(null);
                    } catch (error: any) {
                      toast.error(error.message || 'Lỗi khi xóa cư dân');
                    } finally {
                      setDeleting(false);
                    }
                  }}
                  className="px-4 py-2 bg-brand-danger hover:bg-brand-danger/90 text-white rounded-lg transition-colors duration-200 font-medium text-sm flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  {deleting ? 'Đang xóa...' : 'Xác nhận xóa'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <ImportResidentModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          setIsImportModalOpen(false);
          window.location.reload();
        }}
      />
    </div>
  );
};

export default ResidentsPage;
