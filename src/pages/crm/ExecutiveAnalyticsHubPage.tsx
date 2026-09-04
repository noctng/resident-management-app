import React, { useState, useEffect } from 'react';
import { CrmSubNav } from '../../components/crm/CrmSubNav';
import { api } from '../../services/api';
import { useToast } from '../../components/ui';
import { EmptyState } from '../../components/ui';
import {
  ChartBarIcon,
  BanknotesIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  BuildingOfficeIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  ArrowPathIcon,
  SparklesIcon,
  ShieldCheckIcon,
  UsersIcon,
} from '../../components/icons';

interface ExecutiveAnalyticsHubPageProps {
  onNavigate?: (route: string) => void;
  onBack?: () => void;
}

export const ExecutiveAnalyticsHubPage: React.FC<ExecutiveAnalyticsHubPageProps> = ({ onNavigate, onBack }) => {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sales' | 'finance' | 'operations' | 'community'>('sales');

  // Filters
  const [phaseFilter, setPhaseFilter] = useState('ALL');
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Data states
  const [overview, setOverview] = useState<any>(null);
  const [salesFunnel, setSalesFunnel] = useState<any>(null);
  const [financialAging, setFinancialAging] = useState<any>(null);
  const [operationsSla, setOperationsSla] = useState<any>(null);
  const [community, setCommunity] = useState<any>(null);

  useEffect(() => {
    loadAllAnalytics();
  }, [phaseFilter, selectedYear]);

  const loadAllAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(phaseFilter !== 'ALL' ? { phase: phaseFilter } : {}),
        year: String(selectedYear),
      });

      const [resOverview, resSales, resAging, resOps, resComm]: any = await Promise.all([
        api.get(`/crm/analytics/overview?${params.toString()}`),
        api.get(`/crm/analytics/sales-funnel?${params.toString()}`),
        api.get(`/crm/analytics/financial-aging?${params.toString()}`),
        api.get(`/crm/analytics/operations-sla?${params.toString()}`),
        api.get(`/crm/analytics/community-occupancy?${params.toString()}`),
      ]);

      if (resOverview && resOverview.success) setOverview(resOverview.data);
      if (resSales && resSales.success) setSalesFunnel(resSales);
      if (resAging && resAging.success) setFinancialAging(resAging);
      if (resOps && resOps.success) setOperationsSla(resOps);
      if (resComm && resComm.success) setCommunity(resComm.community);
    } catch (err) {
      console.error('Lỗi tải dữ liệu phân tích điều hành:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    const url = `${window.location.origin}/api/crm/analytics/export-excel`;
    window.open(url, '_blank');
    toast.success('Đang xuất báo cáo điều hành ra file Excel...');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      <CrmSubNav
        current="analytics"
        title="Trung Tâm Báo Cáo & Phân Tích Điều Hành (B.10 / C.14)"
        subtitle="Hợp nhất 4 Trụ cột Quản trị: Kinh doanh HĐMB, Tài chính Tuổi nợ, Vận hành Kỹ thuật SLA và Đô thị Cư dân"
        onNavigate={onNavigate}
        onBack={onBack}
      />

      {/* Top Header & Global Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-brand-border shadow-xs">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink flex items-center gap-2">
            <ChartBarIcon className="w-7 h-7 text-accent" />
            <span>Báo Cáo & Chỉ Số KPI Điều Hành Tổng Hợp</span>
          </h1>
          <p className="text-sm text-ink-soft mt-0.5">
            Bảng điều khiển trung tâm hỗ trợ Ban Điều Hành ra quyết định kinh doanh và giám sát vận hành khu đô thị
          </p>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
            className="px-3 py-2 bg-surface-alt border border-brand-border rounded-xl text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 cursor-pointer"
          >
            <option value="ALL">-- Tất cả Phân kỳ --</option>
            <option value="CANTATA">Phân kỳ Cantata</option>
            <option value="TESLA">Phân kỳ Tesla</option>
            <option value="DA_VINCI">Phân kỳ Da Vinci</option>
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 bg-surface-alt border border-brand-border rounded-xl text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 cursor-pointer font-mono"
          >
            <option value={2026}>Năm 2026</option>
            <option value={2025}>Năm 2025</option>
            <option value={2024}>Năm 2024</option>
          </select>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-brand-success hover:bg-brand-success/90 text-white rounded-xl text-xs font-bold transition-all duration-150 shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>Xuất Excel 4 Sheet</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-surface hover:bg-surface-alt border border-brand-border text-ink rounded-xl text-xs font-bold transition-all duration-150 shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <PrinterIcon className="w-4 h-4" />
            <span>In Báo Cáo</span>
          </button>
        </div>
      </div>

      {/* 4 Executive KPI StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Sales & Revenue */}
        <div className="bg-surface rounded-2xl p-5 border border-brand-border shadow-xs space-y-2">
          <span className="text-sm text-ink-soft font-semibold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <BanknotesIcon className="w-4 h-4 text-accent" />
              Doanh số HĐMB Lũy kế
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-soft text-accent-ink font-mono">
              Thu {overview?.collectionRate || 0}%
            </span>
          </span>
          <div className="text-xl font-bold font-mono text-ink tabular-nums">
            {Number(overview?.totalContractValue || 0).toLocaleString('vi-VN')} đ
          </div>
          <p className="text-[11px] text-brand-success font-medium">
            Đã thực thu: <strong className="font-mono">{Number(overview?.totalCollected || 0).toLocaleString('vi-VN')} đ</strong>
          </p>
        </div>

        {/* Card 2: Overdue Receivables */}
        <div className="bg-surface rounded-2xl p-5 border border-brand-border shadow-xs space-y-2">
          <span className="text-sm text-ink-soft font-semibold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ExclamationTriangleIcon className="w-4 h-4 text-brand-danger" />
              Công Nợ Quá Hạn HĐMB
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-danger-soft text-brand-danger font-mono">
              {overview?.overdueCount || 0} đợt nợ
            </span>
          </span>
          <div className="text-xl font-bold font-mono text-brand-danger tabular-nums">
            {Number(overview?.totalOverdueAmount || 0).toLocaleString('vi-VN')} đ
          </div>
          <p className="text-[11px] text-ink-soft">
            Dự thu 30 ngày tới: <strong className="font-mono text-ink">{Number(financialAging?.forecast?.next30d || 0).toLocaleString('vi-VN')} đ</strong>
          </p>
        </div>

        {/* Card 3: Operations SLA */}
        <div className="bg-surface rounded-2xl p-5 border border-brand-border shadow-xs space-y-2">
          <span className="text-sm text-ink-soft font-semibold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <WrenchScrewdriverIcon className="w-4 h-4 text-accent" />
              SLA Bảo Hành Đúng Hạn
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-success-soft text-brand-success font-mono">
              {overview?.totalClaims || 0} tickets
            </span>
          </span>
          <div className="text-2xl font-bold font-mono text-brand-success tabular-nums">
            {overview?.slaAdherenceRate || 100}%
          </div>
          <p className="text-[11px] text-ink-soft">
            Ký quỹ 100Tr đang giữ: <strong className="font-mono text-brand-success">{Number(overview?.totalDepositHeld || 0).toLocaleString('vi-VN')} đ</strong>
          </p>
        </div>

        {/* Card 4: Community & Occupancy */}
        <div className="bg-surface rounded-2xl p-5 border border-brand-border shadow-xs space-y-2">
          <span className="text-sm text-ink-soft font-semibold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <BuildingOfficeIcon className="w-4 h-4 text-accent" />
              Tỷ Lệ Bàn Giao & Về Ở
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-soft text-accent-ink font-mono">
              {overview?.handedOverCount || 0}/{overview?.totalApartments || 0} căn
            </span>
          </span>
          <div className="text-2xl font-bold font-mono text-accent tabular-nums">
            {overview?.handoverRate || 0}%
          </div>
          <p className="text-[11px] text-ink-soft">
            Quỹ bảo trì 2%: <strong className="font-mono text-ink">{Number(overview?.totalMaintenanceFund || 0).toLocaleString('vi-VN')} đ</strong>
          </p>
        </div>
      </div>

      {/* 4 Interactive Pillars Tabs */}
      <div className="flex items-center gap-2 border-b border-brand-border text-xs font-bold overflow-x-auto pb-0.5">
        <button
          type="button"
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-3 border-b-2 transition-all duration-150 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'sales' ? 'border-accent text-accent' : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <ChartBarIcon className="w-4 h-4" />
          <span>1. Bán Hàng & Phễu Chuyển Đổi</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('finance')}
          className={`px-4 py-3 border-b-2 transition-all duration-150 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'finance' ? 'border-accent text-accent' : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <BanknotesIcon className="w-4 h-4" />
          <span>2. Tài Chính & Ma Trận Tuổi Nợ (Aging)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('operations')}
          className={`px-4 py-3 border-b-2 transition-all duration-150 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'operations' ? 'border-accent text-accent' : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <WrenchScrewdriverIcon className="w-4 h-4" />
          <span>3. Vận Hành, Kỹ Thuật & SLA</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('community')}
          className={`px-4 py-3 border-b-2 transition-all duration-150 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'community' ? 'border-accent text-accent' : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <UsersIcon className="w-4 h-4" />
          <span>4. Cư Dân, Bàn Giao & Đô Thị</span>
        </button>
      </div>

      {/* ── TAB 1: SALES & FUNNEL ── */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          {/* Funnel Visual Pipeline */}
          <div className="bg-surface rounded-2xl border border-brand-border p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-ink text-sm flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5 text-accent" />
              <span>Phễu Chuyển Đổi Kinh Doanh Toàn Dự Án (Sales Conversion Funnel)</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {salesFunnel?.funnel?.map((item: any, idx: number) => (
                <div key={idx} className="bg-surface-alt p-4 rounded-xl border border-brand-border space-y-2 text-xs text-center relative overflow-hidden">
                  <div className="text-[11px] text-ink-soft font-semibold">{item.label}</div>
                  <div className="text-2xl font-bold font-mono text-accent">{item.count}</div>
                  {idx > 0 && item.dropRate > 0 && (
                    <div className="text-[10px] text-brand-danger font-semibold">
                      Tỷ lệ rơi rụng: {item.dropRate}%
                    </div>
                  )}
                  <div className="w-full bg-brand-border h-1 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-accent h-full rounded-full"
                      style={{ width: `${Math.max(15, 100 - item.dropRate)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Phase Revenue & Commissions Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface rounded-2xl border border-brand-border p-6 shadow-sm space-y-4">
              <h2 className="font-bold text-ink text-sm flex items-center gap-2">
                <BuildingOfficeIcon className="w-5 h-5 text-accent" />
                <span>Cơ Cấu Doanh Số Theo Phân Kỳ</span>
              </h2>
              <div className="space-y-3">
                {salesFunnel?.phaseRevenue?.map((pr: any, idx: number) => (
                  <div key={idx} className="p-3 bg-surface-alt rounded-xl border border-brand-border flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-ink text-sm block">{pr.phase}</strong>
                      <span className="text-ink-soft text-[11px]">{pr.count} HĐMB đã ký</span>
                    </div>
                    <span className="text-sm font-bold font-mono text-brand-success">
                      {Number(pr.totalValue || 0).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface rounded-2xl border border-brand-border p-6 shadow-sm space-y-4">
              <h2 className="font-bold text-ink text-sm flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-accent" />
                <span>Bảng Kê Hoa Hồng & Chiết Khấu Bán Hàng</span>
              </h2>
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-surface-alt rounded-xl border border-brand-border flex justify-between items-center">
                  <span>Tổng ngân sách hoa hồng phát sinh:</span>
                  <strong className="font-mono text-sm text-ink">
                    {Number(salesFunnel?.commissions?.totalCommission || 0).toLocaleString('vi-VN')} đ
                  </strong>
                </div>
                <div className="p-3 bg-brand-success-soft rounded-xl border border-brand-success/30 flex justify-between items-center text-brand-success">
                  <span>Đã giải ngân cho Sale/Đại lý:</span>
                  <strong className="font-mono text-sm">
                    {Number(salesFunnel?.commissions?.paidCommission || 0).toLocaleString('vi-VN')} đ
                  </strong>
                </div>
                <div className="p-3 bg-brand-warning-soft rounded-xl border border-brand-warning/30 flex justify-between items-center text-brand-warning">
                  <span>Chờ duyệt chi trả đợt tới:</span>
                  <strong className="font-mono text-sm">
                    {Number(salesFunnel?.commissions?.remainingCommission || 0).toLocaleString('vi-VN')} đ
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: FINANCIAL AGING ── */}
      {activeTab === 'finance' && (
        <div className="space-y-6">
          {/* Aging Matrix Buckets */}
          <div className="bg-surface rounded-2xl border border-brand-border p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-ink text-sm flex items-center gap-2">
              <BanknotesIcon className="w-5 h-5 text-brand-danger" />
              <span>Ma Trận Phân Loại Tuổi Nợ Phải Thu (Aging Receivables Matrix)</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 bg-brand-warning-soft text-brand-warning rounded-xl border border-brand-warning/30 space-y-1">
                <span className="text-[11px] font-semibold">1 – 30 Ngày</span>
                <div className="text-xl font-bold font-mono tabular-nums">
                  {Number(financialAging?.aging?.d0_30?.amount || 0).toLocaleString('vi-VN')} đ
                </div>
                <p className="text-[10px]">{financialAging?.aging?.d0_30?.count || 0} đợt thanh toán</p>
              </div>

              <div className="p-4 bg-brand-warning-soft text-brand-warning rounded-xl border border-brand-warning/30 space-y-1">
                <span className="text-[11px] font-semibold">31 – 60 Ngày</span>
                <div className="text-xl font-bold font-mono tabular-nums">
                  {Number(financialAging?.aging?.d31_60?.amount || 0).toLocaleString('vi-VN')} đ
                </div>
                <p className="text-[10px]">{financialAging?.aging?.d31_60?.count || 0} đợt thanh toán</p>
              </div>

              <div className="p-4 bg-brand-danger-soft text-brand-danger rounded-xl border border-brand-danger/30 space-y-1">
                <span className="text-[11px] font-semibold">61 – 90 Ngày</span>
                <div className="text-xl font-bold font-mono tabular-nums">
                  {Number(financialAging?.aging?.d61_90?.amount || 0).toLocaleString('vi-VN')} đ
                </div>
                <p className="text-[10px]">{financialAging?.aging?.d61_90?.count || 0} đợt thanh toán</p>
              </div>

              <div className="p-4 bg-brand-danger-soft text-brand-danger rounded-xl border border-brand-danger/30 space-y-1">
                <span className="text-[11px] font-semibold">&gt; 90 Ngày (Khó Đòi)</span>
                <div className="text-xl font-bold font-mono tabular-nums">
                  {Number(financialAging?.aging?.d90plus?.amount || 0).toLocaleString('vi-VN')} đ
                </div>
                <p className="text-[10px]">{financialAging?.aging?.d90plus?.count || 0} đợt thanh toán</p>
              </div>
            </div>
          </div>

          {/* Cash Flow Forecast for Next 30/60/90 Days */}
          <div className="bg-surface rounded-2xl border border-brand-border p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-ink text-sm flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-accent" />
              <span>Dự Thu Dòng Tiền Theo Tiến Độ Các Kỳ Tới (Cash Flow Forecast)</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-surface-alt rounded-xl border border-brand-border space-y-1">
                <span className="text-ink-soft">Dự thu 30 ngày tới</span>
                <div className="text-xl font-bold font-mono text-accent tabular-nums">
                  {Number(financialAging?.forecast?.next30d || 0).toLocaleString('vi-VN')} đ
                </div>
              </div>

              <div className="p-4 bg-surface-alt rounded-xl border border-brand-border space-y-1">
                <span className="text-ink-soft">Dự thu 31 - 60 ngày tới</span>
                <div className="text-xl font-bold font-mono text-ink tabular-nums">
                  {Number(financialAging?.forecast?.next60d || 0).toLocaleString('vi-VN')} đ
                </div>
              </div>

              <div className="p-4 bg-surface-alt rounded-xl border border-brand-border space-y-1">
                <span className="text-ink-soft">Dự thu 61 - 90 ngày tới</span>
                <div className="text-xl font-bold font-mono text-ink tabular-nums">
                  {Number(financialAging?.forecast?.next90d || 0).toLocaleString('vi-VN')} đ
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: OPERATIONS & SLA ── */}
      {activeTab === 'operations' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pareto Defect Breakdown */}
            <div className="bg-surface rounded-2xl border border-brand-border p-6 shadow-sm space-y-4">
              <h2 className="font-bold text-ink text-sm flex items-center gap-2">
                <WrenchScrewdriverIcon className="w-5 h-5 text-accent" />
                <span>Biểu Đồ Pareto: Top Sự Cố Bảo Hành Phổ Biến</span>
              </h2>

              <div className="space-y-3">
                {operationsSla?.pareto?.map((item: any, idx: number) => (
                  <div key={idx} className="p-3 bg-surface-alt rounded-xl border border-brand-border text-xs space-y-1">
                    <div className="flex justify-between font-semibold">
                      <span className="text-ink">{item.category}</span>
                      <span className="font-mono text-accent">{item.count} tickets ({item.percentage}%)</span>
                    </div>
                    <div className="w-full bg-brand-border h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-accent h-full rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contractor Quality Rankings */}
            <div className="bg-surface rounded-2xl border border-brand-border p-6 shadow-sm space-y-4">
              <h2 className="font-bold text-ink text-sm flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5 text-brand-success" />
                <span>Bảng Xếp Hạng & Điểm SLA Nhà Thầu</span>
              </h2>

              <div className="space-y-3 text-xs">
                {operationsSla?.contractorRanking?.map((ctr: any, idx: number) => (
                  <div key={idx} className="p-3 bg-surface-alt rounded-xl border border-brand-border flex items-center justify-between">
                    <div>
                      <strong className="text-ink text-sm block">{ctr.name}</strong>
                      <span className="text-[11px] text-ink-soft">Chuyên ngành: {ctr.trade_type}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-brand-warning font-bold">⭐ {ctr.rating} / 5.0</div>
                      <span className="text-[10px] text-brand-success font-semibold">
                        SLA hoàn thành: {ctr.completionRate}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: COMMUNITY & OCCUPANCY ── */}
      {activeTab === 'community' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface rounded-2xl border border-brand-border p-6 shadow-sm space-y-2 text-center">
              <span className="text-sm text-ink-soft font-semibold">Mật Độ Căn Hộ Về Ở</span>
              <div className="text-3xl font-bold font-mono text-accent">
                {community?.occupancyRate || 0}%
              </div>
              <p className="text-sm text-ink-soft">
                {community?.occupiedApartments || 0} / {community?.totalApartments || 0} căn đã sáng đèn
              </p>
            </div>

            <div className="bg-surface rounded-2xl border border-brand-border p-6 shadow-sm space-y-2 text-center">
              <span className="text-sm text-ink-soft font-semibold">Quy Mô Dân Cư Sinh Sống</span>
              <div className="text-3xl font-bold font-mono text-brand-success">
                {community?.totalResidents || 0}
              </div>
              <p className="text-sm text-ink-soft">Cư dân đăng ký nhân khẩu</p>
            </div>

            <div className="bg-surface rounded-2xl border border-brand-border p-6 shadow-sm space-y-2 text-center">
              <span className="text-sm text-ink-soft font-semibold">Phương Tiện Đăng Ký</span>
              <div className="text-3xl font-bold font-mono text-ink">
                {community?.vehicles?.total || 0}
              </div>
              <p className="text-sm text-ink-soft">
                🚗 {community?.vehicles?.cars || 0} Ô tô • 🛵 {community?.vehicles?.motorbikes || 0} Xe máy
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutiveAnalyticsHubPage;
