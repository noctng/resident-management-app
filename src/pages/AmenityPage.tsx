import React, { useState, useMemo, useEffect } from 'react';
import type { Apartment, AmenityUsage, AmenityType, AmenityBookingData } from '../types';
import AmenityManager from '../components/AmenityManager';
import type { AmenityLimitConfig } from '../components/AmenityManager';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ViewfinderCircleIcon,
  QrCodeIcon,
  TicketIcon,
  ChartBarIcon,
  CalendarIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  PencilIcon,
  TrashIcon,
} from '../components/icons';
import SearchableSelect from '../components/SearchableSelect';
import BookAmenityModal from '../components/BookAmenityModal';
import QRCodeScannerModal from '../components/QRCodeScannerModal';
import BookingConfirmationModal from '../components/BookingConfirmationModal';
import AmenityStats from '../components/AmenityStats';
import { api } from '../services/api';
import { useToast, useConfirm } from '../components/ui';

interface AmenityPageProps {
  apartments: Apartment[];
  amenityUsages: AmenityUsage[];
  onAddAmenityUsage: (
    apartmentId: string,
    amenity: AmenityType,
    bookingData: AmenityBookingData,
    residentId?: string
  ) => Promise<AmenityUsage>;
  onUpdateAmenityStatus: (usageId: string, newStatus: 'USED' | 'CANCELLED') => void;
  onUpdateAmenityBooking?: (
    usageId: string,
    data: Partial<AmenityBookingData & { amenity: AmenityType; status: string }>
  ) => Promise<AmenityUsage>;
  onDeleteAmenityBooking?: (usageId: string) => Promise<void>;
  onBack: () => void;
  onRefetchAmenityUsages: () => Promise<void>;
  isAmenityListLoading: boolean;
  isManagerView?: boolean;
}

const AMENITY_NAMES: Record<AmenityType, string> = {
  GOLF_3D: 'Golf 3D',
  HORSE_RIDING: 'Cưỡi ngựa Ả Rập',
  MUSEUM: 'Thăm quan bảo tàng',
  ZEN_GARDEN: 'Thăm quan vườn Zen',
  SAUNA: 'Xông Hơi',
  ARCHERY: 'Bắn Cung',
  GYM: 'Gym',
  YOGA: 'Yoga',
};

const translateStatus = (status: AmenityUsage['status']) => {
  switch (status) {
    case 'PENDING':
      return 'Chờ xác nhận';
    case 'USED':
      return 'Đã sử dụng';
    case 'CANCELLED':
      return 'Đã hủy';
    default:
      return status;
  }
};

const getStatusBadgeClass = (status: AmenityUsage['status']) => {
  switch (status) {
    case 'PENDING':
      return 'bg-brand-warning-soft text-brand-warning';
    case 'USED':
      return 'bg-brand-teal-soft text-brand-teal';
    case 'CANCELLED':
      return 'bg-brand-danger-soft text-brand-danger';
    default:
      return 'bg-surface-alt text-ink-soft';
  }
};

const getStatusDotClass = (status: AmenityUsage['status']) => {
  switch (status) {
    case 'PENDING':
      return 'bg-brand-warning';
    case 'USED':
      return 'bg-brand-teal';
    case 'CANCELLED':
      return 'bg-brand-danger';
    default:
      return 'bg-ink-faint';
  }
};

type DetailedAmenityUsage = AmenityUsage & { apartmentCode?: string };

const AMENITY_OPTIONS: { value: AmenityType; label: string }[] = [
  { value: 'GOLF_3D', label: 'Golf 3D' },
  { value: 'HORSE_RIDING', label: 'Cưỡi ngựa Ả Rập' },
  { value: 'MUSEUM', label: 'Thăm quan bảo tàng' },
  { value: 'ZEN_GARDEN', label: 'Thăm quan vườn Zen' },
  { value: 'SAUNA', label: 'Xông Hơi' },
  { value: 'ARCHERY', label: 'Bắn Cung' },
  { value: 'GYM', label: 'Gym' },
  { value: 'YOGA', label: 'Yoga' },
];

interface EditBookingModalProps {
  booking: AmenityUsage;
  apartments: Apartment[];
  onClose: () => void;
  onSave: (
    data: Partial<AmenityBookingData & { amenity: AmenityType; status: string }>
  ) => Promise<void>;
}

