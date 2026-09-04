import React from 'react';
import type { Apartment } from '../../types';
import {
  ArrowRightIcon,
  BuildingOfficeIcon,
  DocumentArrowDownIcon,
  EnvelopeIcon,
} from '../../components/icons';
import { EmptyState } from '../../components/ui';

export interface UnifiedBillingRecord {
  apartment_id: string;
  apartment_code: string;
  house_type: string;
  floor: number;
  area: number;
  utility_id: string | null;
  electricity_cost: number;
  electricity_tax: number;
  water_cost: number;
  water_tax: number;
  utility_total: number;
  utility_status: string | null;
  electricity_old_reading: number | null;
  electricity_new_reading: number | null;
  electricity_usage: number | null;
  water_old_reading: number | null;
  water_new_reading: number | null;
  water_usage: number | null;
  email_sent_at?: string | null;
  management_fee_id: string | null;
  management_fee_cost: number;
  management_fee_status: string | null;
  management_fee_breakdown: {
    management_fee: number;
    internet_fee: number;
    cable_tv_fee: number;
    parking_car_fee: number;
    parking_motorbike_fee: number;
    security_fee: number;
    cleaning_fee: number;
  } | null;
  grand_total: number;
  combined_status: string;
  month: number;
  year: number;
}

interface UnifiedHistoryViewProps {
  selectedApartment: Apartment | undefined;
  historyData: UnifiedBillingRecord[];
  historyLoading: boolean;
  /** Click vào 1 kỳ → quay lại Monthly View với kỳ đã chọn */
  onSelectPeriod?: (month: number, year: number) => void;
  onSendResultEmail: (record: UnifiedBillingRecord) => void;
  onViewDetail: (record: UnifiedBillingRecord) => void;
  onUpdateStatus: (record: UnifiedBillingRecord, newStatus: 'PAID' | 'UNPAID') => void;
  updatingStatus: string | null;
  sendingEmail: boolean;
  formatCurrency: (value: number) => string;
  getStatusBadge: (status: string) => React.ReactNode;
}

/** % lấp đầy của progress-bar theo trạng thái kỳ */
const statusProgress = (status: string) =>
  status === 'PAID' ? '100%' : status === 'PARTIAL' ? '55%' : '0%';
const statusBarColor = (status: string) =>
  status === 'PAID'
    ? 'bg-brand-success'
    : status === 'PARTIAL'
      ? 'bg-brand-warning'
      : 'bg-brand-danger/50';

