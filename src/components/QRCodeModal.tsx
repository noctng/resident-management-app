import React from 'react';
import Modal from './ui/Modal';
import { QrCodeIcon } from './icons';
import type { AmenityUsage, AmenityType } from '../types';

interface QRCodeModalProps {
  usage: AmenityUsage | null;
  isOpen: boolean;
  onClose: () => void;
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

const QRCodeModal: React.FC<QRCodeModalProps> = ({ usage, isOpen, onClose }) => {
  if (!isOpen || !usage) return null;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(usage.bookingCode)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
      <div
        className="bg-surface rounded-2xl shadow-xl border border-brand-border w-full max-w-sm overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 border-b border-brand-border flex justify-between items-center shrink-0">
          <h3 className="text-base font-bold text-ink flex items-center gap-2">
            <QrCodeIcon className="w-5 h-5 text-accent" />
            Mã QR Đặt Chỗ
          </h3>
          <button
            onClick={onClose}
            className="text-ink-faint hover:text-ink-soft p-1 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 flex flex-col items-center">
          <div className="bg-surface p-3 rounded-xl border border-brand-border shadow-sm mb-4 inline-block">
            <img
              src={qrCodeUrl}
              alt={`QR Code for ${usage.bookingCode}`}
              className="w-48 h-48 rounded-lg"
            />
          </div>

          <div className="text-center w-full space-y-3">
            <div className="border-b border-brand-border pb-3 mb-3">
              <p className="text-xl font-bold text-ink">{AMENITY_NAMES[usage.amenity]}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-right text-ink-soft">Ngày:</div>
              <div className="text-left font-semibold text-ink">
                {new Date(usage.usageDate + 'T00:00:00').toLocaleDateString('vi-VN')}
              </div>

              <div className="text-right text-ink-soft">Giờ:</div>
              <div className="text-left font-semibold text-ink">
                {usage.startTime} - {usage.endTime}
              </div>
            </div>

            <div className="mt-4 pt-3 bg-surface-alt rounded-lg p-3 w-full">
              <p className="text-xs text-ink-soft uppercase tracking-wider font-semibold mb-1">
                Mã Booking
              </p>
              <p className="font-mono tabular-nums text-xl font-bold text-accent tracking-wider">
                {usage.bookingCode}
              </p>
            </div>
          </div>

          <div className="w-full mt-6">
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 bg-surface-alt text-ink rounded-xl hover:brightness-95 transition-colors font-medium text-sm cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;
