import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  BanknotesIcon,
  BuildingOfficeIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  SparklesIcon,
} from '../../components/icons';

interface CrmDashboardPageProps {
  onNavigate?: (route: string) => void;
}

/** Cấu hình màu 3 phân khu — mỗi phân khu 1 họ token riêng */
const PHASE_STYLES = {
  TESLA: { chip: 'bg-brand-success-soft', chipText: 'text-brand-success', bar: 'bg-brand-success' },
  CANTATA: { chip: 'bg-accent-soft', chipText: 'text-accent-ink', bar: 'bg-accent' },
  NOXH: { chip: 'bg-brand-teal-soft', chipText: 'text-brand-teal', bar: 'bg-brand-teal' },
} as const;

const FUNNEL_STAGES: { key: string; label: string; route: string; isFinal?: boolean }[] = [
  { key: 'leads', label: '1. Khách Hàng (Leads)', route: 'crm/leads' },
  { key: 'cart', label: '2. Giỏ Hàng (Cart)', route: 'crm/bookings' },
  { key: 'bookings', label: '3. Giữ Chỗ (Lock)', route: 'crm/bookings' },
  { key: 'deposits', label: '4. Đặt Cọc (PDC)', route: 'crm/deposits' },
  { key: 'contracts', label: '5. Ký HĐMB', route: 'crm/contracts' },
  { key: 'handedOver', label: '6. Đã Bàn Giao', route: 'crm/handover', isFinal: true },
];

