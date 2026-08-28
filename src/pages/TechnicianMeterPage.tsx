import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Apartment, UtilityRecord, User } from '../types';
import { api } from '../services/api';
import { useConfirm } from '../components/ui';
import {
  AppLogo,
  BoltIcon,
  PhotoIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpDownIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  ViewfinderCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '../components/icons';
import ImageViewerModal from '../components/ImageViewerModal';

interface TechnicianMeterPageProps {
  apartments: Apartment[];
  utilityRecords: UtilityRecord[];
  currentUser?: User | null;
  onRefreshData?: () => void;
  onBack?: () => void;
}

export const TechnicianMeterPage: React.FC<TechnicianMeterPageProps> = ({
  apartments = [],
  utilityRecords = [],
  currentUser,
  onRefreshData,
  onBack,
}) => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());

  const [activeTab, setActiveTab] = useState<'record' | 'progress' | 'history'>('record');
  const [selectedApartmentId, setSelectedApartmentId] = useState<string | null>(
    apartments[0]?.id || null
  );

  // Search & Filter in Apartment Selector
  const [selectorSearch, setSelectorSearch] = useState('');
  const [selectorFilter, setSelectorFilter] = useState<'ALL' | 'UNRECORDED' | 'RECORDED'>('ALL');
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Progress Tab Filter
  const [progressFilter, setProgressFilter] = useState<'ALL' | 'UNRECORDED' | 'RECORDED'>('UNRECORDED');
  const [progressSearch, setProgressSearch] = useState('');

  // Meter Inputs
  const [newElectricityReading, setNewElectricityReading] = useState('');
  const [newWaterReading, setNewWaterReading] = useState('');
  const [elecFile, setElecFile] = useState<File | null>(null);
  const [elecPreviewUrl, setElecPreviewUrl] = useState<string | null>(null);
  const [elecLoading, setElecLoading] = useState(false);
  const [elecDetectedCode, setElecDetectedCode] = useState<string | null>(null);

  const [waterFile, setWaterFile] = useState<File | null>(null);
  const [waterPreviewUrl, setWaterPreviewUrl] = useState<string | null>(null);
  const [waterLoading, setWaterLoading] = useState(false);
  const [waterDetectedCode, setWaterDetectedCode] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const { confirm } = useConfirm();
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Image viewer
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  // Camera & File refs
  const elecCameraRef = useRef<HTMLInputElement>(null);
  const elecGalleryRef = useRef<HTMLInputElement>(null);
  const waterCameraRef = useRef<HTMLInputElement>(null);
  const waterGalleryRef = useRef<HTMLInputElement>(null);
  const pickerContainerRef = useRef<HTMLDivElement>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Close apartment picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerContainerRef.current && !pickerContainerRef.current.contains(event.target as Node)) {
        setIsPickerOpen(false);
      }
    };
    if (isPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPickerOpen]);

  // Selected apartment object
  const selectedApartment = useMemo(() => {
    return apartments.find((apt) => apt.id === selectedApartmentId) || apartments[0] || null;
  }, [selectedApartmentId, apartments]);

  // Current index for next/prev navigation
  const currentIndex = useMemo(() => {
    if (!selectedApartment) return -1;
    return apartments.findIndex((a) => a.id === selectedApartment.id);
  }, [selectedApartment, apartments]);

  // Existing record for selected month/year
  const currentMonthRecord = useMemo(() => {
    if (!selectedApartment) return null;
    return (
      utilityRecords.find(
        (r) =>
          r.apartmentId === selectedApartment.id &&
          r.month === selectedMonth &&
          r.year === selectedYear
      ) || null
    );
  }, [selectedApartment, selectedMonth, selectedYear, utilityRecords]);

  // Previous readings (before this month/year)
  const previousReadings = useMemo(() => {
    if (!selectedApartment) return { electricity: 0, water: 0 };
    const past = utilityRecords
      .filter((r) => r.apartmentId === selectedApartment.id)
      .filter((r) => r.year < selectedYear || (r.year === selectedYear && r.month < selectedMonth))
      .sort((a, b) => b.year - a.year || b.month - a.month);

    if (past.length > 0) {
      return {
        electricity: past[0].electricity.newReading,
        water: past[0].water.newReading,
      };
    }
    return { electricity: 0, water: 0 };
  }, [selectedApartment, selectedMonth, selectedYear, utilityRecords]);

  // Set initial reading when switching apartment or month/year
  useEffect(() => {
    if (currentMonthRecord) {
      setNewElectricityReading(String(currentMonthRecord.electricity.newReading));
      setNewWaterReading(String(currentMonthRecord.water.newReading));
    } else {
      setNewElectricityReading('');
      setNewWaterReading('');
    }
    // Clean up previews
    if (elecPreviewUrl) URL.revokeObjectURL(elecPreviewUrl);
    if (waterPreviewUrl) URL.revokeObjectURL(waterPreviewUrl);
    setElecFile(null);
    setElecPreviewUrl(null);
    setWaterFile(null);
    setWaterPreviewUrl(null);
    setElecDetectedCode(null);
    setWaterDetectedCode(null);
  }, [selectedApartmentId, selectedMonth, selectedYear, currentMonthRecord]);

  // Progress summary for month
  const progressStats = useMemo(() => {
    const recordedMap = new Map<string, UtilityRecord>();
    utilityRecords.forEach((r) => {
      if (r.month === selectedMonth && r.year === selectedYear) {
        recordedMap.set(r.apartmentId, r);
      }
    });

    const total = apartments.length;
    const recorded = recordedMap.size;
    const unrecorded = total - recorded;
    const percentage = total > 0 ? Math.round((recorded / total) * 100) : 0;

    return { total, recorded, unrecorded, percentage, recordedMap };
  }, [apartments, utilityRecords, selectedMonth, selectedYear]);

  // Filtered apartments for the Selector Dropdown
  const selectorApartments = useMemo(() => {
    return apartments.filter((apt) => {
      const matchSearch =
        !selectorSearch ||
        apt.code.toLowerCase().includes(selectorSearch.toLowerCase().trim());
      const isRecorded = progressStats.recordedMap.has(apt.id);

      if (!matchSearch) return false;
      if (selectorFilter === 'RECORDED') return isRecorded;
      if (selectorFilter === 'UNRECORDED') return !isRecorded;
      return true;
    });
  }, [apartments, selectorSearch, selectorFilter, progressStats]);

  // Filtered apartments for Progress Tab
  const progressApartments = useMemo(() => {
    return apartments.filter((apt) => {
      const matchSearch =
        !progressSearch ||
        apt.code.toLowerCase().includes(progressSearch.toLowerCase().trim());
      const isRecorded = progressStats.recordedMap.has(apt.id);

      if (!matchSearch) return false;
      if (progressFilter === 'RECORDED') return isRecorded;
      if (progressFilter === 'UNRECORDED') return !isRecorded;
      return true;
    });
  }, [apartments, progressSearch, progressFilter, progressStats]);

  // AI Vision Analysis function
  const handleAnalyzeMeterImage = async (file: File, type: 'electricity' | 'water') => {
    const setLoading = type === 'electricity' ? setElecLoading : setWaterLoading;
    const setDetectedCode = type === 'electricity' ? setElecDetectedCode : setWaterDetectedCode;
    const setReading =
      type === 'electricity' ? setNewElectricityReading : setNewWaterReading;

    setLoading(true);
    showToast(`🤖 AI đang phân tích ảnh đồng hồ ${type === 'electricity' ? 'Điện' : 'Nước'}...`, 'info');

    try {
      const formData = new FormData();
      formData.append('meterImage', file);
      formData.append('meterType', type);
      formData.append('type', type);

      const res: any = await api.post('/utility-records/analyze-meter', formData);
      if (res && res.success) {
        const val =
          res.reading !== null && res.reading !== undefined
            ? res.reading
            : type === 'electricity'
            ? res.electricityReading
            : res.waterReading;

        if (val !== null && val !== undefined) {
          setReading(String(val));
          showToast(`⚡ AI nhận diện thành công: ${val} ${type === 'electricity' ? 'kWh' : 'm³'}`, 'success');
        } else {
          showToast('AI không trích xuất được số chỉ số rõ ràng. Vui lòng nhập tay.', 'error');
        }

        const detected = res.detectedCode || res.apartmentCode;
        if (detected) {
          setDetectedCode(detected);
          const cleanDetected = detected.toLowerCase().replace(/[^a-z0-9]/g, '');
          const matched = apartments.find(
            (a) => a.code.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanDetected
          );
          if (matched && matched.id !== selectedApartmentId) {
            setSelectedApartmentId(matched.id);
            showToast(`🏠 Tự động khớp căn: ${matched.code}`, 'success');
          }
        }
      }
    } catch (err: any) {
      console.warn('AI analysis error:', err);
      showToast('Không thể phân tích ảnh tự động. Vui lòng nhập số chỉ số.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'electricity' | 'water') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    if (type === 'electricity') {
      if (elecPreviewUrl) URL.revokeObjectURL(elecPreviewUrl);
      setElecFile(file);
      setElecPreviewUrl(url);
    } else {
      if (waterPreviewUrl) URL.revokeObjectURL(waterPreviewUrl);
      setWaterFile(file);
      setWaterPreviewUrl(url);
    }

    handleAnalyzeMeterImage(file, type);
    e.target.value = '';
  };

  // Calculations
  const elecOld = previousReadings.electricity;
  const elecNew = Number(newElectricityReading) || 0;
  const elecConsumption = Math.max(0, elecNew - elecOld);
  const elecInvalid = newElectricityReading !== '' && elecNew < elecOld;

  const waterOld = previousReadings.water;
  const waterNew = Number(newWaterReading) || 0;
  const waterConsumption = Math.max(0, waterNew - waterOld);
  const waterInvalid = newWaterReading !== '' && waterNew < waterOld;

  // Next / Previous Apartment Navigation
  const handlePrevApartment = () => {
    if (currentIndex > 0) {
      setSelectedApartmentId(apartments[currentIndex - 1].id);
    }
  };

  const handleNextApartment = () => {
    if (currentIndex < apartments.length - 1) {
      setSelectedApartmentId(apartments[currentIndex + 1].id);
    }
  };

  const handleNextUnrecorded = () => {
    const unrecorded = apartments.find(
      (a) => !progressStats.recordedMap.has(a.id) && a.id !== selectedApartmentId
    );
    if (unrecorded) {
      setSelectedApartmentId(unrecorded.id);
      showToast(`Chuyển đến căn chưa ghi: ${unrecorded.code}`, 'info');
    } else {
      showToast('🎉 Đã ghi đủ 100% tất cả các căn hộ trong tháng!', 'success');
    }
  };

  // Submit reading record
  const handleSaveRecord = async () => {
    if (!selectedApartment) {
      showToast('Vui lòng chọn căn hộ', 'error');
      return;
    }
    if (newElectricityReading === '' || newWaterReading === '') {
      showToast('Vui lòng nhập đầy đủ chỉ số Điện và Nước', 'error');
      return;
    }
    if (elecInvalid || waterInvalid) {
      if (
        !(await confirm({
          title: 'Chỉ số mới nhỏ hơn chỉ số cũ',
          description: 'Bạn có chắc chắn muốn lưu chỉ số này không?',
          variant: 'primary',
          confirmLabel: 'Vẫn lưu',
        }))
      ) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('apartmentId', selectedApartment.id);
      formData.append('month', String(selectedMonth));
      formData.append('year', String(selectedYear));
      formData.append('newElectricityReading', String(elecNew));
      formData.append('newWaterReading', String(waterNew));

      if (elecFile) {
        formData.append('meterImage', elecFile);
      } else if (waterFile) {
        formData.append('meterImage', waterFile);
      }

      await api.post('/utility-records', formData);
      showToast(`✓ Đã lưu chỉ số Tháng ${selectedMonth}/${selectedYear} cho ${selectedApartment.code}`, 'success');

      if (onRefreshData) onRefreshData();

      // Auto move to next unrecorded apartment
      const unrecordedList = apartments.filter(
        (a) => !progressStats.recordedMap.has(a.id) && a.id !== selectedApartment.id
      );
      if (unrecordedList.length > 0) {
        setSelectedApartmentId(unrecordedList[0].id);
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi lưu chỉ số điện nước', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getTabClass = (tabName: 'record' | 'progress' | 'history') => {
    const base =
      'flex-1 min-h-[48px] text-center font-bold border-b-2 transition-colors text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none';
    if (activeTab === tabName) {
      return `${base} text-accent border-accent`;
    }
    return `${base} text-ink-soft border-transparent hover:text-accent`;
  };

  return (
    <div className="w-full mx-auto bg-bg flex flex-col min-h-screen overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-lg font-bold text-xs flex items-center gap-2 animate-slide-down ${
            toastMessage.type === 'success'
              ? 'bg-brand-success text-white'
              : toastMessage.type === 'info'
              ? 'bg-accent text-white'
              : 'bg-brand-danger text-white'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
          ) : toastMessage.type === 'info' ? (
            <ArrowPathIcon className="w-4 h-4 flex-shrink-0" />
          ) : (
            <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      <div className="sticky top-0 z-30">
      {/* Header */}
      <header className="bg-surface/95 backdrop-blur-md border-b border-brand-border px-4 py-3 shadow-sm flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 min-w-[48px] min-h-[48px] inline-flex items-center justify-center rounded-xl border border-brand-border bg-surface text-ink-soft hover:text-accent transition-colors focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none"
              title="Quay lại"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
          )}
          <AppLogo className="w-8 h-7 sm:w-9 sm:h-8 flex-shrink-0 text-accent" />
          <div className="min-w-0">
            <h1 className="text-base font-bold text-ink truncate">
              Ghi Chỉ Số Điện Nước (Kỹ Thuật)
            </h1>
            <p className="text-xs text-ink-soft truncate">
              {currentUser?.username || 'Kỹ thuật viên'} • Kỳ Tháng {selectedMonth}/{selectedYear}
            </p>
          </div>
        </div>

        {/* Month/Year selector */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="min-h-[48px] px-3 py-2 bg-surface-alt rounded-xl text-xs font-bold text-ink border border-brand-border cursor-pointer focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                T{i + 1}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="min-h-[48px] px-3 py-2 bg-surface-alt rounded-xl text-xs font-bold text-ink border border-brand-border cursor-pointer focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
          >
            {[currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-brand-border bg-surface shadow-sm">
        <button onClick={() => setActiveTab('record')} className={getTabClass('record')}>
          <BoltIcon className="w-4 h-4" />
          <span>Ghi Chỉ Số</span>
        </button>
        <button onClick={() => setActiveTab('progress')} className={getTabClass('progress')}>
          <DocumentTextIcon className="w-4 h-4" />
          <span>Tiến Độ ({progressStats.recorded}/{progressStats.total})</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={getTabClass('history')}>
          <ClockIcon className="w-4 h-4" />
          <span>Lịch Sử</span>
        </button>
      </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow overflow-y-auto p-4 custom-scrollbar">
        <div className="max-w-md mx-auto space-y-4">
        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2.5 bg-surface-alt rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${progressStats.percentage}%` }}
            />
          </div>
          <span className="text-xs text-ink-soft font-mono tabular-nums flex-shrink-0">
            {progressStats.recorded}/{progressStats.total}
          </span>
        </div>

        {/* Hidden Camera & File Inputs */}
        <input
          ref={elecCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFileChange(e, 'electricity')}
        />
        <input
          ref={elecGalleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileChange(e, 'electricity')}
        />
        <input
          ref={waterCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFileChange(e, 'water')}
        />
        <input
          ref={waterGalleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileChange(e, 'water')}
        />

        {activeTab === 'record' && selectedApartment && (
          <div className="space-y-4 animate-fade-in">
            {/* Searchable Apartment Selector Card */}
            <div ref={pickerContainerRef} className="relative bg-surface p-4 rounded-xl border border-brand-border shadow-sm space-y-3">
              {/* Header with apartment code and status */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-ink-soft">Căn hộ:</span>
                  <span className="text-base font-black text-accent font-mono">
                    {selectedApartment.code}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                      currentMonthRecord
                        ? 'bg-brand-success-soft text-brand-success'
                        : 'bg-brand-warning-soft text-brand-warning'
                    }`}
                  >
                    {currentMonthRecord ? (
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                    ) : (
                      <ClockIcon className="w-3.5 h-3.5" />
                    )}
                    <span>{currentMonthRecord ? 'Đã ghi' : 'Chưa ghi'}</span>
                  </span>
                </div>
              </div>

              {/* Selector Button with Dropdown Trigger */}
              <button
                type="button"
                onClick={() => setIsPickerOpen(!isPickerOpen)}
                className="w-full min-h-[48px] px-3 bg-surface rounded-xl border border-brand-border flex items-center justify-between text-left cursor-pointer hover:border-accent transition-colors focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none"
              >
                <div className="flex items-center gap-2 font-mono font-bold text-sm text-ink min-w-0">
                  <BuildingOfficeIcon className="w-4 h-4 text-ink-soft flex-shrink-0" />
                  <span>{selectedApartment.code}</span>
                  {currentMonthRecord && (
                    <span className="text-[11px] font-normal text-ink-soft tabular-nums truncate">
                      ({currentMonthRecord.electricity.consumption} kWh / {currentMonthRecord.water.consumption} m³)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-ink-soft text-xs font-medium flex-shrink-0">
                  <span>Đổi căn</span>
                  <ChevronUpDownIcon className="w-4 h-4" />
                </div>
              </button>

              {/* Navigation Shortcuts Bar */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-brand-border">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevApartment}
                    disabled={currentIndex <= 0}
                    className="px-3 min-h-[48px] bg-surface hover:bg-surface-alt rounded-xl text-xs font-bold text-ink border border-brand-border inline-flex items-center gap-1 disabled:opacity-40 transition-colors focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none"
                  >
                    <ChevronLeftIcon className="w-3.5 h-3.5" />
                    <span>Căn trước</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextApartment}
                    disabled={currentIndex >= apartments.length - 1}
                    className="px-3 min-h-[48px] bg-surface hover:bg-surface-alt rounded-xl text-xs font-bold text-ink border border-brand-border inline-flex items-center gap-1 disabled:opacity-40 transition-colors focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none"
                  >
                    <span>Căn sau</span>
                    <ChevronRightIcon className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleNextUnrecorded}
                  className="px-3 min-h-[48px] bg-brand-warning hover:bg-brand-warning/90 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none"
                  title="Chuyển đến căn chưa ghi tiếp theo"
                >
                  <span>Căn chưa ghi</span>
                </button>
              </div>

              {/* Expandable Searchable Dropdown Popup */}
              {isPickerOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface rounded-2xl shadow-xl border border-brand-border z-40 p-3 space-y-2 animate-in fade-in zoom-in-95 duration-100">
                  {/* Search Bar at Top */}
                  <div className="relative">
                    <MagnifyingGlassIcon className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      autoFocus
                      value={selectorSearch}
                      onChange={(e) => setSelectorSearch(e.target.value)}
                      placeholder="Tìm nhanh theo mã căn (VD: CAN03, 01)..."
                      className="w-full pl-9 pr-10 py-3 min-h-[48px] bg-bg rounded-xl text-xs font-mono font-bold border border-brand-border focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none text-ink placeholder:text-ink-faint"
                    />
                    {selectorSearch && (
                      <button
                        onClick={() => setSelectorSearch('')}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 text-ink-faint hover:text-ink transition-colors"
                        title="Xóa tìm kiếm"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Filter Chips */}
                  <div className="flex bg-surface-alt rounded-xl p-1 text-[11px] font-bold">
                    <button
                      onClick={() => setSelectorFilter('ALL')}
                      className={`flex-1 py-3 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none ${
                        selectorFilter === 'ALL'
                          ? 'bg-surface text-accent shadow-sm'
                          : 'text-ink-soft'
                      }`}
                    >
                      Tất cả ({progressStats.total})
                    </button>
                    <button
                      onClick={() => setSelectorFilter('UNRECORDED')}
                      className={`flex-1 py-3 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none ${
                        selectorFilter === 'UNRECORDED'
                          ? 'bg-surface text-brand-warning shadow-sm'
                          : 'text-ink-soft'
                      }`}
                    >
                      Chưa ghi ({progressStats.unrecorded})
                    </button>
                    <button
                      onClick={() => setSelectorFilter('RECORDED')}
                      className={`flex-1 py-3 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none ${
                        selectorFilter === 'RECORDED'
                          ? 'bg-surface text-brand-success shadow-sm'
                          : 'text-ink-soft'
                      }`}
                    >
                      Đã ghi ({progressStats.recorded})
                    </button>
                  </div>

                  {/* Scrollable list of apartments */}
                  <div className="max-h-60 overflow-y-auto space-y-1.5 custom-scrollbar pt-1">
                    {selectorApartments.length === 0 ? (
                      <p className="text-xs text-ink-faint text-center py-4">
                        Không tìm thấy căn hộ phù hợp.
                      </p>
                    ) : (
                      selectorApartments.map((apt) => {
                        const rec = progressStats.recordedMap.get(apt.id);
                        const isSelected = apt.id === selectedApartment.id;

                        return (
                          <div
                            key={apt.id}
                            onClick={() => {
                              setSelectedApartmentId(apt.id);
                              setIsPickerOpen(false);
                              setSelectorSearch('');
                            }}
                            className={`px-3 py-3 min-h-[56px] rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-accent-soft border-accent/60'
                                : rec
                                ? 'bg-brand-success-soft/40 border-brand-border hover:border-brand-success/50'
                                : 'bg-surface border-brand-border hover:border-accent/60'
                            }`}
                          >
                            <span className="font-mono font-bold text-sm text-ink">
                              {apt.code}
                            </span>
                            {rec ? (
                              <span className="text-[11px] font-bold text-brand-success bg-brand-success-soft px-2 py-1 rounded-md inline-flex items-center gap-1">
                                <CheckCircleIcon className="w-3 h-3" />
                                <span>Đã ghi</span>
                                <span className="font-normal font-mono tabular-nums">
                                  ({rec.electricity.consumption} kWh / {rec.water.consumption} m³)
                                </span>
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-brand-warning bg-brand-warning-soft px-2 py-1 rounded-md inline-flex items-center gap-1">
                                <ClockIcon className="w-3 h-3" />
                                <span>Chưa ghi</span>
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ⚡ Electricity Meter Card */}
            <div className="bg-surface rounded-xl p-4 border border-brand-border shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-brand-border">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-brand-warning-soft text-brand-warning rounded-lg">
                    <BoltIcon className="w-5 h-5" />
                  </span>
                  <span className="font-bold text-ink text-sm">
                    Đồng Hồ Điện (kWh)
                  </span>
                </div>
                {elecDetectedCode && (
                  <span className="text-[11px] px-2 py-0.5 bg-accent-soft text-accent-ink rounded-md font-mono">
                    Tem: {elecDetectedCode}
                  </span>
                )}
              </div>

              {/* Camera & Photo Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => elecCameraRef.current?.click()}
                  disabled={elecLoading}
                  className="min-h-[48px] px-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none"
                >
                  <ViewfinderCircleIcon className="w-5 h-5" />
                  <span>Chụp Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => elecGalleryRef.current?.click()}
                  disabled={elecLoading}
                  className="min-h-[48px] px-3 bg-surface-alt hover:bg-brand-border text-ink-soft rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none"
                >
                  <PhotoIcon className="w-4 h-4" />
                  <span>Chọn Thư Viện</span>
                </button>
              </div>

              {/* Preview & Status */}
              {elecLoading ? (
                <div className="p-3 bg-accent-soft rounded-xl flex items-center justify-center gap-2 text-xs text-accent-ink">
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  <span>AI đang quét và đọc chỉ số đồng hồ điện...</span>
                </div>
              ) : elecPreviewUrl ? (
                <div className="flex items-center gap-3 p-2 bg-bg rounded-xl">
                  <img
                    src={elecPreviewUrl}
                    alt="Đồng hồ điện"
                    onClick={() => setViewingImageUrl(elecPreviewUrl)}
                    className="w-16 h-16 object-cover rounded-lg border border-brand-border cursor-pointer"
                  />
                  <div className="text-xs flex-1 min-w-0">
                    <p className="font-semibold text-ink">✓ Đã chụp ảnh đồng hồ điện</p>
                    <p className="text-ink-faint text-[11px]">Bấm vào ảnh để xem phóng to</p>
                  </div>
                  <button
                    onClick={() => {
                      URL.revokeObjectURL(elecPreviewUrl);
                      setElecPreviewUrl(null);
                      setElecFile(null);
                    }}
                    className="p-2 min-w-[48px] min-h-[48px] inline-flex items-center justify-center text-ink-faint hover:text-brand-danger rounded-xl transition-colors"
                    title="Xóa ảnh"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : null}

              {/* Reading Inputs */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-ink-soft mb-1">
                    Chỉ số cũ kỳ trước:
                  </label>
                  <div className="px-3 py-2.5 min-h-[48px] bg-surface-alt rounded-xl font-mono font-bold text-ink text-sm flex items-center justify-end tabular-nums">
                    {elecOld}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-ink-soft mb-1">
                    Chỉ số mới kỳ này (*):
                  </label>
                  <input
                    type="number"
                    value={newElectricityReading}
                    onChange={(e) => setNewElectricityReading(e.target.value)}
                    placeholder="Nhập hoặc chụp AI..."
                    className={`w-full px-3 py-2.5 min-h-[48px] rounded-xl font-mono font-bold text-sm text-right border outline-none transition-colors placeholder:text-ink-faint ${
                      elecInvalid
                        ? 'border-brand-danger bg-brand-danger-soft/40 text-brand-danger focus:ring-2 focus:ring-brand-danger/30'
                        : 'border-brand-border bg-surface text-ink focus:ring-2 focus:ring-accent/30 focus:border-accent'
                    }`}
                  />
                </div>
              </div>

              {/* Consumption summary */}
              <div className="flex items-center justify-between gap-2 text-xs px-3 py-2 bg-surface-alt rounded-lg">
                <span className="text-ink-soft">Tiêu thụ điện:</span>
                <span className={`font-bold font-mono tabular-nums ${elecInvalid ? 'text-brand-danger' : 'text-ink'}`}>
                  {elecConsumption} <span className="text-xs font-normal text-ink-soft">kWh</span>
                  {elecInvalid && <span className="text-brand-danger"> (Nhỏ hơn chỉ số cũ)</span>}
                </span>
              </div>
            </div>

            {/* 💧 Water Meter Card */}
            <div className="bg-surface rounded-xl p-4 border border-brand-border shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-brand-border">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-brand-teal-soft text-brand-teal rounded-lg text-xs font-bold">
                    Nước
                  </span>
                  <span className="font-bold text-ink text-sm">
                    Đồng Hồ Nước (m³)
                  </span>
                </div>
                {waterDetectedCode && (
                  <span className="text-[11px] px-2 py-0.5 bg-accent-soft text-accent-ink rounded-md font-mono">
                    Tem: {waterDetectedCode}
                  </span>
                )}
              </div>

              {/* Camera & Photo Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => waterCameraRef.current?.click()}
                  disabled={waterLoading}
                  className="min-h-[48px] px-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none"
                >
                  <ViewfinderCircleIcon className="w-5 h-5" />
                  <span>Chụp Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => waterGalleryRef.current?.click()}
                  disabled={waterLoading}
                  className="min-h-[48px] px-3 bg-surface-alt hover:bg-brand-border text-ink-soft rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none"
                >
                  <PhotoIcon className="w-4 h-4" />
                  <span>Chọn Thư Viện</span>
                </button>
              </div>

              {/* Preview & Status */}
              {waterLoading ? (
                <div className="p-3 bg-brand-teal-soft rounded-xl flex items-center justify-center gap-2 text-xs text-brand-teal">
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  <span>AI đang quét và đọc chỉ số đồng hồ nước...</span>
                </div>
              ) : waterPreviewUrl ? (
                <div className="flex items-center gap-3 p-2 bg-bg rounded-xl">
                  <img
                    src={waterPreviewUrl}
                    alt="Đồng hồ nước"
                    onClick={() => setViewingImageUrl(waterPreviewUrl)}
                    className="w-16 h-16 object-cover rounded-lg border border-brand-border cursor-pointer"
                  />
                  <div className="text-xs flex-1 min-w-0">
                    <p className="font-semibold text-ink">✓ Đã chụp ảnh đồng hồ nước</p>
                    <p className="text-ink-faint text-[11px]">Bấm vào ảnh để xem phóng to</p>
                  </div>
                  <button
                    onClick={() => {
                      URL.revokeObjectURL(waterPreviewUrl);
                      setWaterPreviewUrl(null);
                      setWaterFile(null);
                    }}
                    className="p-2 min-w-[48px] min-h-[48px] inline-flex items-center justify-center text-ink-faint hover:text-brand-danger rounded-xl transition-colors"
                    title="Xóa ảnh"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : null}

              {/* Reading Inputs */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-ink-soft mb-1">
                    Chỉ số cũ kỳ trước:
                  </label>
                  <div className="px-3 py-2.5 min-h-[48px] bg-surface-alt rounded-xl font-mono font-bold text-ink text-sm flex items-center justify-end tabular-nums">
                    {waterOld}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-ink-soft mb-1">
                    Chỉ số mới kỳ này (*):
                  </label>
                  <input
                    type="number"
                    value={newWaterReading}
                    onChange={(e) => setNewWaterReading(e.target.value)}
                    placeholder="Nhập hoặc chụp AI..."
                    className={`w-full px-3 py-2.5 min-h-[48px] rounded-xl font-mono font-bold text-sm text-right border outline-none transition-colors placeholder:text-ink-faint ${
                      waterInvalid
                        ? 'border-brand-danger bg-brand-danger-soft/40 text-brand-danger focus:ring-2 focus:ring-brand-danger/30'
                        : 'border-brand-border bg-surface text-ink focus:ring-2 focus:ring-accent/30 focus:border-accent'
                    }`}
                  />
                </div>
              </div>

              {/* Consumption summary */}
              <div className="flex items-center justify-between gap-2 text-xs px-3 py-2 bg-surface-alt rounded-lg">
                <span className="text-ink-soft">Tiêu thụ nước:</span>
                <span className={`font-bold font-mono tabular-nums ${waterInvalid ? 'text-brand-danger' : 'text-ink'}`}>
                  {waterConsumption} <span className="text-xs font-normal text-ink-soft">m³</span>
                  {waterInvalid && <span className="text-brand-danger"> (Nhỏ hơn chỉ số cũ)</span>}
                </span>
              </div>
            </div>

            {/* Bottom Sticky Save Action */}
            <div className="pt-2 sticky bottom-3 z-20">
              <button
                type="button"
                onClick={handleSaveRecord}
                disabled={submitting}
                className="w-full min-h-[52px] bg-accent hover:bg-accent-hover text-white rounded-xl font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none"
              >
                {submitting ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    <span>Đang lưu và tải ảnh lên server...</span>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    <span>Lưu Chỉ Số {selectedApartment.code}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Progress & Full List */}
        {activeTab === 'progress' && (
          <div className="space-y-4 animate-fade-in">
            {/* Search and Filters */}
            <div className="flex flex-col gap-2">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={progressSearch}
                  onChange={(e) => setProgressSearch(e.target.value)}
                  placeholder="Tìm theo mã căn (VD: CAN03-01)..."
                  className="w-full pl-9 pr-3 py-3 min-h-[48px] bg-surface rounded-xl text-xs font-mono font-bold border border-brand-border focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none text-ink placeholder:text-ink-faint"
                />
              </div>

              <div className="flex bg-surface-alt rounded-xl p-1 text-xs font-semibold">
                <button
                  onClick={() => setProgressFilter('UNRECORDED')}
                  className={`flex-1 py-3 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none ${
                    progressFilter === 'UNRECORDED'
                      ? 'bg-surface text-brand-warning shadow-sm'
                      : 'text-ink-soft'
                  }`}
                >
                  Chưa ghi ({progressStats.unrecorded})
                </button>
                <button
                  onClick={() => setProgressFilter('RECORDED')}
                  className={`flex-1 py-3 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none ${
                    progressFilter === 'RECORDED'
                      ? 'bg-surface text-brand-success shadow-sm'
                      : 'text-ink-soft'
                  }`}
                >
                  Đã ghi ({progressStats.recorded})
                </button>
                <button
                  onClick={() => setProgressFilter('ALL')}
                  className={`flex-1 py-3 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none ${
                    progressFilter === 'ALL'
                      ? 'bg-surface text-accent shadow-sm'
                      : 'text-ink-soft'
                  }`}
                >
                  Tất cả ({progressStats.total})
                </button>
              </div>
            </div>

            {/* List of Apartments */}
            <div className="grid grid-cols-1 gap-2.5">
              {progressApartments.map((apt) => {
                const rec = progressStats.recordedMap.get(apt.id);
                const isRecorded = !!rec;

                return (
                  <div
                    key={apt.id}
                    onClick={() => {
                      setSelectedApartmentId(apt.id);
                      setActiveTab('record');
                    }}
                    className={`p-4 min-h-[56px] rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-3 active:border-accent/60 ${
                      isRecorded
                        ? 'bg-brand-success-soft/40 border-brand-border hover:border-brand-success/50'
                        : 'bg-surface border-brand-border hover:border-accent/60'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isRecorded ? 'bg-brand-success' : 'bg-brand-warning'}`} />
                        <span className="font-bold text-sm text-ink font-mono">
                          {apt.code}
                        </span>
                        {isRecorded ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-success-soft text-brand-success font-bold flex-shrink-0">
                            Đã ghi
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-warning-soft text-brand-warning font-bold flex-shrink-0">
                            Chưa ghi
                          </span>
                        )}
                      </div>
                      {isRecorded && rec ? (
                        <p className="text-[11px] text-ink-soft mt-1 font-mono tabular-nums pl-4">
                          Điện {rec.electricity.consumption} kWh • Nước {rec.water.consumption} m³
                        </p>
                      ) : (
                        <p className="text-[11px] text-ink-faint mt-1 pl-4">Chưa ghi chỉ số kỳ này</p>
                      )}
                    </div>

                    <button
                      className={`min-h-[48px] px-4 text-xs font-bold rounded-xl inline-flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
                        isRecorded
                          ? 'bg-surface-alt text-ink-soft'
                          : 'bg-accent text-white hover:bg-accent-hover'
                      }`}
                    >
                      {isRecorded ? 'Sửa' : 'Ghi'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: History of selected apartment */}
        {activeTab === 'history' && selectedApartment && (
          <div className="space-y-3 animate-fade-in">
            <h3 className="text-sm font-bold text-ink flex items-center justify-between">
              <span>Lịch sử: <strong className="font-mono">{selectedApartment.code}</strong></span>
              <span className="text-xs text-ink-soft">Tất cả các kỳ</span>
            </h3>

            {utilityRecords.filter((r) => r.apartmentId === selectedApartment.id).length === 0 ? (
              <p className="text-xs text-ink-soft py-8 text-center bg-surface-alt rounded-xl">
                Chưa có lịch sử ghi điện nước nào cho căn hộ này.
              </p>
            ) : (
              <div className="space-y-2.5">
                {utilityRecords
                  .filter((r) => r.apartmentId === selectedApartment.id)
                  .sort((a, b) => b.year - a.year || b.month - a.month)
                  .map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-surface p-4 rounded-xl border border-brand-border shadow-sm space-y-2 text-xs"
                    >
                      <div className="flex justify-between items-center gap-2 pb-1.5 border-b border-brand-border font-bold">
                        <span className="text-ink">
                          Tháng {rec.month}/{rec.year}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rec.paymentStatus === 'PAID'
                              ? 'bg-brand-success-soft text-brand-success'
                              : 'bg-brand-danger-soft text-brand-danger'
                          }`}
                        >
                          {rec.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-ink-soft">
                        <div className="p-2 bg-brand-warning-soft/50 rounded-lg">
                          <p className="font-bold text-brand-warning">Điện</p>
                          <p className="font-mono tabular-nums text-ink">{rec.electricity.oldReading} → {rec.electricity.newReading} ({rec.electricity.consumption} kWh)</p>
                        </div>
                        <div className="p-2 bg-brand-teal-soft/50 rounded-lg">
                          <p className="font-bold text-brand-teal">Nước</p>
                          <p className="font-mono tabular-nums text-ink">{rec.water.oldReading} → {rec.water.newReading} ({rec.water.consumption} m³)</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
        </div>
      </main>

      {/* Image viewer modal */}
      <ImageViewerModal
        isOpen={!!viewingImageUrl}
        onClose={() => setViewingImageUrl(null)}
        imageUrl={viewingImageUrl}
      />
    </div>
  );
};

export default TechnicianMeterPage;