const EditBookingModal: React.FC<EditBookingModalProps> = ({ booking, onClose, onSave }) => {
  const getCurrentTimes = () => {
    const now = new Date();
    const startH = String(now.getHours()).padStart(2, '0');
    const startM = String(now.getMinutes()).padStart(2, '0');
    const start = `${startH}:${startM}`;
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    let endH = String(end.getHours()).padStart(2, '0');
    let endM = String(end.getMinutes()).padStart(2, '0');
    if (end.getDate() !== now.getDate()) {
      endH = '23';
      endM = '59';
    }
    return { start, end: `${endH}:${endM}` };
  };

  const defaultTimes = getCurrentTimes();
  const [amenity, setAmenity] = useState<AmenityType>(booking.amenity);
  const [usageDate, setUsageDate] = useState(booking.usageDate);
  const [startTime, setStartTime] = useState(booking.startTime || defaultTimes.start);
  const [endTime, setEndTime] = useState(booking.endTime || defaultTimes.end);
  const [status, setStatus] = useState<string>(booking.status);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (endTime <= startTime) {
      setError('Thời gian kết thúc phải sau thời gian bắt đầu.');
      setIsSubmitting(false);
      return;
    }

    try {
      await onSave({ amenity, usageDate, startTime, endTime, status });
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle =
    'mt-1 block w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-brand-border rounded-2xl shadow-elevation-raised w-full max-w-md animate-slide-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-accent p-4 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <PencilIcon className="w-5 h-5" />
            Chỉnh sửa đặt lịch
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Mã đặt lịch
            </label>
            <input
              type="text"
              value={booking.bookingCode || ''}
              disabled
              className="mt-1 block w-full px-3 py-2 border border-brand-border rounded-lg bg-surface-alt text-ink-soft text-sm cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Tiện ích
            </label>
            <select
              value={amenity}
              onChange={(e) => setAmenity(e.target.value as AmenityType)}
              className={inputStyle}
            >
              {AMENITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Ngày sử dụng
            </label>
            <input
              type="date"
              value={usageDate}
              onChange={(e) => setUsageDate(e.target.value)}
              className={inputStyle}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">
                Giờ bắt đầu
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">
                Giờ kết thúc
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={inputStyle}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Trạng thái
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={inputStyle}
            >
              <option value="PENDING">Chờ xác nhận</option>
              <option value="USED">Đã sử dụng</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>

          {error && (
            <p className="text-sm text-brand-danger bg-brand-danger-soft p-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-ink bg-surface border border-brand-border rounded-lg hover:bg-surface-alt hover:border-accent/40 transition-colors duration-200 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-accent hover:bg-accent-hover rounded-lg shadow-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-wait cursor-pointer"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AmenityPage: React.FC<AmenityPageProps> = ({
  apartments,
  amenityUsages,
  onAddAmenityUsage,
  onUpdateAmenityStatus,
  onUpdateAmenityBooking,
  onDeleteAmenityBooking,
  onBack,
  onRefetchAmenityUsages,
  isAmenityListLoading,
  isManagerView = false,
}) => {
  const [selectedApartmentId, setSelectedApartmentId] = useState<string | null>(
    apartments[0]?.id || null
  );
  const [isBookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedAmenity, setSelectedAmenity] = useState<AmenityType | null>(null);
  const [isScannerOpen, setScannerOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<AmenityUsage | null>(null);
  const [scannedUsage, setScannedUsage] = useState<DetailedAmenityUsage | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [viewingStatAmenity, setViewingStatAmenity] = useState<AmenityType | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [amenityLimits, setAmenityLimits] = useState<Record<string, AmenityLimitConfig> | null>(
    null
  );
  const toast = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const data = (await api.get('/config/amenity-limits')) as Record<
          string,
          AmenityLimitConfig
        >;
        setAmenityLimits(data);
      } catch (err) {
        console.error('Failed to fetch amenity limits:', err);
      }
    };
    fetchLimits();
  }, []);

  const pendingBookings = amenityUsages.filter((u) => u.status === 'PENDING');
  const pendingCount = pendingBookings.length;

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const blob = await api.download(`/amenity-usage/export?month=${selectedDate}`, {}, 'GET');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `BaoCaoTienIch_${selectedDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Xuất báo cáo thất bại: ' + (error.message || 'Lỗi server'));
    } finally {
      setIsExporting(false);
    }
  };

  const getDetailUsages = () => {
    if (!viewingStatAmenity) return [];
    return amenityUsages
      .filter(
        (u) =>
          u.amenity === viewingStatAmenity &&
          u.usageDate.startsWith(selectedDate) &&
          u.status === 'USED'
      )
      .sort((a, b) => new Date(b.usageDate).getTime() - new Date(a.usageDate).getTime());
  };

  const usagesForSelectedApartment = useMemo(() => {
    if (!selectedApartmentId) return [];
    return amenityUsages
      .filter((u) => u.apartmentId === selectedApartmentId)
      .sort((a, b) => {
        const dateDiff = new Date(b.usageDate).getTime() - new Date(a.usageDate).getTime();
        if (dateDiff !== 0) return dateDiff;
        if (!a.startTime || !b.startTime) return 0;
        return a.startTime.localeCompare(b.startTime);
      });
  }, [selectedApartmentId, amenityUsages]);

  const apartmentOptions = apartments.map((apt) => ({
    value: apt.id,
    label: apt.code,
  }));

  const handleOpenBookingModal = (amenity: AmenityType) => {
    setSelectedAmenity(amenity);
    setBookingModalOpen(true);
  };

  const handleCloseBookingModal = () => {
    setBookingModalOpen(false);
    setSelectedAmenity(null);
  };

  const handleBookAmenity = (bookingData: AmenityBookingData) => {
    if (selectedApartmentId && selectedAmenity) {
      return onAddAmenityUsage(selectedApartmentId, selectedAmenity, bookingData);
    }
    return Promise.reject(new Error('Vui lòng chọn căn hộ trước khi đặt lịch.'));
  };

  const handleScanSuccess = (bookingCode: string) => {
    setScannerOpen(false);
    const foundUsage = amenityUsages.find(
      (u) => u.bookingCode.trim().toLowerCase() === bookingCode.trim().toLowerCase()
    );

    if (foundUsage) {
      const apartmentCode =
        apartments.find((a) => a.id === foundUsage.apartmentId)?.code || 'Không rõ';
      setSelectedApartmentId(foundUsage.apartmentId);
      setScannedUsage({ ...foundUsage, apartmentCode });
    } else {
      toast.error(`Không tìm thấy đặt chỗ với mã: ${bookingCode}`);
    }
  };

  return (
    <div className="bg-surface rounded-xl shadow-sm border border-brand-border h-full flex flex-col animate-fade-in overflow-hidden">
      <header className="px-6 py-5 border-b border-brand-border bg-surface-alt/50 flex items-center justify-between shrink-0 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          {!isManagerView && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg border border-brand-border text-ink-soft hover:text-ink hover:border-accent/40 hover:bg-surface-alt focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none transition-colors duration-200 cursor-pointer"
              aria-label="Go back"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-ink flex items-center gap-2">
              <span className="p-1.5 bg-accent-soft rounded-lg shadow-sm">
                <TicketIcon className="w-5 h-5 text-accent-ink" />
              </span>
              Quản Lý Tiện Ích
            </h1>
            <p className="text-sm text-ink-soft">
              Theo dõi, đặt lịch và quản lý sử dụng tiện ích
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setScannerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-accent hover:bg-accent-hover rounded-xl shadow-sm hover:shadow-md focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none transition-all duration-200 cursor-pointer"
          >
            <ViewfinderCircleIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Quét QR</span>
          </button>

          <button
            onClick={() => setIsPendingModalOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer border ${
              pendingCount > 0
                ? 'bg-brand-warning-soft border-brand-warning/40 text-brand-warning hover:shadow-md'
                : 'bg-surface border-brand-border text-ink-soft hover:bg-surface-alt'
            }`}
          >
            <div className="relative">
              {pendingCount > 0 && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-warning/60 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${pendingCount > 0 ? 'bg-brand-warning' : 'bg-ink-faint'}`}
              ></span>
            </div>
            <span className="hidden sm:inline">Đang chờ ({pendingCount})</span>
            <span className="sm:hidden">({pendingCount})</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-surface border border-brand-border text-ink rounded-xl hover:bg-surface-alt hover:border-accent/40 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-wait cursor-pointer"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
            <span className="hidden sm:inline">{isExporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
          </button>
        </div>
      </header>

      <div className="flex-grow flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
        <div className="p-6 pb-0 space-y-6">
          {/* Stats Section */}
          <div className="bg-surface-alt rounded-xl p-5 border border-brand-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                <ChartBarIcon className="w-5 h-5 text-ink-soft" />
                Thống kê sử dụng
              </h2>
              <div className="flex items-center gap-2 bg-surface rounded-lg p-1 border border-brand-border">
                <span className="text-xs font-semibold text-ink-soft  px-2">
                  Tháng:
                </span>
                <input
                  type="month"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-sm font-medium border-none bg-transparent focus:ring-0 text-ink  cursor-pointer"
                />
              </div>
            </div>
            <AmenityStats
              amenityUsages={amenityUsages.filter((u) => u.usageDate.startsWith(selectedDate))}
              amenityNames={AMENITY_NAMES}
              onAmenityClick={setViewingStatAmenity}
              amenityLimits={amenityLimits}
            />
          </div>

          {/* Main Content Area */}
          {selectedApartmentId ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6">
              {/* Amenity Manager (Left Column - Expanded) */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-ink ">Đặt Tiện Ích</h3>
                  {/* Apartment Selector */}
                  <div className="w-40">
                    <SearchableSelect
                      value={selectedApartmentId || ''}
                      onChange={setSelectedApartmentId}
                      options={apartmentOptions}
                      placeholder={apartments.length > 0 ? 'Chọn căn hộ...' : 'Không có căn hộ'}
                      disabled={apartments.length === 0}
                    />
                  </div>
                </div>

                <div className="bg-surface  rounded-xl border border-brand-border  overflow-hidden shadow-sm h-full">
                  <AmenityManager
                    key={selectedApartmentId}
                    apartmentId={selectedApartmentId}
                    amenityUsages={usagesForSelectedApartment}
                    onBook={handleOpenBookingModal}
                    amenityLimits={amenityLimits}
                  />
                </div>
              </div>

              {/* Booking History (Right Column - Reduced) */}
              <div className="lg:col-span-1 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-ink ">
                    Lịch sử Đặt chỗ
                  </h3>
                  <button
                    onClick={onRefetchAmenityUsages}
                    disabled={isAmenityListLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100    disabled:opacity-50 disabled:cursor-wait transition-colors border border-primary-100 "
                  >
                    <ArrowPathIcon
                      className={`w-3.5 h-3.5 ${isAmenityListLoading ? 'animate-spin' : ''}`}
                    />
                    <span>Làm mới</span>
                  </button>
                </div>

                <div className="bg-surface  rounded-xl border border-brand-border  overflow-hidden shadow-sm flex-grow min-h-[400px]">
                  {usagesForSelectedApartment.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                      <div className="bg-surface-alt  p-4 rounded-full mb-3">
                        <TicketIcon className="w-8 h-8 text-ink-faint" />
                      </div>
                      <p className="text-ink-soft  font-medium">
                        Chưa có lượt đặt chỗ nào cho căn hộ này.
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-brand-border  overflow-y-auto max-h-[600px] custom-scrollbar">
                      {usagesForSelectedApartment.map((usage) => (
                        <li
                          key={usage.id}
                          className="p-4 hover:bg-surface-alt/60  transition-colors duration-150 group"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-ink  text-base">
                                  {AMENITY_NAMES[usage.amenity]}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${getStatusBadgeClass(usage.status)}`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotClass(usage.status)}`} />
                                  {translateStatus(usage.status)}
                                </span>
                              </div>
                              <div className="text-sm text-ink-soft  flex items-center gap-3">
                                <span className="flex items-center gap-1.5">
                                  <CalendarIcon className="w-3.5 h-3.5" />
                                  {new Date(usage.usageDate + 'T00:00:00').toLocaleDateString(
                                    'vi-VN'
                                  )}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <ClockIcon className="w-3.5 h-3.5" />
                                  {usage.startTime} - {usage.endTime}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1.5">
                                {usage.residentName && (
                                  <span className="text-xs text-ink-soft  flex items-center gap-1">
                                    User:{' '}
                                    <span className="font-medium text-ink ">
                                      {usage.residentName}
                                    </span>
                                  </span>
                                )}
                                <span className="text-xs text-ink-soft  font-mono bg-surface-alt  px-1.5 rounded">
                                  #{usage.bookingCode}
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 self-start sm:self-center opacity-0 group-hover:opacity-100 transition-opacity">
                              {usage.status === 'PENDING' && (
                                <>
                                  <button
                                    onClick={() => onUpdateAmenityStatus(usage.id, 'USED')}
                                    className="bg-brand-success text-white hover:brightness-95 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer"
                                  >
                                    Duyệt
                                  </button>
                                  <button
                                    onClick={() => onUpdateAmenityStatus(usage.id, 'CANCELLED')}
                                    className="bg-brand-danger text-white hover:brightness-95 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer"
                                  >
                                    Hủy
                                  </button>
                                </>
                              )}
                              {onUpdateAmenityBooking && (
                                <button
                                  onClick={() => setEditingBooking(usage)}
                                  className="p-1.5 rounded-lg text-ink-soft hover:text-accent hover:bg-accent-soft transition-colors duration-200 cursor-pointer"
                                  title="Chỉnh sửa"
                                  aria-label="Chỉnh sửa đặt lịch"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </button>
                              )}
                              {onDeleteAmenityBooking && (
                                <button
                                  onClick={async () => {
                                    if (
                                      !(await confirm({
                                        title: 'Xóa đặt lịch',
                                        description: `Xóa đặt lịch ${usage.bookingCode}?`,
                                        variant: 'danger',
                                      }))
                                    )
                                      return;
                                    onDeleteAmenityBooking(usage.id).catch((err) => {
                                      toast.error('Xóa thất bại: ' + (err.message || 'Lỗi'));
                                    });
                                  }}
                                  className="p-1.5 rounded-lg text-ink-soft hover:text-brand-danger hover:bg-brand-danger-soft transition-colors duration-200 cursor-pointer"
                                  title="Xóa"
                                  aria-label="Xóa đặt lịch"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
              <div className="bg-surface-alt  p-6 rounded-full mb-4 animate-pulse">
                <TicketIcon className="w-12 h-12 text-ink-faint" />
              </div>
              <h3 className="text-xl font-bold text-ink  mb-2">
                Chưa chọn căn hộ
              </h3>
              <p className="text-ink-soft  max-w-md">
                Vui lòng chọn một căn hộ từ danh sách để xem thông tin đặt chỗ và quản lý tiện ích.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Pending Bookings */}
      {isPendingModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setIsPendingModalOpen(false)}
        >
          <div
            className="bg-surface border border-brand-border rounded-2xl shadow-elevation-raised w-full max-w-2xl max-h-[85vh] flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-brand-border  flex justify-between items-center bg-surface-alt rounded-t-2xl">
              <h3 className="text-lg font-bold text-brand-warning  flex items-center gap-2">
                <span className="p-1 bg-brand-warning-soft text-brand-warning rounded-md">
                  <TicketIcon className="w-4 h-4" />
                </span>
                Danh sách Đặt chỗ Đang chờ
              </h3>
              <button
                onClick={() => setIsPendingModalOpen(false)}
                className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-surface transition-colors duration-200 cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto custom-scrollbar flex-grow bg-surface-alt">
              {pendingBookings.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-ink-soft  font-medium">
                    Không có đặt chỗ nào đang chờ.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingBookings.map((booking) => {
                    const aptCode =
                      apartments.find((a) => a.id === booking.apartmentId)?.code || 'N/A';
                    const amenityName = AMENITY_NAMES[booking.amenity];
                    return (
                      <div
                        key={booking.id}
                        className="bg-surface  border border-brand-border  rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex flex-col sm:flex-row justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="bg-surface-alt  text-ink  px-2 py-0.5 rounded-md font-bold text-sm">
                                {aptCode}
                              </span>
                              <span className="text-sm text-ink-soft  font-medium">
                                {booking.residentName || 'N/A'}
                              </span>
                            </div>
                            <h4 className="text-lg font-bold text-accent  mb-1">
                              {amenityName}
                            </h4>
                            <div className="text-sm text-ink-soft  flex items-center gap-3">
                              <span className="flex items-center gap-1.5">
                                <CalendarIcon className="w-3.5 h-3.5" />{' '}
                                {new Date(booking.usageDate).toLocaleDateString('vi-VN')}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <ClockIcon className="w-3.5 h-3.5" /> {booking.startTime} -{' '}
                                {booking.endTime}
                              </span>
                            </div>
                          </div>

                          <div className="flex sm:flex-col gap-2 justify-end sm:justify-center border-t sm:border-t-0 sm:border-l border-brand-border  pt-3 sm:pt-0 sm:pl-4 mt-2 sm:mt-0">
                            <button
                              onClick={async () => {
                                if (
                                  await confirm({
                                    title: 'Duyệt đặt chỗ',
                                    description: `Xác nhận cư dân ${booking.residentName} bắt đầu sử dụng ${amenityName}?`,
                                    variant: 'primary',
                                  })
                                ) {
                                  onUpdateAmenityStatus(booking.id, 'USED');
                                }
                              }}
                              className="flex-1 sm:flex-none px-4 py-2 bg-brand-success text-white hover:brightness-95 text-sm font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                            >
                              Duyệt
                            </button>
                            <button
                              onClick={async () => {
                                if (
                                  await confirm({
                                    title: 'Hủy đặt chỗ',
                                    description: `Hủy đặt chỗ của ${booking.residentName}?`,
                                    variant: 'danger',
                                  })
                                ) {
                                  onUpdateAmenityStatus(booking.id, 'CANCELLED');
                                }
                              }}
                              className="flex-1 sm:flex-none px-4 py-2 bg-surface border border-brand-border text-ink hover:bg-surface-alt hover:border-accent/40 text-sm font-bold rounded-lg shadow-sm transition-colors duration-200 cursor-pointer"
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {viewingStatAmenity && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setViewingStatAmenity(null)}
        >
          <div
            className="bg-surface border border-brand-border rounded-2xl shadow-elevation-raised w-full max-w-2xl max-h-[85vh] flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-brand-border  flex justify-between items-center bg-surface-alt rounded-t-2xl">
              <h3 className="text-lg font-bold text-accent  flex items-center gap-2">
                <span className="p-1 bg-accent-soft text-accent-ink rounded-md">
                  <ChartBarIcon className="w-4 h-4" />
                </span>
                Chi tiết: {AMENITY_NAMES[viewingStatAmenity]}
              </h3>
              <button
                onClick={() => setViewingStatAmenity(null)}
                className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-surface transition-colors duration-200 cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto custom-scrollbar flex-grow bg-surface-alt">
              {getDetailUsages().length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-ink-soft ">
                    Chưa có lượt sử dụng nào trong tháng này.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getDetailUsages().map((u) => {
                    const aptCode = apartments.find((a) => a.id === u.apartmentId)?.code || 'N/A';
                    return (
                      <div
                        key={u.id}
                        className="bg-surface  border border-brand-border  rounded-xl p-4 flex justify-between items-center shadow-sm"
                      >
                        <div>
                          <div className="flex items-center gap-2 font-bold text-ink ">
                            <span className="bg-surface-alt  px-2 py-0.5 rounded text-sm">
                              {aptCode}
                            </span>
                            <span className="font-normal text-ink-soft  text-sm">
                              {u.residentName}
                            </span>
                          </div>
                          <div className="text-sm text-ink-soft  mt-1 flex items-center gap-3">
                            <span className="flex items-center gap-1.5">
                              <CalendarIcon className="w-3.5 h-3.5" />{' '}
                              {new Date(u.usageDate).toLocaleDateString('vi-VN')}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <ClockIcon className="w-3.5 h-3.5" /> {u.startTime} - {u.endTime}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs font-bold px-3 py-1.5 rounded-lg bg-brand-teal-soft text-brand-teal">
                          Đã sử dụng
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedAmenity && (
        <BookAmenityModal
          isOpen={isBookingModalOpen}
          onClose={handleCloseBookingModal}
          onBook={handleBookAmenity}
          amenityType={selectedAmenity}
        />
      )}
      <QRCodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
      <BookingConfirmationModal
        isOpen={!!scannedUsage}
        onClose={() => setScannedUsage(null)}
        usage={scannedUsage}
        onConfirm={(usageId) => onUpdateAmenityStatus(usageId, 'USED')}
        onCancel={(usageId) => onUpdateAmenityStatus(usageId, 'CANCELLED')}
      />

      {/* Edit Booking Modal */}
      {editingBooking && onUpdateAmenityBooking && (
        <EditBookingModal
          booking={editingBooking}
          apartments={apartments}
          onClose={() => setEditingBooking(null)}
          onSave={async (data) => {
            await onUpdateAmenityBooking(editingBooking.id, data);
            setEditingBooking(null);
          }}
        />
      )}
    </div>
  );
};

export default AmenityPage;
