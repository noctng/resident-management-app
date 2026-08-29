import React, { useState, useEffect , useRef} from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { api } from '../../services/api';
import { useToast } from '../ui';

interface Props {
  paymentId: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSend: () => void;
}

const EmailPreviewModal: React.FC<Props> = ({ paymentId, isOpen, onClose, onConfirmSend }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen);

  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen && paymentId) {
      loadPreview();
    }
  }, [isOpen, paymentId]);

  const loadPreview = async () => {
    try {
      setLoading(true);
      const data = await api.get<{ subject: string; html: string }>(
        `/contracts/payments/${paymentId}/reminder/preview`
      );
      setPreview(data);
    } catch (error) {
      console.error('Failed to load email preview:', error);
      toast.error('Không thể tải preview email');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    try {
      setSending(true);
      await api.post(`/contracts/payments/${paymentId}/reminder`);
      toast.success('Đã gửi email nhắc nợ thành công!');
      onConfirmSend();
      onClose();
    } catch (error) {
      console.error('Failed to send reminder:', error);
      toast.error('Gửi email thất bại');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" ref={dialogRef} role="dialog" aria-modal="true">
      <div className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border max-w-3xl w-full max-h-[92vh] overflow-y-auto custom-scrollbar flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-brand-border">
          <h3 className="text-lg font-bold text-ink">
            Xem trước Email Nhắc nợ
          </h3>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
              <p className="text-ink-soft mt-4">Đang tải preview...</p>
            </div>
          ) : preview ? (
            <div className="space-y-4">
              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-2">
                  Tiêu đề:
                </label>
                <div className="px-4 py-3 bg-surface-alt rounded-lg border border-brand-border">
                  <p className="text-ink font-semibold">{preview.subject}</p>
                </div>
              </div>

              {/* Email Body */}
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-2">
                  Nội dung:
                </label>
                <div className="bg-white border border-brand-border rounded-xl overflow-hidden">
                  <div
                    className="p-6 bg-white prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: preview.html }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-ink-soft">
              Không thể tải preview
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-brand-border flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-lg hover:bg-surface-alt transition-colors duration-200 cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            Hủy
          </button>
          <button
            onClick={handleSend}
            disabled={sending || loading}
            className="px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors duration-200 cursor-pointer disabled:opacity-50 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40" aria-label="Đóng">
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Đang gửi...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Gửi Email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailPreviewModal;
