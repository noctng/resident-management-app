import React, { useState } from 'react';
import Modal from './ui/Modal';
import { Feedback } from '../types';
import ImageViewerModal from './ImageViewerModal';
import { ChatBubbleBottomCenterTextIcon, UserIcon, ShieldCheckIcon } from './icons';

interface FeedbackDetailModalProps {
  feedback: Feedback | null;
  isOpen: boolean;
  onClose: () => void;
}

const getFeedbackStatusClass = (status: Feedback['status']) => {
  return status === 'RESOLVED'
    ? 'bg-brand-success-soft text-brand-success'
    : 'bg-primary-100 text-primary-700 border border-primary-200';
};

const FeedbackDetailModal: React.FC<FeedbackDetailModalProps> = ({ feedback, isOpen, onClose }) => {
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  if (!isOpen || !feedback) return null;

  const handleClose = () => {
    setViewingImage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity" role="dialog" aria-modal="true">
      <div
        className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] custom-scrollbar"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-4 sm:p-5 flex justify-between items-center shrink-0">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <ChatBubbleBottomCenterTextIcon className="w-5 h-5" />
            Chi tiết Phản Ánh #{feedback.id.split('_')[1]}
          </h3>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          {/* Feedback Info */}
          <div className="flex justify-between items-start pb-4 border-b border-brand-border">
            <div>
              <p className="text-xs text-ink-soft font-medium uppercase tracking-wider mb-1">
                Ngày gửi
              </p>
              <p className="font-semibold text-ink">
                {new Date(feedback.submittedAt).toLocaleString('vi-VN')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-ink-soft font-medium uppercase tracking-wider mb-1">
                Trạng thái
              </p>
              <span
                className={`px-2.5 py-1 text-xs font-bold rounded-lg ${getFeedbackStatusClass(feedback.status)}`}
              >
                {feedback.status === 'RESOLVED' ? 'Đã xử lý' : 'Đã gửi'}
              </span>
            </div>
          </div>

          {/* Resident Content */}
          <div className="bg-surface-alt rounded-xl p-4 border border-brand-border">
            <p className="text-sm font-bold text-ink mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-surface border border-brand-border flex items-center justify-center text-xs text-accent-ink">
                <UserIcon className="w-4 h-4" />
              </span>
              Nội dung Phản Ánh
            </p>
            <p className="text-sm text-ink-soft whitespace-pre-wrap leading-relaxed pl-8">
              {feedback.content}
            </p>

            {feedback.imageData && feedback.imageData.length > 0 && (
              <div className="mt-4 pl-8">
                <p className="text-xs font-medium text-ink-soft mb-2">Hình ảnh đính kèm:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {feedback.imageData.map((filename, index) => (
                    <button
                      type="button"
                      onClick={() => setViewingImage(`/picture_feedback/${filename}`)}
                      key={index}
                      className="group relative overflow-hidden rounded-lg aspect-video border border-brand-border cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                      <img
                        src={`/picture_feedback/${filename}`}
                        alt={`Attachment ${index + 1}`}
                        className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-90"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Admin Response */}
          {feedback.status === 'RESOLVED' && (
            <div className="bg-brand-success-soft rounded-xl p-4 border border-brand-success/20">
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-bold text-brand-success flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-surface border border-brand-success/30 flex items-center justify-center text-xs text-brand-success">
                    <ShieldCheckIcon className="w-4 h-4" />
                  </span>
                  Phản hồi từ Ban Quản Lý
                </p>
                {feedback.resolvedAt && (
                  <span className="text-xs font-mono text-brand-success bg-surface/60 px-2 py-0.5 rounded-md">
                    {new Date(feedback.resolvedAt).toLocaleString('vi-VN')}
                  </span>
                )}
              </div>

              <div className="pl-8">
                <p className="text-sm text-brand-success whitespace-pre-wrap leading-relaxed">
                  {feedback.adminResponseContent}
                </p>
                {feedback.resolvedByUsername && (
                  <p className="text-xs text-brand-success mt-2 italic">
                    — Xử lý bởi: <span className="font-medium">{feedback.resolvedByUsername}</span>
                  </p>
                )}

                {feedback.adminResponseImageData && feedback.adminResponseImageData.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-brand-success mb-2">Hình ảnh phản hồi:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {feedback.adminResponseImageData.map((filename, index) => (
                        <button
                          type="button"
                          onClick={() => setViewingImage(`/picture_feedback/${filename}`)}
                          key={index}
                          className="group relative overflow-hidden rounded-lg aspect-video border border-brand-success/30 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                        >
                          <img
                            src={`/picture_feedback/${filename}`}
                            alt={`Response attachment ${index + 1}`}
                            className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-90"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-surface-alt border-t border-brand-border flex justify-end gap-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-surface text-ink border border-brand-border rounded-lg hover:bg-surface-alt transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 shadow-sm font-medium text-sm"
          >
            Đóng
          </button>
        </div>
      </div>
      <ImageViewerModal
        isOpen={!!viewingImage}
        onClose={() => setViewingImage(null)}
        imageUrl={viewingImage}
      />
    </div>
  );
};

export default FeedbackDetailModal;
