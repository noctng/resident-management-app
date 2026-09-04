import React, { useState, useEffect, useMemo } from 'react';
import type { Apartment, Vehicle, VehicleType } from '../types';
import {
  TruckIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ChartBarIcon,
  ArrowLeftIcon,
  BuildingOfficeIcon,
} from '../components/icons';
import { api } from '../services/api';
import SearchableSelect from '../components/SearchableSelect';
import { useToast, useConfirm } from '../components/ui';
import { EmptyState } from '../components/ui';
import { StatCard } from '../components/ui/Card';

interface VehicleManagementPageProps {
  apartments: Apartment[];
  onBack: () => void;
}

const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  CAR: 'Ô tô',
  MOTORBIKE: 'Xe máy',
};

const VEHICLE_TYPE_COLORS: Record<VehicleType, string> = {
  CAR: 'bg-accent-soft text-accent-ink',
  MOTORBIKE: 'bg-brand-teal-soft text-brand-teal',
};

// --- Add/Edit Modal ---
interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    apartmentId: string;
    vehicleType: VehicleType;
    licensePlate: string;
  }) => Promise<void>;
  apartments: Apartment[];
  editingVehicle: Vehicle | null;
}

const VehicleModal: React.FC<VehicleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  apartments,
  editingVehicle,
}) => {
  const [apartmentId, setApartmentId] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('CAR');
  const [licensePlate, setLicensePlate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editingVehicle) {
        setApartmentId(editingVehicle.apartmentId);
        setVehicleType(editingVehicle.vehicleType);
        setLicensePlate(editingVehicle.licensePlate);
      } else {
        setApartmentId('');
        setVehicleType('CAR');
        setLicensePlate('');
      }
      setError('');
    }
  }, [isOpen, editingVehicle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apartmentId || !licensePlate.trim()) {
      setError('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ apartmentId, vehicleType, licensePlate: licensePlate.trim().toUpperCase() });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Lỗi khi lưu phương tiện.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl shadow-lg border border-brand-border w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-brand-border">
          <h3 className="text-lg font-bold text-ink">
            {editingVehicle ? 'Chỉnh sửa phương tiện' : 'Thêm phương tiện mới'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-faint hover:text-ink transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-brand-danger-soft text-brand-danger p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              Căn hộ <span className="text-brand-danger">*</span>
            </label>
            <SearchableSelect
              options={apartments.map((a) => ({ value: a.id, label: a.code }))}
              value={apartmentId}
              onChange={setApartmentId}
              placeholder="Chọn căn hộ..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              Loại phương tiện <span className="text-brand-danger">*</span>
            </label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value as VehicleType)}
              className="w-full px-3 py-2.5 border border-brand-border rounded-xl bg-surface-alt text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors cursor-pointer"
            >
              <option value="CAR">Ô tô</option>
              <option value="MOTORBIKE">Xe máy</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              Biển số xe <span className="text-brand-danger">*</span>
            </label>
            <input
              type="text"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
              placeholder="VD: 30A-12345"
              className="w-full px-3 py-2.5 border border-brand-border rounded-xl bg-surface-alt text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-ink-soft bg-surface-alt rounded-xl hover:text-ink hover:bg-brand-border transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-accent rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-colors cursor-pointer"
            >
              {saving ? 'Đang lưu...' : editingVehicle ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Main Page ---
const VehicleManagementPage: React.FC<VehicleManagementPageProps> = ({ apartments, onBack }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | VehicleType>('ALL');
  const [filterApartment, setFilterApartment] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const toast = useToast();
  const { confirm } = useConfirm();

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const vehicles = await api.get<Vehicle[]>('/vehicles');
      setVehicles(vehicles);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleSave = async (data: {
    apartmentId: string;
    vehicleType: VehicleType;
    licensePlate: string;
  }) => {
    if (editingVehicle) {
      await api.put(`/vehicles/${editingVehicle.id}`, data);
    } else {
      await api.post('/vehicles', data);
    }
    await fetchVehicles();
  };

  const handleDelete = async (vehicle: Vehicle) => {
    if (
      !(await confirm({
        title: 'Xóa phương tiện',
        description: `Xác nhận xóa phương tiện biển số ${vehicle.licensePlate}?`,
        variant: 'danger',
      }))
    )
      return;
    try {
      await api.delete(`/vehicles/${vehicle.id}`);
      await fetchVehicles();
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      toast.error('Lỗi khi xóa phương tiện.');
    }
  };

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchType = filterType === 'ALL' || v.vehicleType === filterType;
      const matchApartment = filterApartment === 'all' || v.apartmentId === filterApartment;
      const search = searchTerm.toLowerCase();
      const matchSearch =
        !search ||
        v.licensePlate.toLowerCase().includes(search) ||
        v.apartmentCode?.toLowerCase().includes(search) ||
        v.ownerName?.toLowerCase().includes(search) ||
        v.ownerPhone?.includes(search);
      return matchType && matchApartment && matchSearch;
    });
  }, [vehicles, searchTerm, filterType, filterApartment]);

  // Statistics for 5 Dashboard Cards
  const stats = useMemo(() => {
    const total = vehicles.length;
    const cars = vehicles.filter((v) => v.vehicleType === 'CAR').length;
    const motorbikes = vehicles.filter((v) => v.vehicleType === 'MOTORBIKE').length;
    const carsPercent = total > 0 ? Math.round((cars / total) * 100) : 0;
    const motorbikesPercent = total > 0 ? Math.round((motorbikes / total) * 100) : 0;

    const apartmentsWithVehicles = new Set(vehicles.map((v) => v.apartmentId).filter(Boolean)).size;
    const aptPercent = apartments.length > 0 ? Math.round((apartmentsWithVehicles / apartments.length) * 100) : 0;

    return {
      total,
      cars,
      carsPercent,
      motorbikes,
      motorbikesPercent,
      apartmentsWithVehicles,
      aptPercent,
      totalApartments: apartments.length,
    };
  }, [vehicles, apartments]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-brand-border bg-surface text-ink-soft hover:text-accent hover:border-accent/40 transition-colors text-xs font-semibold cursor-pointer"
            title="Quay lại"
            aria-label="Quay lại"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Quay lại</span>
          </button>
          <div>
            <h1 className="font-serif text-3xl font-bold text-ink flex items-center gap-2">
              <TruckIcon className="w-8 h-8 text-accent" />
              Quản lý Phương tiện
            </h1>
            <p className="text-sm text-ink-soft mt-0.5">
              Danh mục định danh ô tô, xe máy và phân bổ chỗ đỗ xe của cư dân
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingVehicle(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-xl hover:bg-accent-hover transition-colors duration-200 font-semibold text-sm shadow-sm cursor-pointer"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Thêm phương tiện</span>
        </button>
      </div>

      {/* ── KPI Summary Dashboard Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <StatCard
          label="Tổng phương tiện"
          value={stats.total}
          unit="xe"
          icon={TruckIcon}
          iconBg="bg-brand-success-soft"
          iconColor="text-brand-success"
          subValue="Đã đăng ký trong tòa nhà"
          subTone="success"
        />
        <StatCard
          label="Ô tô"
          value={stats.cars}
          unit="xe"
          icon={TruckIcon}
          iconBg="bg-accent-soft"
          iconColor="text-accent-ink"
          subValue={`Chiếm ${stats.carsPercent}% tổng xe`}
          subTone="accent"
        />
        <StatCard
          label="Xe máy"
          value={stats.motorbikes}
          unit="xe"
          icon={TruckIcon}
          iconBg="bg-brand-teal-soft"
          iconColor="text-brand-teal"
          subValue={`Chiếm ${stats.motorbikesPercent}% tổng xe`}
          subTone="teal"
        />
        <StatCard
          label="Căn hộ có xe"
          value={stats.apartmentsWithVehicles}
          unit="căn"
          icon={BuildingOfficeIcon}
          iconBg="bg-brand-teal-soft"
          iconColor="text-brand-teal"
          subValue={`Đạt ${stats.aptPercent}% tổng số căn hộ`}
          subTone="teal"
        />
        <StatCard
          label="Mật độ phương tiện"
          value={`~${stats.apartmentsWithVehicles > 0 ? (stats.total / stats.apartmentsWithVehicles).toFixed(1) : 0}`}
          unit="xe/căn có xe"
          icon={ChartBarIcon}
          iconBg="bg-surface-alt"
          iconColor="text-ink-soft"
          subValue="Phục vụ cư dân tòa nhà"
          subTone="faint"
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
              placeholder="Tìm theo biển số, căn hộ, chủ sở hữu, SĐT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-9 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-faint hover:text-ink transition-colors cursor-pointer"
                title="Xóa tìm kiếm"
                aria-label="Xóa tìm kiếm"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Select Filters & Quick Type Buttons */}
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

            {/* Quick Type Filter Tabs */}
            <div className="inline-flex gap-1">
              {(['ALL', 'CAR', 'MOTORBIKE'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  aria-pressed={filterType === type}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors cursor-pointer ${
                    filterType === type
                      ? 'bg-accent text-white border-accent'
                      : 'bg-surface text-ink-soft border-brand-border hover:border-accent/40'
                  }`}
                >
                  {type === 'ALL' ? 'Tất cả' : type === 'CAR' ? 'Ô tô' : 'Xe máy'}
                </button>
              ))}
            </div>

            {/* Nút đặt lại khi có lọc */}
            {(searchTerm || filterType !== 'ALL' || filterApartment !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('ALL');
                  setFilterApartment('all');
                }}
                className="px-3 py-2 text-xs font-semibold text-brand-danger bg-brand-danger-soft hover:bg-brand-danger/20 rounded-lg transition-colors border border-brand-danger/30 whitespace-nowrap cursor-pointer"
              >
                Đặt lại
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="bg-surface rounded-xl shadow-sm border border-brand-border overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent"></div>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <EmptyState
            icon={TruckIcon}
            tone="neutral"
            title="Không tìm thấy phương tiện nào"
            description="Thử tìm kiếm với từ khóa khác hoặc thay đổi bộ lọc loại xe / căn hộ"
            size="md"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-alt border-b border-brand-border text-[11px] font-semibold text-ink-soft uppercase tracking-wider">
                  <th className="py-3.5 px-4 text-center w-14">STT</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Biển số đăng ký</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Loại phương tiện</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Căn hộ</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Chủ sở hữu</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Số điện thoại</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border text-sm">
                {filteredVehicles.map((v, idx) => (
                  <tr
                    key={v.id}
                    className="hover:bg-surface-alt/60 transition-colors duration-150"
                  >
                    {/* STT */}
                    <td className="py-3.5 px-4 text-center text-xs text-ink-faint font-mono tabular-nums">
                      {idx + 1}
                    </td>

                    {/* Biển số */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-mono font-semibold uppercase tracking-wide text-xs px-2.5 py-1 rounded-lg bg-surface-alt text-ink border border-brand-border">
                        {v.licensePlate}
                      </span>
                    </td>

                    {/* Loại phương tiện */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          VEHICLE_TYPE_COLORS[v.vehicleType]
                        }`}
                      >
                        <TruckIcon className="w-3.5 h-3.5" />
                        {VEHICLE_TYPE_LABELS[v.vehicleType]}
                      </span>
                    </td>

                    {/* Căn hộ */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono font-semibold text-xs px-2.5 py-1 rounded-lg bg-surface-alt text-ink border border-brand-border">
                        {v.apartmentCode || 'Chưa gắn căn'}
                      </span>
                    </td>

                    {/* Chủ sở hữu */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-surface-alt text-ink font-bold text-[11px] flex items-center justify-center shrink-0 border border-brand-border">
                          {v.ownerName ? v.ownerName.charAt(0).toUpperCase() : '?'}
                        </div>
                        <span className="font-medium text-ink text-sm">
                          {v.ownerName || <span className="text-ink-faint italic text-xs">Chưa cập nhật</span>}
                        </span>
                      </div>
                    </td>

                    {/* Số điện thoại */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {v.ownerPhone ? (
                        <a
                          href={`tel:${v.ownerPhone}`}
                          className="font-medium text-ink hover:text-accent hover:underline transition-colors font-mono tabular-nums"
                        >
                          {v.ownerPhone}
                        </a>
                      ) : (
                        <span className="text-ink-faint text-xs italic">Chưa cập nhật</span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingVehicle(v);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-brand-border bg-surface text-ink-soft hover:text-accent hover:border-accent/40 transition-colors cursor-pointer"
                          title="Chỉnh sửa thông tin xe"
                          aria-label="Chỉnh sửa thông tin xe"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(v)}
                          className="p-1.5 rounded-lg border border-brand-border bg-surface text-ink-soft hover:text-brand-danger hover:border-brand-danger/40 transition-colors cursor-pointer"
                          title="Xóa phương tiện"
                          aria-label="Xóa phương tiện"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Table Footer & Stats Summary ── */}
        <div className="bg-surface-alt/50 border-t border-brand-border px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-soft font-medium">
          <div className="flex items-center gap-2">
            <span>Đang hiển thị <strong className="text-ink font-bold">{filteredVehicles.length}</strong> / <strong className="text-ink font-bold">{vehicles.length}</strong> phương tiện</span>
            {filteredVehicles.length < vehicles.length && (
              <span className="bg-accent-soft text-accent-ink px-2 py-0.5 rounded-full font-semibold text-[11px]">
                Đang áp dụng bộ lọc
              </span>
            )}
          </div>
          <div className="text-[11px] text-ink-faint">
            Hệ thống quản lý phương tiện Ban Quản Lý Thành Phố Cà Phê
          </div>
        </div>
      </div>

      {/* Modal */}
      <VehicleModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingVehicle(null);
        }}
        onSave={handleSave}
        apartments={apartments}
        editingVehicle={editingVehicle}
      />
    </div>
  );
};


export default VehicleManagementPage;
