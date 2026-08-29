import React from 'react';
import type { UnifiedBillingRecord } from './UnifiedHistoryView';
import {
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  DocumentArrowDownIcon,
  EnvelopeIcon,
} from '../../components/icons';
import { EmptyState } from '../../components/ui';
import { StatCard } from '../../components/ui/Card';

interface ComputedSummary {
  total_electricity: number;
  total_electricity_tax: number;
  paid_electricity: number;
  total_water: number;
  total_water_tax: number;
  paid_water: number;
  total_management_fee: number;
  paid_management_fee: number;
  grand_total: number;
  paid_grand_total: number;
  recordsCount: number;
}

interface UnifiedMonthlyViewProps {
  computedSummary: ComputedSummary;
  filteredData: UnifiedBillingRecord[];
  totalRecordsCount: number;
  loading: boolean;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  apartmentFilter: string;
  setApartmentFilter: (filter: string) => void;
  onSendResultEmail: (record: UnifiedBillingRecord) => void;
  onViewDetail: (record: UnifiedBillingRecord) => void;
  onUpdateStatus: (record: UnifiedBillingRecord, newStatus: 'PAID' | 'UNPAID') => void;
  updatingStatus: string | null;
  sendingEmail: boolean;
  formatCurrency: (value: number) => string;
  getStatusBadge: (status: string) => React.ReactNode;
}

const STATUS_CHIPS = [
  { value: '', label: 'Tất cả' },
  { value: 'PAID', label: 'Đã thanh toán' },
  { value: 'UNPAID', label: 'Chưa thanh toán' },
  { value: 'PARTIAL', label: 'Thanh toán 1 phần' },
];

