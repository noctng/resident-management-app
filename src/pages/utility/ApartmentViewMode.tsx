import React from 'react';
import type { Apartment, UtilityRecord } from '../../types';
import { BoltIcon, PlusIcon, EnvelopeIcon } from '../../components/icons';
import { EmptyState } from '../../components/ui';

interface ApartmentViewModeProps {
  selectedApartment: Apartment | null;
  recordsForSelectedApartment: UtilityRecord[];
  apartments: Apartment[];
  onOpenScanModal: () => void;
  onOpenAddUtilityModal: (apartment: Apartment) => void;
  onSendEmail: (recordId: string) => void;
  calculateElectricityCost: (consumption: number) => number;
  formatCurrency: (value: number) => string;
  waterPrice: number;
}

export const ApartmentViewMode: React.FC<ApartmentViewModeProps> = ({
  selectedApartment,
  recordsForSelectedApartment,
  apartments,
  onOpenScanModal,
  onOpenAddUtilityModal,
  onSendEmail,
  calculateElectricityCost,
  formatCurrency,
  waterPrice,
}) => {
  if (!selectedApartment) {
    return (
      <div className="flex items-center justify-center h-64 text-center">
        <p className="text-sm text-ink-soft">
          {apartments.length > 0
            ? 'Vui lòng chọn một căn hộ để xem thông tin.'
            : 'Chưa có căn hộ nào được tạo.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Subheader */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-brand-border">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-ink flex items-center gap-2">
            Lịch sử ghi số:{' '}
            <span className="text-accent">{selectedApartment.code}</span>
          </h3>
          <span
            className={`mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-full ${
              selectedApartment.electricityType === 'RESIDENTIAL'
                ? 'bg-brand-success-soft text-brand-success'
                : 'bg-brand-warning-soft text-brand-warning'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                selectedApartment.electricityType === 'RESIDENTIAL'
                  ? 'bg-brand-success'
                  : 'bg-brand-warning'
              }`}
            />
            Loại điện:{' '}
            {selectedApartment.electricityType === 'RESIDENTIAL' ? 'Sinh Hoạt' : 'Kinh Doanh'}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onOpenScanModal}
            className="px-3.5 py-2 bg-accent text-white text-xs sm:text-sm font-medium rounded-xl hover:bg-accent-hover transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <BoltIcon className="w-4 h-4" />
            <span>Quét AI</span>
          </button>
          <button
            onClick={() => onOpenAddUtilityModal(selectedApartment)}
            className="px-3.5 py-2 bg-surface border border-brand-border text-ink-soft hover:text-ink hover:border-accent/40 text-xs sm:text-sm font-medium rounded-xl transition-all duration-200 flex items-center gap-1.5 shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Thêm Bản Ghi</span>
          </button>
        </div>
      </div>

      {recordsForSelectedApartment.length === 0 ? (
        <EmptyState
          icon={BoltIcon}
          tone="neutral"
          title="Chưa có dữ liệu điện nước cho căn hộ này"
          description="Dữ liệu điện nước sẽ hiển thị sau khi có chỉ số mới."
          size="md"
        />
      ) : (
        <>
          {/* Mobile Card Layout */}
          <div className="block lg:hidden space-y-4">
            {recordsForSelectedApartment.map((record) => {
              const elecUsage =
                record.electricity.consumption ||
                Math.max(
                  0,
                  (record.electricity.newReading || 0) - (record.electricity.oldReading || 0)
                );
              const waterUsage =
                record.water.consumption ||
                Math.max(0, (record.water.newReading || 0) - (record.water.oldReading || 0));
              const elecCost =
                record.electricity.cost > 0
                  ? record.electricity.cost
                  : calculateElectricityCost(elecUsage);
              const waterCost = record.water.cost > 0 ? record.water.cost : waterUsage * waterPrice;

              return (
                <div
                  key={record.id}
                  className="bg-surface rounded-xl shadow-xs p-4 border border-brand-border space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-brand-border pb-2">
                    <h4 className="font-bold text-ink text-sm font-mono tabular-nums">
                      Tháng {record.month}/{record.year}
                    </h4>
                    <button
                      onClick={() => onSendEmail(record.id)}
                      className="p-1.5 border border-brand-border text-ink-soft hover:text-accent hover:border-accent/40 rounded-lg transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40"
                      title="Gửi email thông báo"
                    >
                      <EnvelopeIcon className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-brand-warning-soft/50 rounded-xl border border-brand-warning/20">
                      <p className="font-bold text-brand-warning mb-1">Điện</p>
                      <p className="text-ink-soft font-mono tabular-nums">
                        Chỉ số: {record.electricity.oldReading} → {record.electricity.newReading}
                      </p>
                      <p className="font-semibold text-ink mt-1 font-mono tabular-nums">
                        Dùng: {record.electricity.consumption} kWh
                      </p>
                      <p className="font-bold text-brand-warning mt-0.5 font-mono tabular-nums">
                        {formatCurrency(elecCost)}
                      </p>
                    </div>

                    <div className="p-2.5 bg-brand-teal-soft/50 rounded-xl border border-brand-teal/20">
                      <p className="font-bold text-brand-teal mb-1">Nước</p>
                      <p className="text-ink-soft font-mono tabular-nums">
                        Chỉ số: {record.water.oldReading} → {record.water.newReading}
                      </p>
                      <p className="font-semibold text-ink mt-1 font-mono tabular-nums">
                        Dùng: {record.water.consumption} m³
                      </p>
                      <p className="font-bold text-brand-teal mt-0.5 font-mono tabular-nums">
                        {formatCurrency(waterCost)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden lg:block overflow-x-auto rounded-xl border border-brand-border bg-surface shadow-sm">
            <table className="w-full text-xs text-left text-ink">
              <thead className="text-[11px] uppercase tracking-wider bg-surface-alt text-ink-soft select-none">
                <tr>
                  <th className="px-3 py-3 align-bottom" rowSpan={2}>
                    Tháng/Năm
                  </th>
                  <th
                    className="px-3 py-3 text-center border-b border-brand-border"
                    colSpan={5}
                  >
                    Điện (kWh)
                  </th>
                  <th
                    className="px-3 py-3 text-center border-b border-brand-border"
                    colSpan={5}
                  >
                    Nước (m³)
                  </th>
                  <th className="px-3 py-3 text-center align-bottom" rowSpan={2}>
                    Hành động
                  </th>
                </tr>
                <tr className="border-t border-brand-border">
                  <th className="px-2 py-2 text-center">Cũ</th>
                  <th className="px-2 py-2 text-center">Mới</th>
                  <th className="px-2 py-2 text-center font-bold">Tiêu thụ</th>
                  <th className="px-2 py-2 text-center font-bold">Thành tiền</th>
                  <th className="px-2 py-2 text-center font-bold text-brand-warning">Thuế</th>
                  <th className="px-2 py-2 text-center">Cũ</th>
                  <th className="px-2 py-2 text-center">Mới</th>
                  <th className="px-2 py-2 text-center font-bold">Tiêu thụ</th>
                  <th className="px-2 py-2 text-center font-bold">Thành tiền</th>
                  <th className="px-2 py-2 text-center font-bold text-brand-warning">Thuế</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {recordsForSelectedApartment.map((record) => {
                  const elecUsage =
                    record.electricity.consumption ||
                    Math.max(
                      0,
                      (record.electricity.newReading || 0) - (record.electricity.oldReading || 0)
                    );
                  const waterUsage =
                    record.water.consumption ||
                    Math.max(0, (record.water.newReading || 0) - (record.water.oldReading || 0));
                  const elecCost =
                    record.electricity.cost > 0
                      ? record.electricity.cost
                      : calculateElectricityCost(elecUsage);
                  const waterCost =
                    record.water.cost > 0 ? record.water.cost : waterUsage * waterPrice;

                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-surface-alt/60 transition-colors duration-150"
                    >
                      <td className="px-3 py-2.5 font-bold text-ink font-mono tabular-nums">
                        {record.month}/{record.year}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono tabular-nums text-ink-soft">{record.electricity.oldReading}</td>
                      <td className="px-2 py-2.5 text-center font-mono tabular-nums text-ink">{record.electricity.newReading}</td>
                      <td className="px-2 py-2.5 font-bold text-brand-warning text-center bg-brand-warning-soft/40 font-mono tabular-nums">
                        {record.electricity.consumption}
                      </td>
                      <td className="px-2 py-2.5 font-semibold text-right font-mono tabular-nums">
                        {formatCurrency(elecCost - (record.electricity.tax || 0))}
                      </td>
                      <td className="px-2 py-2.5 text-right text-brand-warning font-mono tabular-nums">
                        {record.electricity.tax ? formatCurrency(record.electricity.tax) : '-'}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono tabular-nums text-ink-soft">{record.water.oldReading}</td>
                      <td className="px-2 py-2.5 text-center font-mono tabular-nums text-ink">{record.water.newReading}</td>
                      <td className="px-2 py-2.5 font-bold text-brand-teal text-center bg-brand-teal-soft/40 font-mono tabular-nums">
                        {record.water.consumption}
                      </td>
                      <td className="px-2 py-2.5 font-semibold text-right font-mono tabular-nums">
                        {formatCurrency(waterCost - (record.water.tax || 0))}
                      </td>
                      <td className="px-2 py-2.5 text-right text-brand-warning font-mono tabular-nums">
                        {record.water.tax ? formatCurrency(record.water.tax) : '-'}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <button
                          onClick={() => onSendEmail(record.id)}
                          className="p-1.5 text-ink-soft hover:text-accent hover:border-accent/40 border border-transparent rounded-lg transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40"
                          title="Gửi email thông báo"
                        >
                          <EnvelopeIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default ApartmentViewMode;