export const CrmDashboardPage: React.FC<CrmDashboardPageProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKpiMetrics();
  }, []);

  const loadKpiMetrics = async () => {
    try {
      setLoading(true);
      const res: any = await api.get('/crm/handover/analytics/executive-kpis');
      if (res && res.success) {
        setMetrics(res.metrics);
      }
    } catch (err) {
      console.error('Failed to load executive KPI metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const nav = (path: string) => {
    if (onNavigate) onNavigate(path);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* ── Hero Band: quiet luxury trên nền teal thương hiệu ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sidebar-bg to-sidebar-bg-2 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-white/50">
              Thành Phố Cà Phê · Kinh Doanh Bất Động Sản
            </p>
            <h1 className="mt-2 font-serif text-2xl sm:text-3xl font-semibold text-bg leading-tight">
              Executive CRM &amp; Business Intelligence
            </h1>
            <p className="mt-2 text-sm text-white/60 max-w-2xl">
              Tổng quan kinh doanh BĐS, tỷ lệ hấp thụ kho hàng (TESLA, CANTATA, NOXH) &amp; dự thu
              dòng tiền toàn dự án
            </p>
          </div>
          <button
            onClick={loadKpiMetrics}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span>Làm mới số liệu</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-ink-faint bg-surface rounded-2xl border border-brand-border">
          <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto text-accent mb-2" />
          <p className="text-xs font-semibold text-ink-soft">Đang tổng hợp dữ liệu kinh doanh toàn dự án...</p>
        </div>
      ) : (
        <>
          {/* ── Executive KPI Summary Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface p-5 rounded-xl border border-brand-border shadow-sm space-y-2">
              <div className="flex justify-between items-center text-xs text-ink-soft">
                <span>Tổng Doanh Thu Ký Kết</span>
                <DocumentTextIcon className="w-5 h-5 text-accent" />
              </div>
              <div className="text-xl font-bold text-ink font-mono tabular-nums">
                {Number(metrics?.totalContractRevenue || 0).toLocaleString('vi-VN')} ₫
              </div>
              <div className="text-[11px] text-ink-soft">
                Đã thu hồi:{' '}
                <strong className="text-brand-success font-mono tabular-nums">
                  {Number(metrics?.totalCollectedAmount || 0).toLocaleString('vi-VN')} ₫
                </strong>
              </div>
            </div>

            <div className="bg-surface p-5 rounded-xl border border-brand-border shadow-sm space-y-2">
              <div className="flex justify-between items-center text-xs text-ink-soft">
                <span>Dư Nợ Còn Phải Thu</span>
                <BanknotesIcon className="w-5 h-5 text-brand-warning" />
              </div>
              <div className="text-xl font-bold text-brand-warning font-mono tabular-nums">
                {Number(metrics?.totalRemainingDebt || 0).toLocaleString('vi-VN')} ₫
              </div>
              <div className="text-[11px] text-ink-soft">
                Phân bổ theo LTT 10 đợt chuẩn thực tế
              </div>
            </div>

            <div className="bg-surface p-5 rounded-xl border border-brand-border shadow-sm space-y-2">
              <div className="flex justify-between items-center text-xs text-ink-soft">
                <span>Dự Thu Dòng Tiền 30 Ngày Tới</span>
                <ArrowTrendingUpIcon className="w-5 h-5 text-brand-teal" />
              </div>
              <div className="text-xl font-bold text-brand-teal font-mono tabular-nums">
                {Number(metrics?.forecastCashflow?.next30Days || 0).toLocaleString('vi-VN')} ₫
              </div>
              <div className="text-[11px] text-ink-soft">
                60 ngày:{' '}
                <strong className="font-mono tabular-nums">
                  {Number(metrics?.forecastCashflow?.next60Days || 0).toLocaleString('vi-VN')} ₫
                </strong>
              </div>
            </div>

            <div className="bg-surface p-5 rounded-xl border border-brand-border shadow-sm space-y-2">
              <div className="flex justify-between items-center text-xs text-ink-soft">
                <span>Nợ Quá Hạn Cần Thu</span>
                <ClockIcon className="w-5 h-5 text-brand-danger" />
              </div>
              <div className="text-xl font-bold text-brand-danger font-mono tabular-nums">
                {Number(metrics?.totalOverdueAmount || 0).toLocaleString('vi-VN')} ₫
              </div>
              <div className="text-[11px] text-brand-danger/80">
                Gồm {metrics?.overduePaymentsCount || 0} đợt chậm trả (Lãi 0.05%/ngày)
              </div>
            </div>
          </div>

          {/* ── Absorption Rate By Real Estate Phase ── */}
          <div className="bg-surface rounded-2xl border border-brand-border p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <BuildingOfficeIcon className="w-5 h-5 text-accent" />
              Tỷ Lệ Hấp Thụ Kho Hàng Theo Phân Khu (Absorption Rate)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(
                [
                  { id: 'TESLA', name: 'Phân khu TESLA', desc: 'Biệt thự sinh thái & Nhà vườn' },
                  { id: 'CANTATA', name: 'Phân khu CANTATA', desc: 'Nhà phố thương mại Shophouse' },
                  { id: 'NOXH', name: 'Nhà Ở Xã Hội (NOXH)', desc: 'Cao tầng phân theo tầng & căn' },
                ] as const
              ).map((phase) => {
                const s = PHASE_STYLES[phase.id];
                const rate = metrics?.absorptionByPhase?.[phase.id]?.rate || 0;
                return (
                  <div key={phase.id} className="p-4 bg-surface rounded-xl border border-brand-border space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-ink text-sm">{phase.name}</h3>
                        <p className="text-[11px] text-ink-soft">{phase.desc}</p>
                      </div>
                      <span className={`text-xl font-bold font-mono tabular-nums px-2 py-0.5 rounded-md ${s.chip} ${s.chipText}`}>
                        {rate}%
                      </span>
                    </div>

                    <div className="w-full bg-surface-alt h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.bar} transition-all duration-500`}
                        style={{ width: `${rate}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-3 text-center text-xs pt-1">
                      <div>
                        <span className="text-ink-soft block text-[10px]">Tổng số</span>
                        <strong className="text-ink font-mono tabular-nums">
                          {metrics?.absorptionByPhase?.[phase.id]?.total || 0}
                        </strong>
                      </div>
                      <div>
                        <span className={`block text-[10px] ${s.chipText}`}>Đã bán</span>
                        <strong className={`font-mono tabular-nums ${s.chipText}`}>
                          {metrics?.absorptionByPhase?.[phase.id]?.sold || 0}
                        </strong>
                      </div>
                      <div>
                        <span className="text-ink-soft block text-[10px]">Sẵn bán</span>
                        <strong className="text-ink font-mono tabular-nums">
                          {metrics?.absorptionByPhase?.[phase.id]?.available || 0}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Sales Pipeline Funnel ── */}
          <div className="bg-surface rounded-2xl border border-brand-border p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-ink">
              Phễu Chuyển Đổi Kinh Doanh Toàn Trình (Sales Pipeline Conversion)
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
              {FUNNEL_STAGES.map((stage) => (
                <button
                  key={stage.key}
                  onClick={() => nav(stage.route)}
                  className={`p-3 rounded-xl border transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                    stage.isFinal
                      ? 'bg-brand-success-soft/40 border-brand-success/30 hover:border-brand-success'
                      : 'bg-surface-alt/60 border-transparent hover:border-accent/40'
                  }`}
                >
                  <span className="text-[10px] text-ink-soft block mb-0.5">{stage.label}</span>
                  <strong
                    className={`text-lg font-bold font-mono tabular-nums ${
                      stage.isFinal ? 'text-brand-success' : 'text-ink'
                    }`}
                  >
                    {metrics?.funnel?.[stage.key] || 0}
                  </strong>
                </button>
              ))}
            </div>
          </div>

          {/* ── Quick Navigation Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { route: 'crm/sales-matrix', title: 'Ma Trận Bán Hàng', sub: 'Tồn kho 3 phân khu', Icon: BuildingOfficeIcon, chip: 'bg-accent-soft text-accent-ink' },
              { route: 'crm/inventory', title: 'Quản Lý Kho Căn', sub: 'Thêm, sửa, xóa sản phẩm', Icon: BuildingOfficeIcon, chip: 'bg-brand-teal-soft text-brand-teal' },
              { route: 'crm/bookings', title: 'Giỏ Hàng & Giữ Chỗ', sub: 'Khóa căn 7 ngày', Icon: ClockIcon, chip: 'bg-brand-warning-soft text-brand-warning' },
              { route: 'crm/deposits', title: 'Phiếu Đặt Cọc (PDC)', sub: 'Xác nhận tiền & Chuyển căn', Icon: BanknotesIcon, chip: 'bg-accent-soft text-accent-ink' },
              { route: 'crm/handover', title: 'Bàn Giao & Vận Hành', sub: 'Snag List & Operations', Icon: SparklesIcon, chip: 'bg-brand-teal-soft text-brand-teal' },
            ].map((item) => (
              <button
                key={item.route + item.title}
                onClick={() => nav(item.route)}
                className="p-3.5 bg-surface rounded-xl border border-brand-border shadow-sm text-left hover:border-accent/40 hover:shadow-md transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <div>
                  <strong className="text-xs font-bold text-ink block">{item.title}</strong>
                  <span className="text-[10px] text-ink-soft">{item.sub}</span>
                </div>
                <span className={`p-2 rounded-lg shrink-0 ${item.chip}`}>
                  <item.Icon className="w-5 h-5" />
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CrmDashboardPage;