const RING_RADIUS = 26;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export const UnifiedMonthlyView: React.FC<UnifiedMonthlyViewProps> = ({
  computedSummary,
  filteredData,
  totalRecordsCount,
  loading,
  statusFilter,
  setStatusFilter,
  apartmentFilter,
  setApartmentFilter,
  onSendResultEmail,
  onViewDetail,
  onUpdateStatus,
  updatingStatus,
  sendingEmail,
  formatCurrency,
  getStatusBadge,
}) => {
  const outstanding = computedSummary.grand_total - computedSummary.paid_grand_total;
  const collectionRate =
    computedSummary.grand_total > 0
      ? Math.min(100, Math.round((computedSummary.paid_grand_total / computedSummary.grand_total) * 100))
      : 0;
  const ringOffset = RING_CIRCUMFERENCE * (1 - collectionRate / 100);

  const totals = React.useMemo(() => {
    return filteredData.reduce(
      (acc, r) => {
        const eTax = Number(r.electricity_tax || 0);
        const wTax = Number(r.water_tax || 0);
        acc.elec += Number(r.electricity_cost || 0) - eTax;
        acc.elecTax += eTax;
        acc.water += Number(r.water_cost || 0) - wTax;
        acc.waterTax += wTax;
        acc.mgmt += Number(r.management_fee_cost || 0);
        acc.grand += Number(r.grand_total || 0);
        return acc;
      },
      { elec: 0, elecTax: 0, water: 0, waterTax: 0, mgmt: 0, grand: 0 }
    );
  }, [filteredData]);

  return (
    <div className="space-y-6">
      {/* ── 4 KPI Summary Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tổng phát sinh"
          subValue={`${computedSummary.recordsCount} căn hộ`}
          subTone="neutral"
          value={formatCurrency(computedSummary.grand_total)}
          icon={BanknotesIcon}
          iconBg="bg-accent-soft"
          iconColor="text-accent-ink"
        />

        {/* Đã thu */}
        <div className="bg-surface rounded-xl p-5 border border-brand-border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-brand-success-soft rounded-lg text-brand-success">
              <CheckCircleIcon className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-ink-soft">
              {computedSummary.grand_total > 0
                ? `${Math.round((computedSummary.paid_grand_total / computedSummary.grand_total) * 100)}%`
                : '—'}
            </span>
          </div>
          <p className="text-xs font-medium text-ink-soft">Đã thu</p>
          <p className="text-2xl font-mono tabular-nums font-bold text-brand-success mt-1">
            {formatCurrency(computedSummary.paid_grand_total)}
          </p>
          <div className="w-full h-1.5 bg-surface-alt rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-brand-success rounded-full transition-all duration-300"
              style={{
                width: `${
                  computedSummary.grand_total > 0
                    ? Math.min(100, (computedSummary.paid_grand_total / computedSummary.grand_total) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        <StatCard
          label="Còn nợ"
          subValue={`Thuế phải thu: ${formatCurrency(computedSummary.total_electricity_tax + computedSummary.total_water_tax)}`}
          subTone="neutral"
          value={formatCurrency(outstanding)}
          valueTone="danger"
          icon={ExclamationTriangleIcon}
          iconBg="bg-brand-danger-soft"
          iconColor="text-brand-danger"
        />

        {/* Tỷ lệ thu */}
        <div className="bg-surface rounded-xl p-5 border border-brand-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-ink-soft mb-1">Tỷ lệ thu</p>
            <p className="text-2xl font-mono tabular-nums font-bold text-accent">{collectionRate}%</p>
            <p className="text-[11px] text-ink-soft mt-2">
              Mục tiêu kỳ {new Date().getFullYear()}
            </p>
          </div>
          <div className="relative w-16 h-16 shrink-0" role="img" aria-label={`Tỷ lệ thu ${collectionRate}%`}>
            <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
              <circle cx="32" cy="32" r={RING_RADIUS} fill="none" stroke="#EAEDE6" strokeWidth="6" />
              <circle
                cx="32"
                cy="32"
                r={RING_RADIUS}
                fill="none"
                stroke="#B8722E"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${RING_CIRCUMFERENCE - ringOffset} ${RING_CIRCUMFERENCE}`}
                className="transition-all duration-500"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Search & Status Chips Toolbar ── */}
      <div className="bg-surface rounded-xl shadow-sm border border-brand-border p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-faint">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <input
              type="text"
              value={apartmentFilter}
              onChange={(e) => setApartmentFilter(e.target.value)}
              placeholder="Tìm theo mã căn hộ (VD: CAN03-01)..."
              className="w-full pl-10 pr-9 py-2 text-sm border border-brand-border rounded-lg bg-surface-alt/50 text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent focus:bg-surface transition-colors"
            />
            {apartmentFilter && (
              <button
                onClick={() => setApartmentFilter('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-faint hover:text-ink transition-colors cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Status Filter Chips */}
          <div role="group" aria-label="Lọc theo trạng thái" className="flex items-center gap-1.5 flex-wrap">
            {STATUS_CHIPS.map((chip) => {
              const active = statusFilter === chip.value;
              return (
                <button
                  key={chip.value}
                  onClick={() => setStatusFilter(chip.value)}
                  aria-pressed={active}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors duration-200 cursor-pointer ${
                    active
                      ? 'bg-accent text-white border-accent'
                      : 'bg-surface text-ink-soft border-brand-border hover:text-ink hover:border-accent/40'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
            {(apartmentFilter || statusFilter !== '') && (
              <button
                onClick={() => {
                  setApartmentFilter('');
                  setStatusFilter('');
                }}
                className="px-3 py-1.5 text-xs font-semibold text-brand-danger hover:bg-brand-danger-soft rounded-full transition-colors border border-transparent hover:border-brand-danger/20 whitespace-nowrap cursor-pointer"
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
          <div className="flex items-center justify-center p-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            <p className="ml-3 text-ink-soft font-medium text-sm">Đang tải dữ liệu hóa đơn tổng hợp...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <EmptyState
            icon={DocumentArrowDownIcon}
            title="Chưa có dữ liệu hóa đơn cho bộ lọc này"
            description="Thử thay đổi từ khóa tìm kiếm hoặc chọn tháng/năm khác."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-alt border-b border-brand-border text-[11px] font-bold text-ink-soft uppercase tracking-wider">
                  <th className="py-3 px-4 whitespace-nowrap">Căn Hộ</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Tiền Điện</th>
                  <th className="py-3 px-2 text-right whitespace-nowrap font-medium">Thuế Điện</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Tiền Nước</th>
                  <th className="py-3 px-2 text-right whitespace-nowrap font-medium">Thuế Nước</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap bg-accent-soft/25 text-accent-ink">
                    Phí Quản Lý
                  </th>
                  <th className="py-3 px-3 text-right whitespace-nowrap font-bold text-ink">
                    Tổng Phải Thu
                  </th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Tình Trạng</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {filteredData.map((record) => {
                  const displayElecTax = Number(record.electricity_tax || 0);
                  const displayWaterTax = Number(record.water_tax || 0);
                  const displayElecBaseCost = Number(record.electricity_cost || 0) - displayElecTax;
                  const displayWaterBaseCost = Number(record.water_cost || 0) - displayWaterTax;
                  const isPaid = record.combined_status === 'PAID';

                  return (
                    <tr key={record.apartment_id} className="hover:bg-surface-alt/60 transition-colors duration-150 group">
                      {/* Căn hộ */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 font-mono font-semibold px-2 py-0.5 rounded-md bg-surface-alt text-ink border border-brand-border">
                          <BuildingOfficeIcon className="w-3.5 h-3.5 text-ink-soft" />
                          {record.apartment_code}
                        </span>
                      </td>

                      {/* Tiền điện */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-ink whitespace-nowrap">
                        {displayElecBaseCost > 0 ? formatCurrency(displayElecBaseCost) : '-'}
                      </td>
                      <td className="py-3 px-2 text-right font-mono tabular-nums text-ink-soft whitespace-nowrap">
                        {displayElecTax > 0 ? formatCurrency(displayElecTax) : '-'}
                      </td>

                      {/* Tiền nước */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-ink whitespace-nowrap">
                        {displayWaterBaseCost > 0 ? formatCurrency(displayWaterBaseCost) : '-'}
                      </td>
                      <td className="py-3 px-2 text-right font-mono tabular-nums text-ink-soft whitespace-nowrap">
                        {displayWaterTax > 0 ? formatCurrency(displayWaterTax) : '-'}
                      </td>

                      {/* Phí quản lý */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-accent-ink bg-accent-soft/20 whitespace-nowrap">
                        {record.management_fee_cost > 0
                          ? formatCurrency(record.management_fee_cost)
                          : '-'}
                      </td>

                      {/* Tổng cộng */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-ink text-sm whitespace-nowrap">
                        {formatCurrency(record.grand_total)}
                      </td>

                      {/* Tình trạng */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {getStatusBadge(record.combined_status)}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onSendResultEmail(record)}
                            disabled={sendingEmail}
                            className="p-1.5 rounded-lg border border-brand-border bg-surface text-ink-soft hover:text-accent hover:border-accent/40 transition-colors shadow-xs cursor-pointer"
                            title="Gửi email thông báo"
                            aria-label={`Gửi email cho căn ${record.apartment_code}`}
                          >
                            <EnvelopeIcon className="w-3.5 h-3.5" />
                          </button>
                          {record.utility_id || record.management_fee_id ? (
                            <button
                              onClick={() => onViewDetail(record)}
                              className="px-2.5 py-1 bg-surface-alt text-ink rounded-lg text-[11px] font-semibold hover:border-accent/40 border border-brand-border transition-colors cursor-pointer"
                            >
                              Chi tiết
                            </button>
                          ) : (
                            <span className="text-ink-faint text-xs px-2">Trống</span>
                          )}
                          {isPaid && (
                            <a
                              href={`/api/vnpt-invoice/download-pdf?type=unified&id=${record.utility_id || ''}&apartmentId=${record.apartment_id}&apartmentCode=${record.apartment_code}&month=${record.month}&year=${record.year}`}
                              download={`HDDT_${record.apartment_code}_${String(record.month).padStart(2, '0')}${record.year}.pdf`}
                              className="px-2 py-1 text-brand-danger bg-brand-danger-soft hover:bg-brand-danger-soft/70 rounded-lg text-[11px] font-bold border border-brand-danger/20 transition-colors"
                              title="Tải PDF HĐĐT"
                            >
                              PDF
                            </a>
                          )}
                          <button
                            onClick={() =>
                              onUpdateStatus(record, isPaid ? 'UNPAID' : 'PAID')
                            }
                            disabled={updatingStatus === record.apartment_id}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors shadow-xs cursor-pointer disabled:opacity-50 ${
                              isPaid
                                ? 'bg-brand-success-soft text-brand-success border border-brand-success/25'
                                : 'bg-accent text-white hover:bg-accent-hover'
                            }`}
                          >
                            {isPaid && <CheckCircleIcon className="w-3 h-3" />}
                            {isPaid ? 'Đã thu' : 'Thu tiền'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Totals Row */}
                <tr className="bg-surface-alt/80 border-t-2 border-accent/30 font-semibold">
                  <td className="py-3 px-4 text-ink whitespace-nowrap">Tổng cộng</td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-ink whitespace-nowrap">
                    {formatCurrency(totals.elec)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono tabular-nums text-ink-soft whitespace-nowrap">
                    {formatCurrency(totals.elecTax)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-ink whitespace-nowrap">
                    {formatCurrency(totals.water)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono tabular-nums text-ink-soft whitespace-nowrap">
                    {formatCurrency(totals.waterTax)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-accent-ink bg-accent-soft/25 whitespace-nowrap">
                    {formatCurrency(totals.mgmt)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-ink text-sm whitespace-nowrap">
                    {formatCurrency(totals.grand)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ── Table Footer & Stats Summary ── */}
        <div className="bg-surface-alt/60 border-t border-brand-border px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-soft font-medium">
          <div className="flex items-center gap-2">
            <span>
              Đang hiển thị <strong className="text-ink font-bold">{filteredData.length}</strong> /{' '}
              <strong className="text-ink font-bold">{totalRecordsCount}</strong> căn hộ
            </span>
            {filteredData.length < totalRecordsCount && (
              <span className="bg-accent-soft text-accent-ink px-2 py-0.5 rounded-full font-semibold text-[11px]">
                Đang áp dụng bộ lọc
              </span>
            )}
          </div>
          <div className="text-[11px] text-ink-faint">
            Hệ thống hóa đơn tổng hợp Ban Quản Lý Thành Phố Cà Phê
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedMonthlyView;
