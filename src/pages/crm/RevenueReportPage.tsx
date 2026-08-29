import { CrmSubNav } from '../../components/crm/CrmSubNav';
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import RevenueChart from '../../components/crm/RevenueChart';
import { useToast } from '../../components/ui';
import {
  ChartBarIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  DocumentArrowDownIcon,
  ChevronLeftIcon,
} from '../../components/icons';
import { StatCard } from '../../components/ui/Card';

interface Props {
  onNavigate?: (route: string) => void;
  onBack?: () => void;
}

interface RevenueData {
  period: string;
  totalRevenue: number;
  totalPaid: number;
  totalRemaining: number;
  contractCount: number;
  paymentCount: number;
  comparison: {
    previousPeriod: string;
    previousRevenue: number;
    previousPaid: number;
    changePercent: number;
  };
  chartData: Array<{
    period: string;
    revenue: number;
    paid: number;
  }>;
  detailData: Array<{
    paymentId: string;
    contractCode: string;
    customerName: string;
    apartmentCode: string;
    installment: number;
    dueDate: string;
    amount: number;
    paidAmount: number;
    status: string;
    paymentDate: string | null;
  }>;
}

const RevenueReportPage: React.FC<Props> = ({ onNavigate, onBack }) => {
  const toast = useToast();
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedQuarter, setSelectedQuarter] = useState(
    Math.ceil((new Date().getMonth() + 1) / 3)
  );
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState<RevenueData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRevenueReport();
  }, [periodType, selectedYear, selectedMonth, selectedQuarter]);

  const fetchRevenueReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {
        period: periodType,
        year: selectedYear,
      };

      if (periodType === 'month') {
        params.month = selectedMonth;
      } else if (periodType === 'quarter') {
        params.quarter = selectedQuarter;
      }

      const result = await api.get<RevenueData>('/reports/revenue', params);
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải dữ liệu');
      console.error('Revenue Report Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const body: any = {
        period: periodType,
        year: selectedYear,
      };

      if (periodType === 'month') {
        body.month = selectedMonth;
      } else if (periodType === 'quarter') {
        body.quarter = selectedQuarter;
      }

      const blob = await api.download('/reports/revenue/export', body, 'POST');

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bao_cao_doanh_thu_${data?.period || 'report'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi xuất báo cáo');
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('vi-VN') + ' đ';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const statusMap: Record<string, string> = {
    PENDING: 'Chờ thanh toán',
    PAID: 'Đã thanh toán',
    OVERDUE: 'Quá hạn',
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const quarters = [1, 2, 3, 4];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <CrmSubNav current="revenue-report" title="Báo Cáo Doanh Thu BĐS" subtitle="Thống kê tổng doanh thu thực thu, công nợ dự án TESLA & CANTATA" onNavigate={onNavigate} onBack={onBack} />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <button
            onClick={onBack}
            className="mb-3 px-4 py-2 bg-surface border border-brand-border text-ink rounded-lg transition-colors hover:bg-surface-alt flex items-center gap-2 text-sm font-medium cursor-pointer"
          >
            <ChevronLeftIcon className="w-4 h-4" /> Quay lại
          </button>
          <h1 className=" font-seriftext-3xl font-bold text-ink flex items-center gap-3">
            <ChartBarIcon className="w-6 h-6 text-accent" /> Báo Cáo Doanh Thu
          </h1>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {/* Period Type Selector */}
          <div className="relative">
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as any)}
              className="appearance-none bg-surface border border-brand-border text-ink py-2.5 px-4 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent text-sm font-medium cursor-pointer"
            >
              <option value="month">Theo Tháng</option>
              <option value="quarter">Theo Quý</option>
              <option value="year">Theo Năm</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-ink-soft">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>

          {/* Year Selector */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="appearance-none bg-surface border border-brand-border text-ink py-2.5 px-4 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent text-sm font-medium cursor-pointer"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-ink-soft">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>

          {/* Month/Quarter Selector */}
          {periodType === 'month' && (
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="appearance-none bg-surface border border-brand-border text-ink py-2.5 px-4 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent text-sm font-medium cursor-pointer"
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-ink-soft">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          )}

          {periodType === 'quarter' && (
            <div className="relative">
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(parseInt(e.target.value))}
                className="appearance-none bg-surface border border-brand-border text-ink py-2.5 px-4 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent text-sm font-medium cursor-pointer"
              >
                {quarters.map((q) => (
                  <option key={q} value={q}>
                    Quý {q}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-ink-soft">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          )}

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={exporting || !data}
            className={`
                            flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all min-h-[44px]
                            ${
                              exporting
                                ? 'bg-surface-alt text-ink-faint cursor-not-allowed border border-brand-border shadow-sm'
                                : 'bg-accent text-white border border-accent hover:bg-accent-hover hover:shadow-md shadow-sm'
                            }
                        `}
          >
            {exporting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Đang xuất...
              </>
            ) : (
              <>
                <DocumentArrowDownIcon className="w-4 h-4" /> Xuất Excel
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-20 text-ink-soft">
          <div className="w-10 h-10 mb-4 rounded-full border-4 border-brand-border border-t-accent animate-spin" />
          <div className="text-lg font-medium">Đang tải dữ liệu...</div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-brand-danger-soft border border-brand-danger/30 rounded-xl text-brand-danger flex items-center gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Data Display */}
      {!loading && data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
            className="motion-safe:animate-fade-in-1 [animation-fill-mode:both]"

              label="Tổng Doanh Thu"
              value={formatCurrency(data.totalRevenue)}
              valueTone="accent"
              icon={BanknotesIcon}
              iconBg="bg-accent-soft"
              iconColor="text-accent-ink"
            />
            <StatCard
            className="motion-safe:animate-fade-in-2 [animation-fill-mode:both]"

              label="Đã Thu"
              value={formatCurrency(data.totalPaid)}
              valueTone="success"
              icon={CheckCircleIcon}
              iconBg="bg-brand-success-soft"
              iconColor="text-brand-success"
            />
            <StatCard
            className="motion-safe:animate-fade-in-3 [animation-fill-mode:both]"

              label="Còn Lại"
              value={formatCurrency(data.totalRemaining)}
              valueTone="warning"
              icon={ClockIcon}
              iconBg="bg-brand-warning-soft"
              iconColor="text-brand-warning"
            />
            <StatCard
            className="motion-safe:animate-fade-in-4 [animation-fill-mode:both]"

              label="So với kỳ trước"
              value={`${data.comparison.changePercent >= 0 ? '+' : ''}${data.comparison.changePercent}%`}
              valueTone={data.comparison.changePercent >= 0 ? 'success' : 'danger'}
              subValue={`Kỳ trước: ${formatCurrency(data.comparison.previousRevenue)}`}
              subTone="neutral"
              icon={ArrowTrendingUpIcon}
              iconBg={data.comparison.changePercent >= 0 ? 'bg-brand-success-soft' : 'bg-brand-danger-soft'}
              iconColor={data.comparison.changePercent >= 0 ? 'text-brand-success' : 'text-brand-danger'}
            />
          </div>

          {/* Chart */}
          <div className="bg-surface p-6 rounded-xl shadow-sm border border-brand-border">
            <h2 className="text-base font-bold text-ink mb-6 flex items-center gap-2">
              Xu Hướng Doanh Thu
            </h2>
            <RevenueChart data={data.chartData} />
          </div>

          {/* Detail Table */}
          <div className="bg-surface rounded-xl shadow-sm border border-brand-border overflow-hidden">
            <div className="p-6 border-b border-brand-border">
              <h2 className="text-base font-bold text-ink">
                Chi Tiết Thanh Toán{' '}
                <span className="text-ink-soft font-normal text-sm ml-2">
                  ({data.detailData.length} bản ghi)
                </span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-surface-alt text-[11px] uppercase tracking-wider text-ink-soft">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Mã HĐ</th>
                    <th className="px-6 py-4 font-semibold">Khách hàng</th>
                    <th className="px-6 py-4 font-semibold">Căn hộ</th>
                    <th className="px-6 py-4 font-semibold">Đợt</th>
                    <th className="px-6 py-4 font-semibold">Hạn TT</th>
                    <th className="px-6 py-4 font-semibold text-right">Số tiền</th>
                    <th className="px-6 py-4 font-semibold text-right">Đã TT</th>
                    <th className="px-6 py-4 font-semibold text-center">Trạng thái</th>
                    <th className="px-6 py-4 font-semibold">Ngày TT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {data.detailData.map((row, idx) => (
                    <tr
                      key={row.paymentId}
                      className={`transition-colors duration-150 ${idx % 2 === 0 ? 'bg-surface' : 'bg-surface-alt/40'} hover:bg-surface-alt/60`}
                    >
                      <td className="px-6 py-4 font-mono font-semibold text-ink">{row.contractCode}</td>
                      <td className="px-6 py-4 text-ink-soft">{row.customerName}</td>
                      <td className="px-6 py-4 text-ink-soft">{row.apartmentCode}</td>
                      <td className="px-6 py-4 text-center text-ink-soft">{row.installment}</td>
                      <td className="px-6 py-4 text-ink-soft">{formatDate(row.dueDate)}</td>
                      <td className="px-6 py-4 text-right font-mono tabular-nums text-ink">
                        {formatCurrency(row.amount)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono tabular-nums text-brand-success">
                        {formatCurrency(row.paidAmount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`
                                                    inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold
                                                    ${
                                                      row.status === 'PAID'
                                                        ? 'bg-brand-success-soft text-brand-success'
                                                        : row.status === 'OVERDUE'
                                                          ? 'bg-brand-danger-soft text-brand-danger'
                                                          : 'bg-brand-warning-soft text-brand-warning'
                                                    }
                                                `}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              row.status === 'PAID'
                                ? 'bg-brand-success'
                                : row.status === 'OVERDUE'
                                  ? 'bg-brand-danger'
                                  : 'bg-brand-warning'
                            }`}
                          />
                          {statusMap[row.status] || row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-ink-soft">{formatDate(row.paymentDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};


export default RevenueReportPage;
