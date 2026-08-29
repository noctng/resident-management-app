import React, { useState, useEffect } from 'react';
import {
  ArrowLeftIcon,
  EnvelopeIcon,
  QrCodeIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '../components/icons';
import { api } from '../services/api';
import { useConfirm } from '../components/ui';
import SearchableSelect from '../components/SearchableSelect';
import UtilityRecordDetailModal from '../components/UtilityRecordDetailModal';
import EmailPreviewModal from '../components/EmailPreviewModal';
import type { Apartment } from '../types';
import UnifiedMonthlyView from './billing/UnifiedMonthlyView';
import UnifiedHistoryView, { type UnifiedBillingRecord } from './billing/UnifiedHistoryView';
import UnifiedBulkReportModal from './billing/UnifiedBulkReportModal';

interface Props {
  onBack: () => void;
  apartments?: Apartment[];
  onOpenAddUtilityModal?: (apartment: Apartment) => void;
}

export default function UnifiedBillingPage({ onBack, apartments }: Props) {
  const { confirm } = useConfirm();
  const [billingData, setBillingData] = useState<UnifiedBillingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [apartmentFilter, setApartmentFilter] = useState('');

  // Detail modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [selectedApartmentCode, setSelectedApartmentCode] = useState('');

  // History View State
  const [viewMode, setViewMode] = useState<'monthly' | 'history'>('monthly');
  const [selectedApartmentId, setSelectedApartmentId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<UnifiedBillingRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Email sending state
  const [sendingEmail, setSendingEmail] = useState<boolean>(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [targetRecord, setTargetRecord] = useState<UnifiedBillingRecord | null>(null);

  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Bulk Actions State
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

  useEffect(() => {
    if (apartments && apartments.length > 0 && !selectedApartmentId) {
      setSelectedApartmentId(apartments[0].id);
    }
  }, [apartments, selectedApartmentId]);

  useEffect(() => {
    if (viewMode === 'history' && selectedApartmentId) {
      fetchHistoryData(selectedApartmentId);
    }
  }, [viewMode, selectedApartmentId]);

  const fetchHistoryData = async (apartmentId: string) => {
    try {
      setHistoryLoading(true);
      const result = await api.get<{ data: UnifiedBillingRecord[] }>(
        `/unified-billing/history/${apartmentId}?limit=12`
      );
      if (result) {
        setHistoryData(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const apartmentOptions = (apartments || []).map((apt) => ({
    value: apt.id,
    label: apt.code,
  }));

  const selectedApartment = apartments?.find((a) => a.id === selectedApartmentId);

  useEffect(() => {
    fetchBillingData();
  }, [selectedMonth, selectedYear]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
      });

      const result = await api.get<{ data: UnifiedBillingRecord[] }>(`/unified-billing?${params}`);
      if (result) {
        setBillingData(result.data || []);
      }
    } catch (err: any) {
      console.error('Error fetching billing data:', err);
      setError('Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (record: UnifiedBillingRecord) => {
    const utilityRecord = {
      id: record.utility_id || '',
      apartmentId: record.apartment_id,
      month: record.month,
      year: record.year,
      electricity: {
        oldReading: record.electricity_old_reading || 0,
        newReading: record.electricity_new_reading || 0,
        consumption: record.electricity_usage || 0,
        cost: record.electricity_cost,
        tax: record.electricity_tax || 0,
      },
      water: {
        oldReading: record.water_old_reading || 0,
        newReading: record.water_new_reading || 0,
        consumption: record.water_usage || 0,
        cost: record.water_cost,
        tax: record.water_tax || 0,
      },
      paymentStatus: record.utility_status || 'UNPAID',
      paidDate: null,
      emailSentAt: null,
      managementFeeData: record.management_fee_breakdown,
    };

    setSelectedRecord(utilityRecord);
    setSelectedApartmentCode(record.apartment_code);
    setDetailModalOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      PAID: 'bg-brand-success-soft text-brand-success',
      UNPAID: 'bg-brand-danger-soft text-brand-danger',
      PARTIAL: 'bg-brand-warning-soft text-brand-warning',
      NO_DATA: 'bg-surface-alt text-ink-soft',
    };
    const labels: Record<string, string> = {
      PAID: 'Đã thanh toán',
      UNPAID: 'Chưa thanh toán',
      PARTIAL: 'Thanh toán 1 phần',
      NO_DATA: 'Chưa có dữ liệu',
    };
    const icons: Record<string, React.ReactNode> = {
      PAID: <CheckCircleIcon className="w-3.5 h-3.5" />,
      UNPAID: <XCircleIcon className="w-3.5 h-3.5" />,
      PARTIAL: <ClockIcon className="w-3.5 h-3.5" />,
      NO_DATA: null,
    };

    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full ${
          badges[status] || 'bg-surface-alt text-ink-soft'
        }`}
      >
        {icons[status] ?? null}
        {labels[status] || status}
      </span>
    );
  };

  const handleSendResultEmail = async (record: UnifiedBillingRecord) => {
    setTargetRecord(record);
    setSendingEmail(true);
    try {
      const data = await api.post<any>('/unified-billing/notify/preview', {
        apartment_id: record.apartment_id,
        month: record.month,
        year: record.year,
      });

      if (data) {
        setPreviewData(data);
        setPreviewModalOpen(true);
      }
    } catch (error) {
      console.error('Error previewing email:', error);
    } finally {
      setSendingEmail(false);
    }
  };

  const confirmSendEmail = async () => {
    if (!targetRecord) return;

    setSendingEmail(true);
    try {
      await api.post('/unified-billing/notify', {
        apartment_id: targetRecord.apartment_id,
        month: targetRecord.month,
        year: targetRecord.year,
      });
      setPreviewModalOpen(false);
      setTargetRecord(null);
      setPreviewData(null);
    } catch (error) {
      console.error('Error sending email:', error);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleUpdateStatus = async (record: UnifiedBillingRecord, newStatus: 'PAID' | 'UNPAID') => {
    if (
      !(await confirm({
        title:
          newStatus === 'PAID'
            ? `Xác nhận ĐÃ THU tiền căn ${record.apartment_code}?`
            : `Xác nhận chuyển căn ${record.apartment_code} về CHƯA THU?`,
        description:
          newStatus === 'PAID'
            ? 'Trạng thái hóa đơn tổng hợp kỳ này sẽ được đánh dấu là đã thanh toán.'
            : 'Toàn bộ trạng thái thanh toán của kỳ này sẽ được đặt lại về chưa thu.',
        variant: newStatus === 'PAID' ? 'primary' : 'danger',
        confirmLabel: newStatus === 'PAID' ? 'Đã thu' : 'Chưa thu',
      }))
    )
      return;

    setUpdatingStatus(record.apartment_id);
    try {
      await api.put('/unified-billing/payment-status', {
        apartment_id: record.apartment_id,
        month: record.month,
        year: record.year,
        status: newStatus,
      });

      if (viewMode === 'monthly') {
        fetchBillingData();
      } else if (selectedApartmentId) {
        fetchHistoryData(selectedApartmentId);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleBulkSend = async () => {
    if (
      !(await confirm({
        title: `Gửi email thông báo toàn khu?`,
        description: `Email hóa đơn tháng ${selectedMonth}/${selectedYear} sẽ được gửi đến tất cả các căn hộ.`,
        variant: 'primary',
        confirmLabel: 'Gửi email',
      }))
    )
      return;

    setSendingBulk(true);
    try {
      const data = await api.post<any>('/unified-billing/notify/bulk', {
        month: selectedMonth,
        year: selectedYear,
      });
      if (data) {
        setBulkReport(data);
        setShowBulkReport(true);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSendingBulk(false);
    }
  };

  const handleBatchQR = async () => {
    setGeneratingQR(true);
    try {
      const blob = await api.download('/unified-billing/batch-qr-zip', {
        month: selectedMonth,
        year: selectedYear,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `QR_TongHop_T${selectedMonth}_${selectedYear}.zip`);
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
        '/reports/unified-billing',
        {
          month: selectedMonth,
          year: selectedYear,
        },
        'GET'
      );

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Bao_cao_Tong_Hop_T${selectedMonth}_${selectedYear}.xlsx`);
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

  const filteredData = billingData.filter((record) => {
    if (statusFilter && record.combined_status !== statusFilter) return false;
    if (
      apartmentFilter &&
      !record.apartment_code.toLowerCase().includes(apartmentFilter.toLowerCase())
    )
      return false;
    return true;
  });

  const computedSummary = React.useMemo(() => {
    const ELECTRICITY_TIERS = [
      { limit: 50, price: 1678 },
      { limit: 50, price: 1734 },
      { limit: 100, price: 2014 },
      { limit: 100, price: 2536 },
      { limit: 100, price: 2834 },
      { limit: Infinity, price: 2927 },
    ];
    const WATER_PRICE = 15000;

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

    return filteredData.reduce(
      (acc, record) => {
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
          Number(record.electricity_cost) > 0
            ? Number(record.electricity_cost)
            : calculateElectricityCost(elecUsage);
        const waterCost =
          Number(record.water_cost) > 0 ? Number(record.water_cost) : waterUsage * WATER_PRICE;
        const mgmtFee = Number(record.management_fee_cost || 0);
        const elecTax = Number(record.electricity_tax || 0);
        const waterTax = Number(record.water_tax || 0);

        const isElecPaid = record.utility_status === 'PAID' || record.combined_status === 'PAID';
        const isWaterPaid = record.utility_status === 'PAID' || record.combined_status === 'PAID';
        const isMgmtPaid =
          record.management_fee_status === 'PAID' || record.combined_status === 'PAID';

        return {
          total_electricity: acc.total_electricity + (elecCost - elecTax),
          total_electricity_tax: acc.total_electricity_tax + elecTax,
          paid_electricity: acc.paid_electricity + (isElecPaid ? elecCost : 0),

          total_water: acc.total_water + (waterCost - waterTax),
          total_water_tax: acc.total_water_tax + waterTax,
          paid_water: acc.paid_water + (isWaterPaid ? waterCost : 0),

          total_management_fee: acc.total_management_fee + mgmtFee,
          paid_management_fee: acc.paid_management_fee + (isMgmtPaid ? mgmtFee : 0),

          grand_total: acc.grand_total + elecCost + waterCost + mgmtFee,
          paid_grand_total:
            acc.paid_grand_total +
            (isElecPaid ? elecCost : 0) +
            (isWaterPaid ? waterCost : 0) +
            (isMgmtPaid ? mgmtFee : 0),

          recordsCount: acc.recordsCount + 1,
        };
      },
      {
        total_electricity: 0,
        total_electricity_tax: 0,
        paid_electricity: 0,
        total_water: 0,
        total_water_tax: 0,
        paid_water: 0,
        total_management_fee: 0,
        paid_management_fee: 0,
        grand_total: 0,
        paid_grand_total: 0,
        recordsCount: 0,
      }
    );
  }, [filteredData]);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2.5 bg-surface rounded-xl hover:bg-surface-alt text-ink-soft hover:text-accent transition-colors shadow-sm border border-brand-border cursor-pointer"
              aria-label="Quay lại"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-ink">
                Quản Lý Hóa Đơn Tổng Hợp
              </h1>
              <p className="text-xs text-ink-soft mt-0.5">
                Quản lý, theo dõi và gửi thông báo thanh toán dịch vụ toàn khu
              </p>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-surface-alt p-1 rounded-xl self-start sm:self-center">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'monthly'
                  ? 'bg-surface text-accent shadow-sm'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              Tổng quan Tháng
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'history'
                  ? 'bg-surface text-accent shadow-sm'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              Lịch sử Căn hộ
            </button>
          </div>
        </div>

        {/* Toolbar */}
        {viewMode === 'monthly' ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-2xl border border-brand-border shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-ink-soft">
                Thời gian:
              </span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-1.5 border border-brand-border rounded-xl bg-surface text-ink text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1.5 border border-brand-border rounded-xl bg-surface text-ink text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkSend}
                disabled={sendingBulk}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 cursor-pointer" aria-label="Đóng">
                <EnvelopeIcon className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {sendingBulk ? 'Đang gửi...' : 'Gửi Email'}
                </span>
              </button>
              <button
                onClick={handleBatchQR}
                disabled={generatingQR}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-alt text-ink border border-brand-border text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer" aria-label="Đóng">
                <QrCodeIcon className="w-4 h-4 text-ink-soft" />
                <span className="hidden sm:inline">{generatingQR ? 'Đang tạo...' : 'Tạo QR'}</span>
              </button>
              <button
                onClick={handleExportReport}
                disabled={exportingReport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-alt text-ink border border-brand-border text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer" aria-label="Đóng">
                <DocumentArrowDownIcon className="w-4 h-4 text-ink-soft" />
                <span className="hidden sm:inline">
                  {exportingReport ? 'Đang xuất...' : 'Xuất Excel'}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-surface p-4 rounded-2xl border border-brand-border shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-ink-soft whitespace-nowrap">
                Chọn căn hộ:
              </span>
              <div className="w-full sm:w-72">
                <SearchableSelect
                  value={selectedApartmentId || ''}
                  onChange={setSelectedApartmentId}
                  options={apartmentOptions}
                  placeholder={apartments?.length ? 'Tìm kiếm căn hộ...' : 'Không có dữ liệu'}
                  disabled={!apartments?.length}
                />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-brand-danger-soft border border-brand-danger/20 text-brand-danger rounded-xl flex items-center gap-2 text-sm">
          <XCircleIcon className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Content */}
      {viewMode === 'monthly' ? (
        <UnifiedMonthlyView
          computedSummary={computedSummary}
          filteredData={filteredData}
          totalRecordsCount={billingData.length}
          loading={loading}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          apartmentFilter={apartmentFilter}
          setApartmentFilter={setApartmentFilter}
          onSendResultEmail={handleSendResultEmail}
          onViewDetail={handleViewDetail}
          onUpdateStatus={handleUpdateStatus}
          updatingStatus={updatingStatus}
          sendingEmail={sendingEmail}
          formatCurrency={formatCurrency}
          getStatusBadge={getStatusBadge}
        />
      ) : (
        <UnifiedHistoryView
          selectedApartment={selectedApartment}
          historyData={historyData}
          historyLoading={historyLoading}
          onSelectPeriod={(m, y) => {
            setSelectedMonth(m);
            setSelectedYear(y);
            setViewMode('monthly');
          }}
          onSendResultEmail={handleSendResultEmail}
          onViewDetail={handleViewDetail}
          onUpdateStatus={handleUpdateStatus}
          updatingStatus={updatingStatus}
          sendingEmail={sendingEmail}
          formatCurrency={formatCurrency}
          getStatusBadge={getStatusBadge}
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
        type="unified"
      />

      <UnifiedBulkReportModal
        isOpen={showBulkReport}
        onClose={() => setShowBulkReport(false)}
        report={bulkReport}
      />
    </div>
  );
}