export const UnifiedHistoryView: React.FC<UnifiedHistoryViewProps> = ({
  selectedApartment,
  historyData,
  historyLoading,
  onSelectPeriod,
  onSendResultEmail,
  onViewDetail,
  onUpdateStatus,
  updatingStatus,
  sendingEmail,
  formatCurrency,
  getStatusBadge,
}) => {
  if (!selectedApartment) {
    return (
      <div className="flex items-center justify-center p-12 text-center text-ink-soft bg-surface rounded-2xl border border-brand-border">
        <p className="font-medium text-sm">Vui lòng chọn căn hộ để xem lịch sử hóa đơn.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Apartment header card */}
      <div className="bg-surface rounded-2xl shadow-sm border border-brand-border overflow-hidden">
        <div className="p-5 border-b border-brand-border flex justify-between items-center bg-surface-alt/50">
          <div>
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              Lịch sử hóa đơn:
              <span className="inline-flex items-center gap-1.5 font-mono text-accent">
                <BuildingOfficeIcon className="w-4 h-4" />
                {selectedApartment.code}
              </span>
            </h3>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  selectedApartment.electricityType === 'RESIDENTIAL'
                    ? 'bg-brand-success-soft text-brand-success'
                    : 'bg-brand-warning-soft text-brand-warning'
                }`}
              >
                {selectedApartment.electricityType === 'RESIDENTIAL' ? 'Sinh Hoạt' : 'Kinh Doanh'}
              </span>
              <span className="text-xs text-ink-soft font-mono">
                {selectedApartment.area} m² • Tầng {selectedApartment.floor}
              </span>
            </div>
          </div>
          {onSelectPeriod && (
            <button
              onClick={() => onSelectPeriod(historyData[0]?.month ?? new Date().getMonth() + 1, historyData[0]?.year ?? new Date().getFullYear())}
              disabled={!historyData.length}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-brand-border text-xs font-semibold text-ink-soft hover:text-accent hover:border-accent/40 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Xem kỳ mới nhất ở Tổng quan
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {historyLoading ? (
          <div className="flex justify-center items-center">
            <div className="rounded-full h-8 w-8 border-2 border-accent/70"></div>
            <p className="ml-3 text-ink-soft font-medium text-sm">Đang tải lịch sử...</p>
          </div>
        ) : historyData.length === 0 ? (
          <EmptyState
            icon={DocumentArrowDownIcon}
            title="Chưa có lịch sử hóa đơn cho căn hộ này"
          />
        ) : (
          <div className="p-4 space-y-2.5 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {historyData.map((record) => (
              <div
                key={`${record.year}-${record.month}`}
                role={onSelectPeriod ? 'button' : undefined}
                tabIndex={onSelectPeriod ? 0 : undefined}
                onClick={onSelectPeriod ? () => onSelectPeriod(record.month, record.year) : undefined}
                onKeyDown={
                  onSelectPeriod
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectPeriod(record.month, record.year);
                        }
                      }
                    : undefined
                }
                className={`group grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-2 p-4 rounded-xl border border-brand-border bg-surface shadow-xs transition-all duration-200 ${
                  onSelectPeriod
                    ? 'cursor-pointer hover:border-accent/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40'
                    : ''
                }`}
              >
                {/* Period chip */}
                <div className="w-14 text-center shrink-0">
                  <p className="font-serif text-lg font-semibold leading-none text-ink">
                    T{String(record.month).padStart(2, '0')}
                  </p>
                  <p className="text-[11px] font-mono text-ink-faint mt-0.5">{record.year}</p>
                </div>

                {/* Amounts + progress */}
                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <span className="text-[11px] text-ink-soft truncate" title={`Điện ${formatCurrency(record.electricity_cost)} · Nước ${formatCurrency(record.water_cost)} · Phí QL ${formatCurrency(record.management_fee_cost)}`}>
                      Điện {formatCurrency(record.electricity_cost)} · Nước{' '}
                      {formatCurrency(record.water_cost)} · QL{' '}
                      {formatCurrency(record.management_fee_cost)}
                    </span>
                    <span className="font-mono tabular-nums font-bold text-ink whitespace-nowrap">
                      {formatCurrency(record.grand_total)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-alt rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${statusBarColor(record.combined_status)} transition-all duration-300`}
                      style={{ width: statusProgress(record.combined_status) }}
                    />
                  </div>
                </div>

                {/* Status + actions */}
                <div className="col-span-2 sm:col-span-1 flex items-center justify-between sm:justify-end gap-2">
                  {getStatusBadge(record.combined_status)}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSendResultEmail(record);
                      }}
                      disabled={sendingEmail}
                      className="p-1.5 rounded-lg border border-brand-border bg-surface text-ink-soft hover:text-accent hover:border-accent/40 transition-colors cursor-pointer"
                      title="Gửi email thông báo"
                      aria-label={`Gửi email kỳ T${record.month}/${record.year}`}
                    >
                      <EnvelopeIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetail(record);
                      }}
                      className="px-2 py-1 bg-surface-alt text-ink border border-brand-border rounded-lg text-[11px] font-semibold hover:border-accent/40 transition-colors cursor-pointer"
                    >
                      Chi tiết
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateStatus(
                          record,
                          record.combined_status === 'PAID' ? 'UNPAID' : 'PAID'
                        );
                      }}
                      disabled={updatingStatus === record.apartment_id}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                        record.combined_status === 'PAID'
                          ? 'bg-brand-success-soft text-brand-success border border-brand-success/25'
                          : 'bg-accent text-white hover:bg-accent-hover'
                      }`}
                    >
                      {record.combined_status === 'PAID' ? 'Đã thu' : 'Thu tiền'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedHistoryView;
