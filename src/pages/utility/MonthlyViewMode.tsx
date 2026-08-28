import React from 'react';
import type { Apartment, UtilityRecord } from '../../types';
import { EnvelopeIcon, MagnifyingGlassIcon, BoltIcon, BanknotesIcon, CheckCircleIcon, ArrowPathIcon } from '../../components/icons';

interface MonthlyStats {
  totalElectricity: number;
  totalElectricityTax: number;
  paidElectricity: number;
  unpaidElectricity: number;
  totalWater: number;
  totalWaterTax: number;
  paidWater: number;
  unpaidWater: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  recordsCount: number;
}

interface MonthlyRecordItem {
  apartment: Apartment;
  record: UtilityRecord | undefined;
}

interface MonthlyViewModeProps {
  selectedMonth: number;
  selectedYear: number;
  monthlyStats: MonthlyStats;
  apartments: Apartment[];
  filteredMonthlyRecords: MonthlyRecordItem[];
  apartmentFilter: string;
  setApartmentFilter: (filter: string) => void;
  filterStatus: 'ALL' | 'PAID' | 'UNPAID';
  setFilterStatus: (status: 'ALL' | 'PAID' | 'UNPAID') => void;
  onSendEmail: (recordId: string) => void;
  onViewDetail: (record: UtilityRecord, apartmentCode: string) => void;
  onUpdatePaymentStatus: (recordId: string, status: 'PAID' | 'UNPAID') => void;
  calculateElectricityCost: (consumption: number) => number;
  formatCurrency: (value: number) => string;
  waterPrice: number;
}

