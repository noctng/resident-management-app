import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import type { AmenityType, AmenityUsage, AmenityBookingData } from '../types';

interface BookAmenityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBook: (data: AmenityBookingData) => Promise<AmenityUsage>;
  amenityType: AmenityType;
}

// Fix: Added missing SAUNA and ARCHERY properties to satisfy the Record<AmenityType, string> type.
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

const BookAmenityModal: React.FC<BookAmenityModalProps> = ({
  isOpen,
  onClose,
  onBook,
  amenityType,
}) => {
  const getTodayString = () => {
    const todayDate = new Date();
    const year = todayDate.getFullYear();
    const month = String(todayDate.getMonth() + 1).padStart(2, '0');
    const day = String(todayDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getCurrentTimes = () => {
    const now = new Date();
    const startH = String(now.getHours()).padStart(2, '0');
    const startM = String(now.getMinutes()).padStart(2, '0');
    const startTime = `${startH}:${startM}`;

    const end = new Date(now.getTime() + 60 * 60 * 1000);
    let endH = String(end.getHours()).padStart(2, '0');
    let endM = String(end.getMinutes()).padStart(2, '0');
    if (end.getDate() !== now.getDate()) {
      endH = '23';
      endM = '59';
    }
    const endTime = `${endH}:${endM}`;
    return { startTime, endTime };
  };

  const today = getTodayString();
  const initialTimes = getCurrentTimes();
  const [usageDate, setUsageDate] = useState(today);
  const [startTime, setStartTime] = useState(initialTimes.startTime);
  const [endTime, setEndTime] = useState(initialTimes.endTime);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const resetForm = () => {
    const currentTimes = getCurrentTimes();
    setUsageDate(getTodayString());
    setStartTime(currentTimes.startTime);
    setEndTime(currentTimes.endTime);
    setError('');
    setSuccessMessage('');
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Reset the form state whenever the modal is opened.
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    if (!usageDate || !startTime || !endTime) {
      setError('Vui lòng điền đầy đủ thông tin.');
      setIsSubmitting(false);
      return;
    }

    if (endTime <= startTime) {
      setError('Thời gian kết thúc phải sau thời gian bắt đầu.');
      setIsSubmitting(false);
      return;
    }

    try {
      const newUsage = await onBook({ usageDate, startTime, endTime });
      setSuccessMessage(`Đặt lịch thành công! Mã booking của bạn là: ${newUsage.bookingCode}`);
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle =
    'mt-1 block w-full px-3 py-2 border border-brand-border rounded-lg shadow-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity" role="dialog" aria-modal="true">
      <div
        className="bg-white rounded-xl shadow-elevation-overlay w-full max-w-md transform transition-all scale-100 overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-4 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>📅</span>
            Đặt Lịch: {AMENITY_NAMES[amenityType]}
          </h3>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
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

        <div className="p-6">
          {successMessage ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-brand-success-soft rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <p className="text-lg text-brand-success font-bold">{successMessage.split('!')[0]}!</p>
              <p className="text-ink-soft">{successMessage.split(':')[1]}</p>
              <button
                onClick={handleClose}
                className="mt-4 px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent font-medium w-full"
              >
                Đóng
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="usageDate"
                  className="block text-xs font-semibold text-ink-soft mb-1"
                >
                  Ngày sử dụng
                </label>
                <input
                  type="date"
                  id="usageDate"
                  value={usageDate}
                  onChange={(e) => setUsageDate(e.target.value)}
                  min={today}
                  className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="startTime"
                    className="block text-xs font-semibold text-ink-soft mb-1"
                  >
                    Giờ bắt đầu
                  </label>
                  <input
                    type="time"
                    id="startTime"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="endTime"
                    className="block text-xs font-semibold text-ink-soft mb-1"
                  >
                    Giờ kết thúc
                  </label>
                  <input
                    type="time"
                    id="endTime"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-brand-danger-soft border border-brand-danger/20 rounded-lg text-sm text-brand-danger flex items-center gap-2">
                  <span>⚠️</span> {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-brand-border">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 bg-surface border border-brand-border text-ink rounded-xl hover:bg-surface-alt transition-colors cursor-pointer font-medium text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:bg-primary-300 disabled:cursor-wait font-medium text-sm shadow-sm"
                >
                  {isSubmitting ? 'Đang xử lý...' : 'Xác nhận Đặt Lịch'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookAmenityModal;
