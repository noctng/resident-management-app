import React, { useRef } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { CheckCircleIcon, XMarkIcon } from '../../components/icons';

interface BulkReport {
  total: number;
  success: number;
  failed: number;
  details: any[];
}

interface BulkReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: BulkReport | null;
}

export const BulkReportModal: React.FC<BulkReportModalProps> = ({ isOpen, onClose, report }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen);

  if (!isOpen || !report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" ref={dialogRef} role="dialog" aria-modal="true">
      <div className="bg-surface w-full max-w-lg rounded-2xl shadow-elevation-overlay overflow-hidden border border-brand-border animate-slide-up">
        <div className="p-5 border-b border-brand-border flex justify-between items-center">
          <h3 className="text-base font-bold text-ink flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-brand-success" />
            Kết Quả Gửi Email Hàng Loạt
          </h3>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-surface-alt transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-surface-alt p-3 rounded-xl border border-brand-border">
              <p className="text-xs text-ink-soft">Tổng cộng</p>
              <p className="text-xl font-bold font-mono tabular-nums text-ink mt-0.5">
                {report.total}
              </p>
            </div>
            <div className="bg-brand-success-soft p-3 rounded-xl border border-brand-success/20">
              <p className="text-xs text-brand-success">Thành công</p>
              <p className="text-xl font-bold font-mono tabular-nums text-brand-success mt-0.5">
                {report.success}
              </p>
            </div>
            <div className="bg-brand-danger-soft p-3 rounded-xl border border-brand-danger/20">
              <p className="text-xs text-brand-danger">Thất bại</p>
              <p className="text-xl font-bold font-mono tabular-nums text-brand-danger mt-0.5">
                {report.failed}
              </p>
            </div>
          </div>

          {report.failed > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-ink mb-2">Chi tiết lỗi:</p>
              <div className="max-h-40 overflow-y-auto border border-brand-border rounded-xl p-2.5 bg-surface-alt/60 text-xs custom-scrollbar">
                {report.details
                  .filter((d: any) => d.status !== 'Sent')
                  .map((d: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex justify-between py-1.5 border-b last:border-0 border-brand-border/60"
                    >
                      <span className="font-mono font-semibold text-ink">{d.apartment}</span>
                      <span className="text-brand-danger font-medium">{d.status}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
        <div className="p-4 bg-surface-alt/60 border-t border-brand-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkReportModal;
