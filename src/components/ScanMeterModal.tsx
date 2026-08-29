import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Apartment, UtilityRecord } from '../types';
import {
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
  ViewfinderCircleIcon,
  ArrowRightIcon,
} from './icons';
import { api } from '../services/api';
import { useConfirm } from './ui';
import ImageViewerModal from './ImageViewerModal';

interface ScanMeterModalProps {
  isOpen: boolean;
  onClose: () => void;
  apartments: Apartment[];
  utilityRecords: UtilityRecord[];
  initialApartmentId?: string | null;
  initialMonth?: number;
  initialYear?: number;
  onRecordAdded: () => void;
}

const ScanMeterModal: React.FC<ScanMeterModalProps> = ({
  isOpen,
  onClose,
  apartments = [],
  utilityRecords = [],
  initialApartmentId,
  initialMonth,
  initialYear,
  onRecordAdded,
}) => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(
    initialMonth || currentDate.getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    initialYear || currentDate.getFullYear()
  );

  const [selectedApartmentId, setSelectedApartmentId] = useState<string | null>(
    initialApartmentId || apartments[0]?.id || null
  );

  // Search & Filter in Apartment Selector
  const [selectorSearch, setSelectorSearch] = useState('');
  const [selectorFilter, setSelectorFilter] = useState<'ALL' | 'UNRECORDED' | 'RECORDED'>('ALL');
  const [isPickerOpen, setIsPickerOpen] = useState(false);

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

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      const prev = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.documentElement.style.overflow = prev;
      };
    }
  }, [isOpen]);

  // Sync initial values when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialApartmentId) setSelectedApartmentId(initialApartmentId);
      if (initialMonth) setSelectedMonth(initialMonth);
      if (initialYear) setSelectedYear(initialYear);
    }
  }, [isOpen, initialApartmentId, initialMonth, initialYear]);

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

  // Clean up on close
  useEffect(() => {
    if (!isOpen) {
      if (elecPreviewUrl) URL.revokeObjectURL(elecPreviewUrl);
      if (waterPreviewUrl) URL.revokeObjectURL(waterPreviewUrl);
      setElecFile(null);
      setElecPreviewUrl(null);
      setWaterFile(null);
      setWaterPreviewUrl(null);
      setElecDetectedCode(null);
      setWaterDetectedCode(null);
      setIsPickerOpen(false);
      setSelectorSearch('');
    }
  }, [isOpen]);

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

  // AI Vision Analysis function
  const handleAnalyzeMeterImage = async (file: File, type: 'electricity' | 'water') => {
    const setLoading = type === 'electricity' ? setElecLoading : setWaterLoading;
    const setDetectedCode = type === 'electricity' ? setElecDetectedCode : setWaterDetectedCode;
    const setReading =
      type === 'electricity' ? setNewElectricityReading : setNewWaterReading;

    setLoading(true);
    showToast(`🤖 AI đang quét và đọc ảnh đồng hồ ${type === 'electricity' ? 'Điện' : 'Nước'}...`, 'info');

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
      showToast('Không thể phân tích ảnh tự động. Vui lòng nhập chỉ số bằng tay.', 'error');
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

      onRecordAdded();

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

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-60 px-4 py-2.5 rounded-xl shadow-elevation-overlay font-bold text-xs flex items-center gap-2 animate-bounce-in ${
            toastMessage.type === 'success'
              ? 'bg-brand-success text-white'
              : toastMessage.type === 'info'
              ? 'bg-accent text-white'
              : 'bg-brand-danger text-white'
          }`}
        >
          <span>{toastMessage.type === 'success' ? '✓' : toastMessage.type === 'info' ? 'ℹ️' : '⚠️'}</span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Hidden File / Camera Inputs */}
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

      {/* Modal Dialog Card */}
      <div className="bg-surface w-full max-w-2xl rounded-2xl shadow-elevation-overlay border border-brand-border flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border bg-surface-alt/50 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-accent rounded-xl text-white">
              <BoltIcon className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink">
                Quét AI & Ghi Chỉ Số Điện Nước
              </h2>
              <p className="text-sm text-ink-soft">
                Tiến độ: <strong>{progressStats.recorded}/{progressStats.total}</strong> căn hộ đã ghi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Month/Year selector */}
            <div className="flex items-center gap-1">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-2 py-1 bg-surface-alt rounded-lg text-xs font-bold text-ink border border-brand-border focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
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
                className="px-2 py-1 bg-surface-alt rounded-lg text-xs font-bold text-ink border border-brand-border focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              >
                {[currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onClose}
              aria-label="Đóng"
              className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-surface-alt transition-colors cursor-pointer"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 custom-scrollbar flex-1">
          {selectedApartment && (
            <>
              {/* Searchable Apartment Picker Card */}
              <div ref={pickerContainerRef} className="relative bg-surface-alt p-3.5 rounded-2xl border border-brand-border space-y-2.5">
                {/* Header with apartment code and status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink-soft">Căn hộ:</span>
                    <span className="text-base font-black text-ink font-mono tabular-nums">
                      {selectedApartment.code}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                        currentMonthRecord
                          ? 'bg-brand-success-soft text-brand-success'
                          : 'bg-brand-warning-soft text-brand-warning'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${currentMonthRecord ? 'bg-brand-success' : 'bg-brand-warning'}`} />
                      <span>{currentMonthRecord ? 'Đã ghi' : 'Chưa ghi'}</span>
                    </span>
                  </div>
                </div>

                {/* Selector Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(!isPickerOpen)}
                  className="w-full px-3 py-2 bg-surface rounded-lg border border-brand-border flex items-center justify-between text-left cursor-pointer hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 transition-colors duration-200"
                >
                  <div className="flex items-center gap-2 font-mono font-bold text-sm text-ink">
                    <BuildingOfficeIcon className="w-4 h-4 text-ink-soft" />
                    <span>{selectedApartment.code}</span>
                    {currentMonthRecord && (
                      <span className="text-[11px] font-normal text-brand-success">
                        ({currentMonthRecord.electricity.consumption} kWh / {currentMonthRecord.water.consumption} m³)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-ink-soft text-xs font-medium">
                    <span>Đổi căn</span>
                    <ChevronUpDownIcon className="w-4 h-4" />
                  </div>
                </button>

                {/* Navigation Shortcuts Bar */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-brand-border ">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handlePrevApartment}
                      disabled={currentIndex <= 0}
                      className="px-2.5 py-1.5 bg-surface hover:bg-surface-alt rounded-lg text-xs font-bold text-ink border border-brand-border flex items-center gap-1 disabled:opacity-40 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                      <ChevronLeftIcon className="w-3.5 h-3.5" />
                      <span>Căn trước</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNextApartment}
                      disabled={currentIndex >= apartments.length - 1}
                      className="px-2.5 py-1.5 bg-surface hover:bg-surface-alt rounded-lg text-xs font-bold text-ink border border-brand-border flex items-center gap-1 disabled:opacity-40 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                      <span>Căn sau</span>
                      <ChevronRightIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextUnrecorded}
                    className="px-2.5 py-1.5 bg-brand-warning hover:brightness-95 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    title="Chuyển đến căn chưa ghi tiếp theo"
                  >
                    <span>Căn chưa ghi</span>
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Expandable Searchable Dropdown Popup */}
                {isPickerOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border z-40 p-3 space-y-2 animate-in fade-in zoom-in-95 duration-100">
                    {/* Search Bar at Top */}
                    <div className="relative">
                      <MagnifyingGlassIcon className="w-4 h-4 text-ink-soft absolute left-3 top-3" />
                      <input
                        type="text"
                        autoFocus
                        value={selectorSearch}
                        onChange={(e) => setSelectorSearch(e.target.value)}
                        placeholder="Tìm nhanh theo mã căn (VD: CAN03, 01)..."
                        className="w-full pl-9 pr-8 py-2 bg-surface-alt rounded-lg text-xs font-mono font-bold border border-brand-border text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                      />
                      {selectorSearch && (
                        <button
                          onClick={() => setSelectorSearch('')}
                          className="absolute right-2.5 top-2.5 text-ink-soft hover:text-ink cursor-pointer"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Filter Chips */}
                    <div className="flex bg-surface-alt rounded-lg p-1 text-[11px] font-bold">
                      <button
                        onClick={() => setSelectorFilter('ALL')}
                        className={`flex-1 py-1 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                          selectorFilter === 'ALL'
                            ? 'bg-surface text-accent-ink shadow-sm'
                            : 'text-ink-soft'
                        }`}
                      >
                        Tất cả ({progressStats.total})
                      </button>
                      <button
                        onClick={() => setSelectorFilter('UNRECORDED')}
                        className={`flex-1 py-1 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                          selectorFilter === 'UNRECORDED'
                            ? 'bg-surface text-brand-warning shadow-sm'
                            : 'text-ink-soft'
                        }`}
                      >
                        Chưa ghi ({progressStats.unrecorded})
                      </button>
                      <button
                        onClick={() => setSelectorFilter('RECORDED')}
                        className={`flex-1 py-1 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                          selectorFilter === 'RECORDED'
                            ? 'bg-surface text-brand-success shadow-sm'
                            : 'text-ink-soft'
                        }`}
                      >
                        Đã ghi ({progressStats.recorded})
                      </button>
                    </div>

                    {/* Scrollable list of apartments */}
                    <div className="max-h-56 overflow-y-auto space-y-1.5 custom-scrollbar pt-1">
                      {selectorApartments.length === 0 ? (
                        <p className="text-sm text-ink-soft text-center py-4">
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
                              className={`px-3 py-2 rounded-lg border flex items-center justify-between cursor-pointer transition-colors duration-200 ${
                                isSelected
                                  ? 'bg-accent-soft border-accent font-bold'
                                  : rec
                                  ? 'bg-brand-success-soft/40 border-brand-border hover:bg-brand-success-soft/70'
                                  : 'bg-surface border-brand-border hover:border-accent'
                              }`}
                            >
                              <span className="font-mono font-bold text-sm text-ink">
                                {apt.code}
                              </span>
                              {rec ? (
                                <span className="text-[11px] font-semibold text-brand-success bg-brand-success-soft px-2 py-0.5 rounded-full flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-brand-success" />
                                  <span>Đã ghi</span>
                                  <span className="font-normal font-mono">
                                    ({rec.electricity.consumption} kWh / {rec.water.consumption} m³)
                                  </span>
                                </span>
                              ) : (
                                <span className="text-[11px] font-semibold text-brand-warning bg-brand-warning-soft px-2 py-0.5 rounded-full">
                                  Chưa ghi
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
              <div className="bg-surface rounded-2xl p-3.5 border border-brand-border shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-brand-border ">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-brand-warning-soft text-brand-warning rounded-lg">
                      <BoltIcon className="w-4 h-4" />
                    </span>
                    <span className="font-bold text-ink text-sm">
                      Đồng Hồ Điện (kWh)
                    </span>
                  </div>
                  {elecDetectedCode && (
                    <span className="text-[11px] px-2 py-0.5 bg-brand-warning-soft text-brand-warning rounded-full font-mono">
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
                    className="py-2 px-3 bg-accent hover:bg-accent-hover text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50"
                  >
                    <ViewfinderCircleIcon className="w-4 h-4" />
                    <span>Chụp Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => elecGalleryRef.current?.click()}
                    disabled={elecLoading}
                    className="py-2 px-3 bg-surface border border-brand-border text-ink hover:bg-surface-alt rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50"
                  >
                    <PhotoIcon className="w-4 h-4" />
                    <span>Chọn Thư Viện</span>
                  </button>
                </div>

                {/* Preview & Status */}
                {elecLoading ? (
                  <div className="p-2.5 bg-brand-warning-soft/60 rounded-lg flex items-center justify-center gap-2 text-xs text-brand-warning">
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    <span>AI đang quét và đọc chỉ số đồng hồ điện...</span>
                  </div>
                ) : elecPreviewUrl ? (
                  <div className="flex items-center gap-3 p-2 bg-surface-alt rounded-lg">
                    <img
                      src={elecPreviewUrl}
                      alt="Đồng hồ điện"
                      onClick={() => setViewingImageUrl(elecPreviewUrl)}
                      className="w-14 h-14 object-cover rounded-lg border border-brand-border bg-surface-alt cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    />
                    <div className="text-xs flex-1">
                      <p className="font-semibold text-ink">Đã chụp ảnh đồng hồ điện</p>
                      <p className="text-ink-soft text-[11px]">Bấm vào ảnh để xem phóng to</p>
                    </div>
                    <button
                      onClick={() => {
                        URL.revokeObjectURL(elecPreviewUrl);
                        setElecPreviewUrl(null);
                        setElecFile(null);
                      }}
                      className="p-1 text-ink-soft hover:text-brand-danger cursor-pointer"
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
                    <div className="px-3 py-2 bg-surface-alt rounded-lg font-mono font-bold text-ink-soft text-sm tabular-nums">
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
                      className={`w-full px-3 py-2 rounded-lg font-mono font-bold text-sm border focus:outline-none focus:ring-2 ${
                        elecInvalid
                          ? 'border-brand-danger bg-brand-danger-soft text-brand-danger'
                          : 'border-brand-border bg-surface-alt text-ink placeholder:text-ink-faint focus:ring-accent/30 focus:border-accent'
                      }`}
                    />
                  </div>
                </div>

                {/* Consumption summary */}
                <div className="flex items-center justify-between text-xs px-2 py-1.5 bg-brand-warning-soft/40 rounded-lg">
                  <span className="text-ink-soft">Tiêu thụ điện:</span>
                  <span className="font-bold text-brand-warning font-mono tabular-nums">
                    {elecConsumption} kWh {elecInvalid && '(⚠️ Nhỏ hơn chỉ số cũ)'}
                  </span>
                </div>
              </div>

              {/* 💧 Water Meter Card */}
              <div className="bg-surface rounded-2xl p-3.5 border border-brand-border shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-brand-border ">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-brand-teal-soft text-brand-teal rounded-lg">
                      Nước
                    </span>
                    <span className="font-bold text-ink text-sm">
                      Đồng Hồ Nước (m³)
                    </span>
                  </div>
                  {waterDetectedCode && (
                    <span className="text-[11px] px-2 py-0.5 bg-brand-teal-soft text-brand-teal rounded-full font-mono">
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
                    className="py-2 px-3 bg-accent hover:bg-accent-hover text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50"
                  >
                    <ViewfinderCircleIcon className="w-4 h-4" />
                    <span>Chụp Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => waterGalleryRef.current?.click()}
                    disabled={waterLoading}
                    className="py-2 px-3 bg-surface border border-brand-border text-ink hover:bg-surface-alt rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50"
                  >
                    <PhotoIcon className="w-4 h-4" />
                    <span>Chọn Thư Viện</span>
                  </button>
                </div>

                {/* Preview & Status */}
                {waterLoading ? (
                  <div className="p-2.5 bg-brand-teal-soft rounded-lg flex items-center justify-center gap-2 text-xs text-brand-teal">
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    <span>AI đang quét và đọc chỉ số đồng hồ nước...</span>
                  </div>
                ) : waterPreviewUrl ? (
                  <div className="flex items-center gap-3 p-2 bg-surface-alt rounded-lg">
                    <img
                      src={waterPreviewUrl}
                      alt="Đồng hồ nước"
                      onClick={() => setViewingImageUrl(waterPreviewUrl)}
                      className="w-14 h-14 object-cover rounded-lg border border-brand-border bg-surface-alt cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    />
                    <div className="text-xs flex-1">
                      <p className="font-semibold text-ink">Đã chụp ảnh đồng hồ nước</p>
                      <p className="text-ink-soft text-[11px]">Bấm vào ảnh để xem phóng to</p>
                    </div>
                    <button
                      onClick={() => {
                        URL.revokeObjectURL(waterPreviewUrl);
                        setWaterPreviewUrl(null);
                        setWaterFile(null);
                      }}
                      className="p-1 text-ink-soft hover:text-brand-danger cursor-pointer"
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
                    <div className="px-3 py-2 bg-surface-alt rounded-lg font-mono font-bold text-ink-soft text-sm tabular-nums">
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
                      className={`w-full px-3 py-2 rounded-lg font-mono font-bold text-sm border focus:outline-none focus:ring-2 ${
                        waterInvalid
                          ? 'border-brand-danger bg-brand-danger-soft text-brand-danger'
                          : 'border-brand-border bg-surface-alt text-ink placeholder:text-ink-faint focus:ring-accent/30 focus:border-accent'
                      }`}
                    />
                  </div>
                </div>

                {/* Consumption summary */}
                <div className="flex items-center justify-between text-xs px-2 py-1.5 bg-brand-teal-soft/40 rounded-lg">
                  <span className="text-ink-soft">Tiêu thụ nước:</span>
                  <span className="font-bold text-brand-teal font-mono tabular-nums">
                    {waterConsumption} m³ {waterInvalid && '(⚠️ Nhỏ hơn chỉ số cũ)'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-brand-border bg-surface-alt/50 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg bg-surface border border-brand-border text-ink hover:bg-surface-alt font-bold text-xs cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            Đóng
          </button>

          <button
            type="button"
            onClick={handleSaveRecord}
            disabled={submitting || !selectedApartment}
            className="flex-1 py-2.5 px-4 bg-accent hover:bg-accent-hover text-white rounded-lg font-bold text-xs transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-4 h-4" />
                <span>Lưu Chỉ Số {selectedApartment?.code}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Image Viewer */}
      <ImageViewerModal
        isOpen={!!viewingImageUrl}
        onClose={() => setViewingImageUrl(null)}
        imageUrl={viewingImageUrl}
      />
    </div>,
    document.body
  );
};

export default ScanMeterModal;
