import React from 'react';

interface EmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: () => void;
  isLoading: boolean;
  data: {
    subject: string;
    html: string;
    recipientCount?: number;
  } | null;
}

const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({
  isOpen,
  onClose,
  onSend,
  isLoading,
  data,
}) => {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-2xl max-h-[92vh] overflow-y-auto custom-scrollbar flex flex-col">
        <header className="p-4 border-b border-brand-border flex justify-between items-center bg-surface-alt">
          <div>
            <h3 className="text-base font-bold text-ink">Xem trước Email</h3>
            {data.recipientCount !== undefined && (
              <span className="text-xs bg-accent-soft text-accent-ink px-2 py-0.5 rounded-full mt-1 inline-block font-medium">
                Gửi tới {data.recipientCount} người nhận
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="text-ink-soft hover:text-ink transition-colors duration-200 cursor-pointer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </header>

        <div className="flex-grow overflow-y-auto custom-scrollbar p-6 bg-surface-alt">
          <div className="bg-surface border border-brand-border rounded-xl p-6 shadow-sm">
            <div className="mb-4 pb-4 border-b border-brand-border">
              <span className="text-xs font-bold text-ink-soft uppercase tracking-wide">
                Tiêu đề:
              </span>
              <h4 className="text-lg font-semibold text-ink mt-1">{data.subject}</h4>
            </div>
            <div
              className="prose max-w-none text-ink"
              dangerouslySetInnerHTML={{ __html: data.html }}
            />
          </div>
        </div>

        <footer className="p-4 border-t border-brand-border bg-surface-alt flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-ink bg-surface border border-brand-border hover:bg-surface-alt rounded-md transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            Hủy bỏ
          </button>
          <button
            onClick={onSend}
            disabled={isLoading}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Đang gửi...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
                Xác nhận Gửi
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default EmailPreviewModal;
