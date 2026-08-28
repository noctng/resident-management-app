import React from 'react';
import Modal from './ui/Modal';
import type { AmenityUsage, AmenityType } from '../types';

// Define a local type for usage that includes the apartment code.
type DetailedAmenityUsage = AmenityUsage & { apartmentCode?: string };

interface BookingConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  usage: DetailedAmenityUsage | null;
  onConfirm: (usageId: string) => void;
  onCancel: (usageId: string) => void;
}

const AMENITY_NAMES: Record<AmenityType, string> = {
  GOLF_3D: 'Golf 3D',
  HORSE_RIDING: 'Cưỡi ngựa Ả Rập',
  MUSEUM: 'Thăm quan bảo tàng',
  ZEN_GARDEN: 'Thăm quan vườn Zen',
  SAUNA: 'Xông Hơi',
  ARCHERY: 'Bắn Cung',
  GYM: 'Gym',
  YOGA: 'Yoga',
};

const translateStatus = (status: AmenityUsage['status']) => {
  switch (status) {
    case 'PENDING':
      return 'Chờ xác nhận';
    case 'USED':
      return 'Đã sử dụng';
    case 'CANCELLED':
      return 'Đã hủy';
    default:
      return status;
  }
};

const getStatusBadgeClass = (status: AmenityUsage['status']) => {
  switch (status) {
    case 'PENDING':
      return 'bg-brand-warning-soft text-brand-warning';
    case 'USED':
      return 'bg-brand-success-soft text-brand-success';
    case 'CANCELLED':
      return 'bg-brand-danger-soft text-brand-danger';
    default:
      return 'bg-surface-alt text-ink-soft';
  }
};

const getStatusDotClass = (status: AmenityUsage['status']) => {
  switch (status) {
    case 'PENDING':
      return 'bg-brand-warning';
    case 'USED':
      return 'bg-brand-success';
    case 'CANCELLED':
      return 'bg-brand-danger';
    default:
      return 'bg-ink-faint';
  }
};

const BookingConfirmationModal: React.FC<BookingConfirmationModalProps> = ({
  isOpen,
  onClose,
  usage,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !usage) return null;

  const apartmentCode = usage.apartmentCode || 'Không rõ';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chi Tiết Đặt Chỗ">
      <div className="space-y-4">
        <div className="p-4 bg-surface-alt rounded-lg space-y-2">
          <div>
            <p className="text-sm text-ink-soft">Tiện ích</p>
            <p className="font-semibold text-lg text-ink">
              {AMENITY_NAMES[usage.amenity]}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-ink-soft">Căn hộ</p>
              <p className="font-semibold text-ink">{apartmentCode}</p>
            </div>
            <div>
              <p className="text-sm text-ink-soft">Người đặt</p>
              <p className="font-semibold text-ink">
                {usage.residentName || 'N/A'}
              </p>
            </div>
          </div>
          <div>
            <p className="text-sm text-ink-soft">Thời gian</p>
            <p className="font-semibold font-mono tabular-nums text-ink">
              {new Date(usage.usageDate + 'T00:00:00').toLocaleDateString('vi-VN')} |{' '}
              {usage.startTime} - {usage.endTime}
            </p>
          </div>
          <div>
            <p className="text-sm text-ink-soft">Mã Booking</p>
            <p className="font-mono tabular-nums text-sm bg-surface border border-brand-border px-2 py-1 rounded inline-block">
              {usage.bookingCode}
            </p>
          </div>
          <div>
            <p className="text-sm text-ink-soft">Trạng thái</p>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full ${getStatusBadgeClass(usage.status)}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotClass(usage.status)}`} />
              {translateStatus(usage.status)}
            </span>
          </div>
        </div>

        {usage.status === 'PENDING' ? (
          <div className="flex justify-end gap-2 pt-4 border-t border-brand-border">
            <button
              onClick={() => {
                onCancel(usage.id);
                onClose();
              }}
              className="px-4 py-2 bg-brand-danger text-white font-semibold rounded-md hover:bg-brand-danger/90 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              Hủy Đặt Chỗ
            </button>
            <button
              onClick={() => {
                onConfirm(usage.id);
                onClose();
              }}
              className="px-4 py-2 bg-accent text-white font-semibold rounded-md hover:bg-accent-hover transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              Xác Nhận Sử Dụng
            </button>
          </div>
        ) : (
          <div className="flex justify-end pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-md hover:bg-surface-alt transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              Đóng
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default BookingConfirmationModal;
