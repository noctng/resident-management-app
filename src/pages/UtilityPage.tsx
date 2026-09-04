import React, { useState, useMemo, useEffect } from 'react';
import type { Apartment, UtilityRecord } from '../types';
import {
  ArrowLeftIcon,
  BoltIcon,
  EnvelopeIcon,
  QrCodeIcon,
  DocumentArrowDownIcon,
} from '../components/icons';
import { api } from '../services/api';
import { useConfirm } from '../components/ui';
import SearchableSelect from '../components/SearchableSelect';
import EmailPreviewModal from '../components/EmailPreviewModal';
import UtilityRecordDetailModal from '../components/UtilityRecordDetailModal';
import ScanMeterModal from '../components/ScanMeterModal';
import ApartmentViewMode from './utility/ApartmentViewMode';
import MonthlyViewMode from './utility/MonthlyViewMode';
import BulkReportModal from './utility/BulkReportModal';

interface UtilityPageProps {
  apartments: Apartment[];
  utilityRecords: UtilityRecord[];
  onAddRecord: (data: {
    apartmentId: string;
    month: number;
    year: number;
    newElectricityReading: number;
    newWaterReading: number;
  }) => void;
  onOpenAddUtilityModal: (apartment: Apartment) => void;
  onBack: () => void;
}

const ELECTRICITY_TIERS = [
  { limit: 50, price: 1678 },
  { limit: 50, price: 1734 },
  { limit: 100, price: 2014 },
  { limit: 100, price: 2536 },
  { limit: 100, price: 2834 },
  { limit: Infinity, price: 2927 },
];
const WATER_PRICE = 15000;