export const MonthlyViewMode: React.FC<MonthlyViewModeProps> = ({
  selectedMonth,
  selectedYear,
  monthlyStats,
  apartments,
  filteredMonthlyRecords,
  apartmentFilter,
  setApartmentFilter,
  filterStatus,
  setFilterStatus,
  onSendEmail,
  onViewDetail,
  onUpdatePaymentStatus,
  calculateElectricityCost,
  formatCurrency,
  waterPrice,
}) => {
  return (
    <div className="space-y-6">
      {/* Title */}
      <h3 className="text-base sm:text-lg font-bold text-ink">
        Tổng quan Tháng {selectedMonth}/{selectedYear}
      </h3>

      {/* Statistics Cards */}
      {filteredMonthlyRecords.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Electricity */}
          <div className="bg-surface rounded-xl p-4 border border-brand-border shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <BoltIcon className="w-6 h-6 text-brand-warning" />
              <span className="text-xs font-semibold text-brand-warning bg-brand-warning-soft px-2 py-0.5 rounded-full">
                {monthlyStats.recordsCount}/{apartments.length} căn hộ
              </span>
            </div>
            <p className="text-xs font-medium text-ink-soft">Tổng Tiền Điện</p>
            <p className="text-xl font-bold text-brand-warning mt-0.5 font-mono tabular-nums">
              {formatCurrency(monthlyStats.totalElectricity)}
            </p>
            <p className="text-[11px] text-brand-warning mt-0.5 font-mono tabular-nums opacity-80">
              Thuế: {formatCurrency(monthlyStats.totalElectricityTax)}
            </p>
            <div className="flex justify-between text-xs pt-3 mt-3 border-t border-brand-border font-medium font-mono tabular-nums">
              <span className="text-brand-success">
                Đã thu: {formatCurrency(monthlyStats.paidElectricity)}
              </span>
              <span className="text-brand-warning">
                Chưa thu: {formatCurrency(monthlyStats.unpaidElectricity)}
              </span>
            </div>
          </div>

          {/* Total Water */}
          <div className="bg-surface rounded-xl p-4 border border-brand-border shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-brand-teal">Nước</span>
              <span className="text-xs font-semibold text-brand-teal bg-brand-teal-soft px-2 py-0.5 rounded-full">
                {monthlyStats.recordsCount}/{apartments.length} căn hộ
              </span>
            </div>
            <p className="text-xs font-medium text-ink-soft">Tổng Tiền Nước</p>
            <p className="text-xl font-bold text-brand-teal mt-0.5 font-mono tabular-nums">
              {formatCurrency(monthlyStats.totalWater)}
            </p>
            <p className="text-[11px] text-brand-warning mt-0.5 font-mono tabular-nums opacity-80">
              Thuế: {formatCurrency(monthlyStats.totalWaterTax)}
            </p>
            <div className="flex justify-between text-xs pt-3 mt-3 border-t border-brand-border font-medium font-mono tabular-nums">
              <span className="text-brand-success">
                Đã thu: {formatCurrency(monthlyStats.paidWater)}
              </span>
              <span className="text-brand-warning">
                Chưa thu: {formatCurrency(monthlyStats.unpaidWater)}
              </span>
            </div>
          </div>

          {/* Total Revenue */}
          <div className="bg-surface rounded-xl p-4 border border-brand-border shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <BanknotesIcon className="w-6 h-6 text-brand-success" />
              <span className="text-xs font-semibold text-brand-success bg-brand-success-soft px-2 py-0.5 rounded-full">
                Tổng cộng
              </span>
            </div>
            <p className="text-xs font-medium text-ink-soft">Tổng Phải Thu</p>
            <p className="text-xl font-bold text-brand-success mt-0.5 font-mono tabular-nums">
              {formatCurrency(monthlyStats.totalAmount)}
            </p>
            <p className="text-[11px] text-brand-warning mt-0.5 font-mono tabular-nums opacity-80">
              Thuế: {formatCurrency(monthlyStats.totalElectricityTax + monthlyStats.totalWaterTax)}
            </p>
            <div className="flex justify-between text-xs pt-3 mt-3 border-t border-brand-border font-medium font-mono tabular-nums">
              <span className="text-brand-success">
                Đã thu: {formatCurrency(monthlyStats.paidAmount)}
              </span>
              <span className="text-brand-warning">
                Chưa thu: {formatCurrency(monthlyStats.unpaidAmount)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Search & Filter Toolbar ── */}
      <div className="bg-surface rounded-xl shadow-sm border border-brand-border p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
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
              className="w-full pl-10 pr-9 py-2 text-sm border border-brand-border rounded-lg bg-surface-alt text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
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

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'PAID' | 'UNPAID')}
              className="text-sm border border-brand-border rounded-lg px-3 py-2 bg-surface-alt text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors cursor-pointer font-medium"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PAID">Đã thanh toán</option>
              <option value="UNPAID">Chưa thanh toán</option>
            </select>

            {(apartmentFilter || filterStatus !== 'ALL') && (
              <button
                onClick={() => {
                  setApartmentFilter('');
                  setFilterStatus('ALL');
                }}
                className="px-3 py-2 text-xs font-semibold text-brand-danger bg-brand-danger-soft hover:brightness-95 rounded-lg transition-all cursor-pointer border border-brand-danger/20 whitespace-nowrap"
              >
                Đặt lại
              </button>
            )}
          </div>
        </div>
      </div>

      {filteredMonthlyRecords.length === 0 ? (
        <div className="bg-surface rounded-xl border border-brand-border p-12 text-center text-ink-soft">
          <p className="text-sm font-semibold">Không tìm thấy căn hộ nào phù hợp với bộ lọc trong tháng {selectedMonth}/{selectedYear}.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl shadow-sm border border-brand-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-ink">
              <thead>
                <tr className="bg-surface-alt border-b border-brand-border text-[11px] font-bold text-ink-soft uppercase tracking-wider">
                  <th className="py-3.5 px-4">Căn hộ</th>
                  <th className="py-3.5 px-2 text-center whitespace-nowrap">Điện Cũ</th>
                  <th className="py-3.5 px-2 text-center whitespace-nowrap">Điện Mới</th>
                  <th className="py-3.5 px-2 text-center whitespace-nowrap">Nước Cũ</th>
                  <th className="py-3.5 px-2 text-center whitespace-nowrap">Nước Mới</th>
                  <th className="py-3.5 px-3 text-right whitespace-nowrap">Tiền Điện</th>
                  <th className="py-3.5 px-2 text-right whitespace-nowrap font-bold text-brand-warning">Thuế Điện</th>
                  <th className="py-3.5 px-3 text-right whitespace-nowrap">Tiền Nước</th>
                  <th className="py-3.5 px-2 text-right whitespace-nowrap font-bold text-brand-warning">Thuế Nước</th>
                  <th className="py-3.5 px-3 text-right whitespace-nowrap font-bold text-ink">Tổng Phải Thu</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap">Trạng thái</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {filteredMonthlyRecords.map(({ apartment, record }) => {
                  let elecCost = 0;
                  let waterCost = 0;
                  if (record) {
                    const elecUsage =
                      record.electricity.consumption ||
                      Math.max(
                        0,
                        (record.electricity.newReading || 0) - (record.electricity.oldReading || 0)
                      );
                    const waterUsage =
                      record.water.consumption ||
                      Math.max(0, (record.water.newReading || 0) - (record.water.oldReading || 0));
                    elecCost =
                      record.electricity.cost > 0
                        ? record.electricity.cost
                        : calculateElectricityCost(elecUsage);
                    waterCost = record.water.cost > 0 ? record.water.cost : waterUsage * waterPrice;
                  }

                  return (
                    <tr
                      key={apartment.id}
                      className="hover:bg-surface-alt/60 transition-colors duration-150"
                    >
                      {/* Mã căn */}
                      <td className="py-3 px-4 font-bold text-ink whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-mono font-semibold px-2 py-0.5 rounded bg-accent-soft text-accent-ink border border-brand-border">
                          {apartment.code}
                        </span>
                      </td>

                      {/* Chỉ số điện */}
                      <td className="py-3 px-2 text-center text-ink-soft font-mono tabular-nums">
                        {record ? record.electricity.oldReading : '-'}
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-ink font-mono tabular-nums">
                        {record ? record.electricity.newReading : '-'}
                      </td>

                      {/* Chỉ số nước */}
                      <td className="py-3 px-2 text-center text-ink-soft font-mono tabular-nums">
                        {record ? record.water.oldReading : '-'}
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-ink font-mono tabular-nums">
                        {record ? record.water.newReading : '-'}
                      </td>

                      {/* Tiền điện */}
                      <td className="py-3 px-3 text-right font-medium text-ink whitespace-nowrap font-mono tabular-nums">
                        {record ? formatCurrency(elecCost - (record.electricity.tax || 0)) : '-'}
                      </td>
                      <td className="py-3 px-2 text-right text-brand-warning font-mono tabular-nums whitespace-nowrap">
                        {record && record.electricity.tax ? formatCurrency(record.electricity.tax) : '-'}
                      </td>

                      {/* Tiền nước */}
                      <td className="py-3 px-3 text-right font-medium text-ink whitespace-nowrap font-mono tabular-nums">
                        {record ? formatCurrency(waterCost - (record.water.tax || 0)) : '-'}
                      </td>
                      <td className="py-3 px-2 text-right text-brand-warning font-mono tabular-nums whitespace-nowrap">
                        {record && record.water.tax ? formatCurrency(record.water.tax) : '-'}
                      </td>

                      {/* Tổng */}
                      <td className="py-3 px-3 text-right font-bold text-brand-success whitespace-nowrap text-sm font-mono tabular-nums">
                        {record ? formatCurrency(elecCost + waterCost) : '-'}
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {record ? (
                          record.paymentStatus === 'PAID' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-success-soft text-brand-success border border-brand-success/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-success" />
                              Đã thu
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-warning-soft text-brand-warning border border-brand-warning/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-warning" />
                              Chưa thu
                            </span>
                          )
                        ) : (
                          <span className="text-ink-faint text-xs italic">Chưa ghi</span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {record ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => onSendEmail(record.id)}
                              className={`p-1.5 rounded-lg transition-all border ${
                                record.emailSentAt
                                  ? 'bg-brand-success-soft text-brand-success border-brand-success/30 hover:brightness-95'
                                  : 'bg-brand-warning-soft text-brand-warning border-brand-warning/30 hover:brightness-95'
                              } cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40`}
                              title={
                                record.emailSentAt
                                  ? `Đã gửi: ${new Date(record.emailSentAt).toLocaleString('vi-VN')}`
                                  : 'Chưa gửi email'
                              }
                            >
                              <EnvelopeIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onViewDetail(record, apartment.code)}
                              className="px-2.5 py-1 bg-surface text-ink-soft hover:text-accent hover:border-accent/40 rounded-lg text-[11px] font-semibold border border-brand-border transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40"
                            >
                              Chi tiết
                            </button>
                            {record.paymentStatus === 'PAID' && (
                              <a
                                href={`/api/vnpt-invoice/download-pdf?type=utility&id=${record.id}&apartmentId=${apartment.id}&apartmentCode=${apartment.code}&month=${record.month}&year=${record.year}`}
                                download={`HDDT_${apartment.code}_${String(record.month).padStart(2, '0')}${record.year}.pdf`}
                                className="px-2 py-1 text-brand-danger bg-brand-danger-soft hover:brightness-95 rounded-lg text-[11px] font-bold border border-brand-danger/20 transition-all"
                                title="Tải PDF HĐĐT"
                              >
                                PDF
                              </a>
                            )}
                            {record.paymentStatus === 'UNPAID' ? (
                              <button
                                onClick={() => onUpdatePaymentStatus(record.id, 'PAID')}
                                className="px-2.5 py-1 bg-accent hover:bg-accent-hover text-white text-[11px] font-semibold rounded-lg shadow-sm transition-colors inline-flex items-center gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40"
                                title="Đánh dấu đã thanh toán"
                              >
                                <CheckCircleIcon className="w-3 h-3" />
                                Thu
                              </button>
                            ) : (
                              <button
                                onClick={() => onUpdatePaymentStatus(record.id, 'UNPAID')}
                                className="px-2 py-1 bg-surface hover:bg-surface-alt text-ink-soft hover:text-ink text-[11px] font-medium rounded-lg transition-colors border border-brand-border inline-flex items-center gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40"
                                title="Đánh dấu chưa thanh toán"
                              >
                                <ArrowPathIcon className="w-3 h-3" />
                                Hủy
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-ink-faint text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Table Footer & Stats Summary ── */}
          <div className="bg-surface-alt border-t border-brand-border px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-soft font-medium">
            <div className="flex items-center gap-2">
              <span>Đang hiển thị <strong className="text-ink font-bold font-mono tabular-nums">{filteredMonthlyRecords.length}</strong> / <strong className="text-ink font-bold font-mono tabular-nums">{apartments.length}</strong> căn hộ</span>
              {filteredMonthlyRecords.length < apartments.length && (
                <span className="bg-accent-soft text-accent-ink px-2 py-0.5 rounded-full font-semibold text-[11px]">
                  Đang áp dụng bộ lọc
                </span>
              )}
            </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyViewMode;
