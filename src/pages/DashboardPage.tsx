import React, { useMemo } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Apartment, Resident, AmenityUsage, Occupancy, Feedback } from '../types';
import {
  UsersIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
  ChatBubbleBottomCenterTextIcon,
  UserPlusIcon,
  BanknotesIcon,
  BoltIcon,
  MegaphoneIcon,
  ArrowRightIcon,
} from '../components/icons';
import { StatCard } from '../components/ui/Card';

interface DashboardPageProps {
  apartments: Apartment[];
  residents: Resident[];
  amenityUsages?: AmenityUsage[];
  occupancies: Occupancy[];
  feedback: Feedback[];
  onNavigate?: (view: string) => void;
}

const RING_R = 15;
const RING_C = 2 * Math.PI * RING_R;

export const DashboardPage: React.FC<DashboardPageProps> = ({
  apartments,
  residents,
  amenityUsages,
  occupancies,
  feedback,
  onNavigate,
}) => {
  const totalApartments = apartments.length;
  const occupiedApartments = useMemo(
    () => apartments.filter((apt) => occupancies.some((o) => o.apartmentId === apt.id)).length,
    [apartments, occupancies]
  );
  const activeResidents = useMemo(() => residents.filter((r) => r.isActive !== false).length, [residents]);
  const occupancyRate = totalApartments > 0 ? Math.round((occupiedApartments / totalApartments) * 100) : 0;

  const openFeedback = useMemo(() => feedback.filter((f) => f.status !== 'RESOLVED'), [feedback]);
  const latestFeedback = useMemo(
    () => [...openFeedback].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).slice(0, 5),
    [openFeedback]
  );

  // Phân bổ theo tòa — real-time từ căn hộ & cư dân
  const blockEntries = useMemo(() => {
    const map: Record<string, number> = {};
    apartments.forEach((apt) => {
      const block = apt.code.includes('-') ? apt.code.split('-')[0] : apt.code.slice(0, 5);
      map[block] =
        (map[block] || 0) + occupancies.filter((o) => o.apartmentId === apt.id).length;
    });
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    if (total === 0) {
      apartments.forEach((apt) => {
        const block = apt.code.includes('-') ? apt.code.split('-')[0] : apt.code.slice(0, 5);
        map[block] = (map[block] || 0) + 1;
      });
    }
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [apartments, occupancies]);
  const maxBlock = Math.max(...blockEntries.map(([, v]) => v), 1);

  // ⚠️ Dữ liệu mẫu — chưa có API doanh thu thực
  const revenueDemo = [
    { m: 'T4', v: 186 },
    { m: 'T5', v: 201 },
    { m: 'T6', v: 194 },
    { m: 'T7', v: 212 },
    { m: 'T8', v: 229 },
    { m: 'T9', v: 238 },
  ];

  const quickActions = [
    { label: 'Cư dân', sub: 'Hồ sơ & hộ khẩu', Icon: UserPlusIcon, target: 'residents' },
    { label: 'Hóa đơn', sub: 'Kỳ tháng này', Icon: BanknotesIcon, target: 'unified-billing' },
    { label: 'Điện nước', sub: 'Ghi chỉ số', Icon: BoltIcon, target: 'utilities' },
    { label: 'Thông báo', sub: 'Đăng tin cư dân', Icon: MegaphoneIcon, target: 'announcements' },
  ];

  const cardBase =
    'bg-surface border border-brand-border rounded-xl p-5 shadow-sm text-left cursor-pointer hover:border-accent/40 hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Tổng quan</h1>
          <p className="text-sm text-ink-soft mt-0.5">
            Cập nhật{' '}
            {new Date().toLocaleDateString('vi-VN', {
              weekday: 'long',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </p>
        </div>
        {apartments.length === 0 && residents.length === 0 && (
          <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-brand-warning-soft text-brand-warning border border-brand-warning/25">
            Chưa có dữ liệu — kiểm tra kết nối hệ thống
          </span>
        )}
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Cư dân đang ở"
          value={activeResidents}
          unit="người"
          subValue={`${residents.length} hồ sơ cư dân`}
          subTone="neutral"
          icon={UsersIcon}
          iconBg="bg-accent-soft"
          iconColor="text-accent-ink"
          accentTone="teal"
          onClick={() => onNavigate?.('residents')}
          className="motion-safe:animate-fade-in [animation-fill-mode:both]"
        />

        <button onClick={() => onNavigate?.('apartments')} className={`${cardBase} flex items-center justify-between gap-3 motion-safe:animate-fade-in [animation-fill-mode:both] relative overflow-hidden`} style={{ animationDelay: '60ms' }}>
          <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-brand-teal" />
          <div>
            <span className="inline-flex p-2 bg-brand-teal-soft rounded-lg text-brand-teal mb-3">
              <BuildingOfficeIcon className="w-5 h-5" />
            </span>
            <p className="text-xs font-medium text-ink-soft">Tỷ lệ lấp đầy</p>
            <p className="text-3xl font-mono tabular-nums font-bold text-ink mt-1 leading-none">{occupancyRate}%</p>
            <p className="text-xs text-ink-soft mt-2">
              {occupiedApartments}/{totalApartments} căn hộ có cư dân
            </p>
          </div>
          <svg viewBox="0 0 40 40" className="w-12 h-12 shrink-0 -rotate-90" role="img" aria-label={`Lấp đầy ${occupancyRate}%`}>
            <circle cx="20" cy="20" r={RING_R} fill="none" stroke="#EAEDE6" strokeWidth="5" />
            <circle
              cx="20"
              cy="20"
              r={RING_R}
              fill="none"
              stroke="#3E6E64"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${RING_C - RING_C * (occupancyRate / 100)} ${RING_C}`}
            />
          </svg>
        </button>

        <StatCard
          label="Phản ánh đang mở"
          value={openFeedback.length}
          subValue="Cần được xử lý"
          subTone="neutral"
          valueTone="danger"
          icon={ExclamationTriangleIcon}
          iconBg="bg-brand-danger-soft"
          iconColor="text-brand-danger"
          accentTone="danger"
          onClick={() => onNavigate?.('feedback')}
          className="motion-safe:animate-fade-in [animation-fill-mode:both]"
        />

        <StatCard
          label="Đặt tiện ích chờ duyệt"
          value={(amenityUsages || []).filter((u) => u.status === 'PENDING').length}
          subValue="Toàn bộ thời gian"
          subTone="neutral"
          valueTone="warning"
          icon={ChatBubbleBottomCenterTextIcon}
          iconBg="bg-brand-warning-soft"
          iconColor="text-brand-warning"
          accentTone="warning"
          onClick={() => onNavigate?.('amenities')}
          className="motion-safe:animate-fade-in [animation-fill-mode:both]"
        />
      </div>

      {/* ── Row 2: Doanh thu (demo) + Phản ánh mới nhất ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface border border-brand-border rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between border-b border-brand-border pb-3.5 mb-4">
            <h2 className="text-base font-bold text-ink">Doanh thu 6 tháng gần nhất</h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-warning-soft text-brand-warning">
              Dữ liệu mẫu
            </span>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueDemo} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <XAxis
                  dataKey="m"
                  tick={{ fill: '#5A6960', fontSize: 11 }}
                  axisLine={{ stroke: '#DFE2D9' }}
                  tickLine={false}
                />
                <YAxis tick={{ fill: '#8B978E', fontSize: 11 }} axisLine={false} tickLine={false} unit=" tr" />
                <Tooltip
                  cursor={{ fill: '#EAEDE6', opacity: 0.5 }}
                  contentStyle={{
                    background: '#FFFFFF',
                    border: '1px solid #DFE2D9',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(value) => [`${value} triệu ₫`, 'Doanh thu']}
                />
                <Bar dataKey="v" radius={[6, 6, 0, 0]}>
                  {revenueDemo.map((entry, i) => (
                    <Cell
                      key={entry.m}
                      fill={i === revenueDemo.length - 1 ? '#B8722E' : '#E1B48E'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface border border-brand-border rounded-xl shadow-sm p-5 flex flex-col">
          <h2 className="text-base font-bold text-ink border-b border-brand-border pb-3.5 mb-4">
            Phản ánh mới nhất
          </h2>
          {latestFeedback.length === 0 ? (
            <p className="text-sm text-ink-soft py-10 text-center">Không có phản ánh đang mở</p>
          ) : (
            <ul className="space-y-3 flex-1">
              {latestFeedback.map((fb) => (
                <li key={fb.id} className="flex items-start gap-2.5">
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-warning shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm text-ink line-clamp-2">{fb.content}</p>
                    <p className="text-[11px] text-ink-faint mt-0.5">
                      {fb.apartmentCode ? `${fb.apartmentCode} · ` : ''}
                      {new Date(fb.submittedAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={() => onNavigate?.('feedback')}
            className="mt-4 pt-3 border-t border-brand-border inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover transition-colors cursor-pointer self-start"
          >
            Xem tất cả phản ánh
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Row 3: Phân bổ tòa + Truy cập nhanh ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-brand-border rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between border-b border-brand-border pb-3.5 mb-4">
            <h2 className="text-base font-bold text-ink">Phân bổ cư dân theo Tòa</h2>
            <span className="text-xs font-medium text-ink-soft bg-surface-alt px-2.5 py-0.5 rounded-md">
              Real-time
            </span>
          </div>
          {blockEntries.length === 0 ? (
            <p className="text-center py-10 text-ink-soft text-sm">Chưa có dữ liệu cư dân theo tòa</p>
          ) : (
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {blockEntries.map(([block, count]) => (
                <div key={block} className="space-y-1.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-ink font-mono">{block}</span>
                    <span className="text-xs text-ink-soft">
                      <strong className="font-bold text-ink mr-1">{count}</strong>cư dân
                    </span>
                  </div>
                  <div className="w-full bg-surface-alt rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-brand-teal h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${Math.max(4, (count / maxBlock) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface border border-brand-border rounded-xl shadow-sm p-5">
          <h2 className="text-base font-bold text-ink border-b border-brand-border pb-3.5 mb-4">
            Truy cập nhanh
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickActions.map(({ label, sub, Icon, target }) => (
              <button
                key={label}
                onClick={() => onNavigate?.(target)}
                className="group flex items-center justify-between gap-3 p-3.5 rounded-xl border border-brand-border bg-surface hover:border-accent/40 hover:shadow-md transition-all duration-200 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <span className="min-w-0">
                  <strong className="text-xs font-bold text-ink block">{label}</strong>
                  <span className="text-[11px] text-ink-soft">{sub}</span>
                </span>
                <span className="p-2 rounded-lg bg-accent-soft text-accent-ink shrink-0 group-hover:bg-accent group-hover:text-white transition-colors">
                  <Icon className="w-5 h-5" />
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
