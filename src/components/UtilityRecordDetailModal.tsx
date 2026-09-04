import React, { useState , useRef} from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import type { UtilityRecord } from '../types';
import { BoltIcon, PhotoIcon, BuildingOfficeIcon, DocumentTextIcon, CheckCircleIcon, XMarkIcon, EyeIcon, DocumentArrowDownIcon } from './icons';
import ImageViewerModal from './ImageViewerModal';
import InvoiceViewModal from './InvoiceViewModal';
import ResidentHandbookModal from './ResidentHandbookModal';

interface UtilityRecordDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: UtilityRecord | null;
  apartmentCode?: string;
  apartmentId?: string;
  type?: 'utility' | 'unified';
}

const UtilityRecordDetailModal: React.FC<UtilityRecordDetailModalProps> = ({
  isOpen,
  onClose,
  record,
  apartmentCode,
  apartmentId,
  type = 'utility',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen);

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isHandbookModalOpen, setIsHandbookModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  if (!isOpen || !record) return null;

  const invoiceType: 'utility' | 'unified' =
    type || ((record as any).managementFeeData || (record as any).billingType === 'unified' ? 'unified' : 'utility');

  const isPaid =
    record.paymentStatus === 'PAID' ||
    (record as any).payment_status === 'PAID' ||
    (record as any).status === 'PAID' ||
    (record as any).combined_status === 'PAID';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Fallback pricing tiers (matching database sample data)
  const ELECTRICITY_TIERS = [
    { limit: 50, price: 1678 },
    { limit: 50, price: 1734 }, // 51-100
    { limit: 100, price: 2014 }, // 101-200
    { limit: 100, price: 2536 }, // 201-300
    { limit: 100, price: 2834 }, // 301-400
    { limit: Infinity, price: 2927 }, // 401+
  ];
  const WATER_PRICE = 15000;

  const calculateElectricityCost = (usage: number) => {
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

  // Calculate usage if not provided (fallback)
  const electricityUsage =
    record.electricity_usage ||
    Math.max(0, record.electricity_new_reading - record.electricity_old_reading);

  const waterUsage =
    record.water_usage || Math.max(0, record.water_new_reading - record.water_old_reading);

  const handleViewImage = (imgType: 'E' | 'W') => {
    // Format: TYPE-Code-MonthYear (e.g., E-A101-122025)
    const monthStr = record.month.toString().padStart(2, '0');
    const folderName = `${monthStr}${record.year}`;
    const fileName = `${imgType}-${apartmentCode}-${monthStr}${record.year}.jpg`;
    // Use relative path via proxy with subfolder
    const url = `/utility/${folderName}/${fileName}`;
    setSelectedImageUrl(url);
    setIsImageModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity" ref={dialogRef} role="dialog" aria-modal="true">
      <div
        className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-brand-border bg-surface-alt/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <BoltIcon className="w-6 h-6 text-accent" />
            <h3 className="text-base font-bold text-ink">Chi tiết Điện Nước</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-surface-alt transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto custom-scrollbar">
          {/* Apartment Info */}
          <div className="text-center mb-8 border-b border-brand-border pb-6">
            <h4 className="text-2xl font-bold text-ink mb-1">
              {apartmentCode || 'Căn hộ'}
            </h4>
            <p className="text-ink-soft font-medium">
              Tháng {record.month}/{record.year}
            </p>
          </div>

          {/* Electricity Card */}
          <div className="bg-brand-warning-soft/40 rounded-lg p-5 mb-4 border border-brand-border hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BoltIcon className="w-6 h-6 text-brand-warning" />
                <span className="font-bold text-brand-warning text-lg">
                  Tiền Điện
                </span>
              </div>
              <button
                onClick={() => handleViewImage('E')}
                className="p-2.5 sm:p-2 bg-brand-warning-soft rounded-lg text-brand-warning hover:brightness-95 transition-colors duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 border border-brand-border"
                title="Xem ảnh chỉ số điện"
                aria-label="Xem ảnh chỉ số điện"
              >
                <PhotoIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div className="bg-surface p-3 rounded-lg border border-brand-border ">
                <span className="block text-ink-soft text-xs mb-1">
                  Chỉ số cũ
                </span>
                <span className="font-semibold text-ink text-lg font-mono tabular-nums">
                  {record.electricity_old_reading}
                </span>
              </div>
              <div className="bg-surface p-3 rounded-lg border border-brand-border ">
                <span className="block text-ink-soft text-xs mb-1">
                  Chỉ số mới
                </span>
                <span className="font-semibold text-ink text-lg font-mono tabular-nums">
                  {record.electricity_new_reading}
                </span>
              </div>
              <div className="bg-brand-warning-soft/60 p-3 rounded-lg border border-brand-border ">
                <span className="block text-brand-warning text-xs mb-1">
                  Tiêu thụ
                </span>
                <span className="font-bold text-brand-warning text-lg font-mono tabular-nums">
                  {electricityUsage} kWh
                </span>
              </div>
            </div>

            {/* Cost breakdown */}
            <div className="space-y-1 pt-3 border-t border-brand-border">
              <div className="flex justify-between items-center">
                <span className="text-ink-soft text-sm">
                  Tiền điện (chưa thuế):
                </span>
                <span className="font-semibold text-ink font-mono tabular-nums">
                  {formatCurrency(
                    (record.electricity_cost > 0
                      ? record.electricity_cost
                      : calculateElectricityCost(electricityUsage)) - (record.electricity_tax || 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-soft text-sm">Thuế VAT:</span>
                <span className="font-semibold text-brand-warning">
                  {formatCurrency(record.electricity_tax || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-brand-border">
                <span className="text-ink-soft font-medium">Thành tiền:</span>
                <span className="text-xl font-bold text-ink font-mono tabular-nums">
                  {formatCurrency(
                    record.electricity_cost > 0
                      ? record.electricity_cost
                      : calculateElectricityCost(electricityUsage)
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Water Card */}
          <div className="bg-brand-teal-soft/40 rounded-lg p-5 mb-4 border border-brand-border hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6 text-brand-teal"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 10.5c0 7.105-7.5 11.25-7.5 11.25S4.5 17.605 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                  />
                </svg>
                <span className="font-bold text-brand-teal text-lg">Tiền Nước</span>
              </div>
              <button
                onClick={() => handleViewImage('W')}
                className="p-2.5 sm:p-2 bg-brand-teal-soft rounded-lg text-brand-teal hover:brightness-95 transition-colors duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 border border-brand-border"
                title="Xem ảnh chỉ số nước"
                aria-label="Xem ảnh chỉ số nước"
              >
                <PhotoIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div className="bg-surface p-3 rounded-lg border border-brand-border ">
                <span className="block text-ink-soft text-xs mb-1">
                  Chỉ số cũ
                </span>
                <span className="font-semibold text-ink text-lg font-mono tabular-nums">
                  {record.water_old_reading}
                </span>
              </div>
              <div className="bg-surface p-3 rounded-lg border border-brand-border ">
                <span className="block text-ink-soft text-xs mb-1">
                  Chỉ số mới
                </span>
                <span className="font-semibold text-ink text-lg font-mono tabular-nums">
                  {record.water_new_reading}
                </span>
              </div>
              <div className="bg-brand-teal-soft/60 p-3 rounded-lg border border-brand-border ">
                <span className="block text-brand-teal text-xs mb-1">Tiêu thụ</span>
                <span className="font-bold text-brand-teal text-lg font-mono tabular-nums">
                  {waterUsage} m³
                </span>
              </div>
            </div>

            <div className="space-y-1 pt-3 border-t border-brand-border">
              <div className="flex justify-between items-center">
                <span className="text-ink-soft text-sm">
                  Tiền nước (chưa thuế):
                </span>
                <span className="font-semibold text-ink font-mono tabular-nums">
                  {formatCurrency(
                    (record.water_cost > 0 ? record.water_cost : waterUsage * WATER_PRICE) -
                      (record.water_tax || 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-soft text-sm">Thuế VAT:</span>
                <span className="font-semibold text-brand-warning">
                  {formatCurrency(record.water_tax || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-brand-border">
                <span className="text-ink-soft font-medium">Thành tiền:</span>
                <span className="text-xl font-bold text-ink font-mono tabular-nums">
                  {formatCurrency(
                    record.water_cost > 0 ? record.water_cost : waterUsage * WATER_PRICE
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Management Fee Breakdown - NEW */}
          {(record as any).managementFeeData && (
            <div className="bg-surface-alt rounded-lg p-4 mb-4 border border-brand-border">
              <h4 className="font-bold text-ink mb-3 flex items-center gap-2">
                <BuildingOfficeIcon className="w-5 h-5" /> Phí Quản Lý & Dịch Vụ
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-ink-soft">Phí Quản Lý</span>
                  <span className="font-semibold text-ink font-mono tabular-nums">
                    {formatCurrency((record as any).managementFeeData.management_fee)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-soft">Internet</span>
                  <span className="font-semibold text-ink font-mono tabular-nums">
                    {formatCurrency((record as any).managementFeeData.internet_fee)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-soft">Truyền hình cáp</span>
                  <span className="font-semibold text-ink font-mono tabular-nums">
                    {formatCurrency((record as any).managementFeeData.cable_tv_fee)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-soft">Gửi xe ô tô</span>
                  <span className="font-semibold text-ink font-mono tabular-nums">
                    {formatCurrency((record as any).managementFeeData.parking_car_fee)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-soft">Gửi xe máy</span>
                  <span className="font-semibold text-ink font-mono tabular-nums">
                    {formatCurrency((record as any).managementFeeData.parking_motorbike_fee)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-soft">Bảo vệ</span>
                  <span className="font-semibold text-ink font-mono tabular-nums">
                    {formatCurrency((record as any).managementFeeData.security_fee)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-soft">Vệ sinh</span>
                  <span className="font-semibold text-ink font-mono tabular-nums">
                    {formatCurrency((record as any).managementFeeData.cleaning_fee)}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-brand-border pt-2 mt-2">
                  <span className="font-bold text-ink">
                    Tổng phí quản lý:
                  </span>
                  <span className="text-lg font-bold text-ink font-mono tabular-nums">
                    {formatCurrency(
                      (Object.values((record as any).managementFeeData) as number[]).reduce(
                        (sum, val) => sum + val,
                        0
                      )
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Total - Updated to include management fee */}
          <div className="bg-brand-success-soft rounded-lg p-4 flex justify-between items-center border border-brand-border">
            <span className="text-brand-success font-bold">
              Tổng thanh toán:
            </span>
            <span className="text-2xl font-bold text-brand-success font-mono tabular-nums">
              {formatCurrency(
                (record.electricity_cost > 0
                  ? record.electricity_cost
                  : calculateElectricityCost(electricityUsage)) +
                  (record.water_cost > 0 ? record.water_cost : waterUsage * WATER_PRICE) +
                  ((record as any).managementFeeData
                    ? (Object.values((record as any).managementFeeData) as number[]).reduce(
                        (sum, val) => sum + val,
                        0
                      )
                    : 0)
              )}
            </span>
          </div>

          {/* Hóa đơn điện tử (E-Invoice VNPT TT78) - Hiển thị khi đã thanh toán */}
          {isPaid && (
            <div className="mt-4 bg-surface-alt rounded-xl p-4 border border-brand-border shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-accent text-white rounded-lg flex items-center justify-center flex-shrink-0">
                    <DocumentTextIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className="font-bold text-ink text-sm">
                        Hóa Đơn Điện Tử (VNPT)
                      </h5>
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-brand-success-soft text-brand-success flex items-center gap-1">
                        <CheckCircleIcon className="w-3 h-3" />
                        Đã phát hành
                      </span>
                    </div>
                    <p className="text-xs text-ink-soft mt-0.5">
                      Kỳ: {String(record.month).padStart(2, '0')}/{record.year} • Căn hộ: <strong className="text-ink">{apartmentCode || 'Căn hộ'}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2.5 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-lg transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  <EyeIcon className="w-4 h-4" />
                  <span>Xem Hóa Đơn</span>
                </button>

                <a
                  href={`/api/vnpt-invoice/download-pdf?type=${invoiceType}&id=${record.id || ''}&apartmentId=${record.apartmentId || apartmentId || ''}&apartmentCode=${apartmentCode || ''}&month=${record.month}&year=${record.year}`}
                  download={`HDDT_${apartmentCode || 'CANHO'}_${String(record.month).padStart(2, '0')}${record.year}.pdf`}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-surface hover:bg-surface-alt text-ink text-xs font-bold rounded-lg border border-brand-border transition-colors duration-200 cursor-pointer"
                  title="Tải tệp PDF hóa đơn điện tử"
                >
                  <DocumentArrowDownIcon className="w-4 h-4 text-ink-soft" />
                  <span>Tải PDF</span>
                </a>

                <a
                  href={`/api/vnpt-invoice/download-xml?type=${invoiceType}&id=${record.id || ''}&apartmentId=${record.apartmentId || apartmentId || ''}&apartmentCode=${apartmentCode || ''}&month=${record.month}&year=${record.year}`}
                  download={`HDDT_${apartmentCode || 'CANHO'}_${String(record.month).padStart(2, '0')}${record.year}.xml`}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-surface hover:bg-surface-alt text-ink text-xs font-bold rounded-lg border border-brand-border transition-colors duration-200 cursor-pointer"
                  title="Tải tệp XML chuẩn cơ quan Thuế"
                >
                  <DocumentTextIcon className="w-4 h-4 text-ink-soft" />
                  <span>Tải XML</span>
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-brand-border bg-surface-alt/50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {isPaid && (
              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(true)}
                className="px-3.5 py-2 bg-surface text-ink text-xs font-bold rounded-lg hover:bg-surface-alt border border-brand-border transition-colors flex items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <EyeIcon className="w-4 h-4 text-ink-soft" />
                <span>Xem Hóa Đơn Điện Tử</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsHandbookModalOpen(true)}
              className="px-3.5 py-2 bg-surface text-ink text-xs font-bold rounded-lg hover:bg-surface-alt border border-brand-border transition-colors flex items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              title="Xem Sổ Tay Cư Dân (Nội quy, quy chế & tiện ích)"
            >
              <DocumentTextIcon className="w-4 h-4 text-ink-soft" />
              <span>Sổ Tay Cư Dân</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-lg hover:bg-surface-alt transition-colors font-medium text-sm ml-auto cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            Đóng
          </button>
        </div>
      </div>

      <ImageViewerModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        imageUrl={selectedImageUrl}
      />

      <ResidentHandbookModal
        isOpen={isHandbookModalOpen}
        onClose={() => setIsHandbookModalOpen(false)}
      />

      {isInvoiceModalOpen && (
        <InvoiceViewModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          type={invoiceType}
          id={record.id}
          apartmentId={record.apartmentId || apartmentId}
          apartmentCode={apartmentCode || ''}
          month={record.month}
          year={record.year}
        />
      )}
    </div>
  );
};

export default UtilityRecordDetailModal;