const UtilityPage: React.FC<UtilityPageProps> = ({
  apartments,
  utilityRecords,
  onOpenAddUtilityModal,
  onBack,
}) => {
  const [selectedApartmentId, setSelectedApartmentId] = useState<string | null>(
    apartments[0]?.id || null
  );

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [targetRecordId, setTargetRecordId] = useState<string | null>(null);

  // Monthly overview state - preserve state in localStorage
  const [viewMode, setViewMode] = useState<'apartment' | 'monthly'>(() => {
    const saved = localStorage.getItem('utilityViewMode');
    return (saved === 'monthly' ? 'monthly' : 'apartment') as 'apartment' | 'monthly';
  });
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    const saved = localStorage.getItem('utilitySelectedMonth');
    return saved ? parseInt(saved) : currentDate.getMonth() + 1;
  });
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const saved = localStorage.getItem('utilitySelectedYear');
    return saved ? parseInt(saved) : currentDate.getFullYear();
  });
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');
  const [apartmentFilter, setApartmentFilter] = useState('');

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<UtilityRecord | null>(null);
  const [selectedApartmentCode, setSelectedApartmentCode] = useState<string>('');

  const [sendingBulk, setSendingBulk] = useState(false);
  const [bulkReport, setBulkReport] = useState<{
    total: number;
    success: number;
    failed: number;
    details: any[];
  } | null>(null);
  const [showBulkReport, setShowBulkReport] = useState(false);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [exportingReport, setExportingReport] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const { confirm } = useConfirm();

  const selectedApartment = useMemo(() => {
    return apartments.find((apt) => apt.id === selectedApartmentId) || null;
  }, [selectedApartmentId, apartments]);

  const recordsForSelectedApartment = useMemo(() => {
    if (!selectedApartmentId) return [];
    return utilityRecords
      .filter((u) => u.apartmentId === selectedApartmentId)
      .sort((a, b) => b.year - a.year || b.month - a.month);
  }, [selectedApartmentId, utilityRecords]);

  const apartmentOptions = apartments.map((apt) => ({
    value: apt.id,
    label: apt.code,
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const calculateElectricityCost = (usage: number) => {
    if (!usage) return 0;
    let remainingUsage = usage;
    let totalCost = 0;
    for (const tier of ELECTRICITY_TIERS) {
      if (remainingUsage <= 0) break;
      const tierUsage = Math.min(remainingUsage, tier.limit);
      totalCost += tierUsage * tier.price;
      remainingUsage -= tierUsage;
    }
    return totalCost;
  };

  const handleSendEmail = async (recordId: string) => {
    setTargetRecordId(recordId);
    setSendingEmail(true);
    try {
      const res = await api.post<any>(`/utility-records/${recordId}/notify/preview`, {});
      setPreviewData(res);
      setPreviewModalOpen(true);
    } catch (error: any) {
      console.error(error);
    } finally {
      setSendingEmail(false);
    }
  };

  const confirmSendEmail = async () => {
    if (!targetRecordId) return;
    setSendingEmail(true);
    try {
      await api.post(`/utility-records/${targetRecordId}/notify`, {});
      setPreviewModalOpen(false);
      setTargetRecordId(null);
      setPreviewData(null);
    } catch (error: any) {
      console.error(error);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleBulkSend = async () => {
    if (
      !(await confirm({
        title: 'Gửi email hàng loạt',
        description: `Bạn có chắc muốn gửi email thông báo cho toàn bộ các căn hộ trong tháng ${selectedMonth}/${selectedYear}?`,
        variant: 'primary',
      }))
    )
      return;

    setSendingBulk(true);
    try {
      const res = await api.post<any>('/utility-records/bulk-notify', {
        month: selectedMonth,
        year: selectedYear,
      });
      setBulkReport(res);
      setShowBulkReport(true);
    } catch (error: any) {
      console.error(error);
    } finally {
      setSendingBulk(false);
    }
  };

  const handleBatchQR = async () => {
    setGeneratingQR(true);
    try {
      const blob = await api.download('/utility-records/batch-qr-zip', {
        month: selectedMonth,
        year: selectedYear,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `QR_ThanhToan_${selectedMonth}_${selectedYear}.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error(error);
    } finally {
      setGeneratingQR(false);
    }
  };

  const handleExportReport = async () => {
    setExportingReport(true);
    try {
      const blob = await api.download(
        '/reports/utility',
        {
          month: selectedMonth,
          year: selectedYear,
        },
        'GET'
      );

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Bao_cao_dien_nuoc_T${selectedMonth}_${selectedYear}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error(error);
    } finally {
      setExportingReport(false);
    }
  };

  const handleRecalculate = async () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    if (
      !(await confirm({
        title: 'Tính lại giá điện nước',
        description: `Bạn có muốn tính lại giá điện nước cho kỳ ${currentMonth}/${currentYear} (chưa thanh toán)? Thao tác này sẽ cập nhật lại tiền dựa trên đơn giá hiện tại. Các tháng cũ đã tính tiền sẽ không bị ảnh hưởng.`,
        variant: 'primary',
      }))
    )
      return;
    setRecalculating(true);
    try {
      await api.post('/utility-records/recalculate', {});
    } catch (error: any) {
      console.error(error);
    } finally {
      setRecalculating(false);
    }
  };

  const monthlyRecords = useMemo(() => {
    if (viewMode !== 'monthly') return [];
    return apartments
      .map((apt) => {
        const record = utilityRecords.find(
          (r) => r.apartmentId === apt.id && r.month === selectedMonth && r.year === selectedYear
        );
        return {
          apartment: apt,
          record: record || undefined,
        };
      })
      .filter((item) => {
        if (!apartmentFilter) return true;
        return item.apartment.code.toLowerCase().includes(apartmentFilter.toLowerCase());
      })
      .sort((a, b) => a.apartment.code.localeCompare(b.apartment.code));
  }, [viewMode, apartments, utilityRecords, selectedMonth, selectedYear, apartmentFilter]);

  const monthlyStats = useMemo(() => {
    if (viewMode !== 'monthly')
      return {
        totalElectricity: 0,
        totalElectricityTax: 0,
        paidElectricity: 0,
        unpaidElectricity: 0,
        totalWater: 0,
        totalWaterTax: 0,
        paidWater: 0,
        unpaidWater: 0,
        totalAmount: 0,
        paidAmount: 0,
        unpaidAmount: 0,
        recordsCount: 0,
      };

    return monthlyRecords.reduce(
      (acc, { record }) => {
        if (record) {
          const elecUsage =
            record.electricity_usage ||
            Math.max(
              0,
              (record.electricity_new_reading || 0) - (record.electricity_old_reading || 0)
            );
          const waterUsage =
            record.water_usage ||
            Math.max(0, (record.water_new_reading || 0) - (record.water_old_reading || 0));

          const elecCost =
            record.electricity_cost > 0
              ? record.electricity_cost
              : calculateElectricityCost(elecUsage);
          const waterCost = record.water_cost > 0 ? record.water_cost : waterUsage * WATER_PRICE;
          const elecTax = record.electricity_tax || 0;
          const waterTax = record.water_tax || 0;

          const recordTotal = elecCost + waterCost;
          acc.totalElectricity += elecCost - elecTax;
          acc.totalElectricityTax += elecTax;
          acc.totalWater += waterCost - waterTax;
          acc.totalWaterTax += waterTax;
          acc.totalAmount += recordTotal;

          if (record.paymentStatus === 'PAID') {
            acc.paidAmount += recordTotal;
            acc.paidElectricity += elecCost;
            acc.paidWater += waterCost;
          } else {
            acc.unpaidAmount += recordTotal;
            acc.unpaidElectricity += elecCost;
            acc.unpaidWater += waterCost;
          }

          acc.recordsCount += 1;
        }
        return acc;
      },
      {
        totalElectricity: 0,
        totalElectricityTax: 0,
        paidElectricity: 0,
        unpaidElectricity: 0,
        totalWater: 0,
        totalWaterTax: 0,
        paidWater: 0,
        unpaidWater: 0,
        totalAmount: 0,
        paidAmount: 0,
        unpaidAmount: 0,
        recordsCount: 0,
      }
    );
  }, [viewMode, monthlyRecords]);

  const filteredMonthlyRecords = useMemo(() => {
    if (filterStatus === 'ALL') return monthlyRecords;
    return monthlyRecords.filter(({ record }) => {
      if (!record) return false;
      return record.paymentStatus === filterStatus;
    });
  }, [monthlyRecords, filterStatus]);

  const handleViewDetail = (record: UtilityRecord, apartmentCode: string) => {
    setSelectedRecord(record);
    setSelectedApartmentCode(apartmentCode);
    setDetailModalOpen(true);
  };

  const handleViewModeChange = (mode: 'apartment' | 'monthly') => {
    setViewMode(mode);
    localStorage.setItem('utilityViewMode', mode);
  };

  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
    localStorage.setItem('utilitySelectedMonth', month.toString());
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    localStorage.setItem('utilitySelectedYear', year.toString());
  };

  const handleUpdatePaymentStatus = async (recordId: string, newStatus: 'PAID' | 'UNPAID') => {
    try {
      await api.put(`/utility-records/${recordId}/payment-status`, {
        paymentStatus: newStatus,
        paidDate: newStatus === 'PAID' ? new Date().toISOString().split('T')[0] : null,
      });
    } catch (error: any) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 bg-surface rounded-xl hover:bg-surface-alt text-ink-soft hover:text-accent transition-all shadow-sm border border-brand-border"
            aria-label="Quay lại"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink flex items-center gap-2.5">
              <span className="p-2 bg-accent rounded-xl shadow-sm text-white">
                <BoltIcon className="w-5 h-5" />
              </span>
              Quản Lý Điện Nước
            </h1>
            <p className="text-xs text-ink-soft mt-0.5">
              Theo dõi chỉ số, tính toán hóa đơn và gửi thông báo điện nước
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Mode Switcher */}
          <div className="flex bg-surface-alt rounded-xl p-1">
            <button
              onClick={() => handleViewModeChange('monthly')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                viewMode === 'monthly'
                  ? 'bg-surface text-accent shadow-sm'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              Tổng quan Tháng
            </button>
            <button
              onClick={() => handleViewModeChange('apartment')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                viewMode === 'apartment'
                  ? 'bg-surface text-accent shadow-sm'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              Lịch sử Căn hộ
            </button>
          </div>

          {/* Conditional Controls */}
          {viewMode === 'apartment' ? (
            <div className="w-full sm:w-56">
              <SearchableSelect
                value={selectedApartmentId || ''}
                onChange={setSelectedApartmentId}
                options={apartmentOptions}
                placeholder={apartments.length > 0 ? 'Chọn căn hộ...' : 'Không có căn hộ'}
                disabled={apartments.length === 0}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedMonth}
                onChange={(e) => handleMonthChange(Number(e.target.value))}
                className="px-3 py-1.5 text-xs font-semibold border border-brand-border rounded-xl bg-surface-alt text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                className="px-3 py-1.5 text-xs font-semibold border border-brand-border rounded-xl bg-surface-alt text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors cursor-pointer"
              >
                {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setScanModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40"
                title="Quét chỉ số bằng AI"
              >
                <BoltIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Quét AI</span>
              </button>
              <button
                onClick={handleBulkSend}
                disabled={sendingBulk}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50"
                title="Gửi email hàng loạt" aria-label="Đóng">
                <EnvelopeIcon className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {sendingBulk ? 'Đang gửi...' : 'Gửi Email'}
                </span>
              </button>
              <button
                onClick={handleBatchQR}
                disabled={generatingQR}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-brand-border text-ink-soft hover:text-ink hover:border-accent/40 text-xs font-semibold shadow-sm transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50"
                title="Tạo QR hàng loạt" aria-label="Đóng">
                <QrCodeIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{generatingQR ? 'Đang tạo...' : 'Tạo QR'}</span>
              </button>
              <button
                onClick={handleExportReport}
                disabled={exportingReport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-brand-border text-ink-soft hover:text-ink hover:border-accent/40 text-xs font-semibold shadow-sm transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50"
                title="Xuất Excel" aria-label="Đóng">
                <DocumentArrowDownIcon className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {exportingReport ? 'Đang xuất...' : 'Xuất Excel'}
                </span>
              </button>
              <button
                onClick={handleRecalculate}
                disabled={recalculating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-brand-border text-brand-warning text-xs font-semibold shadow-sm transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50 hover:border-brand-warning/40"
                title="Tính lại giá kỳ này"
              >
                <span className="hidden sm:inline">
                  {recalculating ? 'Đang tính...' : 'Tính lại giá'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'apartment' ? (
        <ApartmentViewMode
          selectedApartment={selectedApartment}
          recordsForSelectedApartment={recordsForSelectedApartment}
          apartments={apartments}
          onOpenScanModal={() => setScanModalOpen(true)}
          onOpenAddUtilityModal={onOpenAddUtilityModal}
          onSendEmail={handleSendEmail}
          calculateElectricityCost={calculateElectricityCost}
          formatCurrency={formatCurrency}
          waterPrice={WATER_PRICE}
        />
      ) : (
        <MonthlyViewMode
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          monthlyStats={monthlyStats}
          apartments={apartments}
          filteredMonthlyRecords={filteredMonthlyRecords}
          apartmentFilter={apartmentFilter}
          setApartmentFilter={setApartmentFilter}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          onSendEmail={handleSendEmail}
          onViewDetail={handleViewDetail}
          onUpdatePaymentStatus={handleUpdatePaymentStatus}
          calculateElectricityCost={calculateElectricityCost}
          formatCurrency={formatCurrency}
          waterPrice={WATER_PRICE}
        />
      )}

      {/* Modals */}
      <EmailPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        onSend={confirmSendEmail}
        isLoading={sendingEmail}
        data={previewData}
      />

      <UtilityRecordDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        record={selectedRecord}
        apartmentCode={selectedApartmentCode}
        type="utility"
      />

      <ScanMeterModal
        isOpen={scanModalOpen}
        onClose={() => setScanModalOpen(false)}
        apartments={apartments}
        utilityRecords={utilityRecords}
        initialApartmentId={selectedApartmentId}
        initialMonth={selectedMonth}
        initialYear={selectedYear}
        onRecordAdded={() => {}}
      />

      <BulkReportModal
        isOpen={showBulkReport}
        onClose={() => setShowBulkReport(false)}
        report={bulkReport}
      />
    </div>
  );
};

export default UtilityPage;
