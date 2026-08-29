import React, { useState } from 'react';
import type { Feedback } from '../../types';
import {
  ChatBubbleBottomCenterTextIcon,
  ClockIcon,
  PhotoIcon,
} from '../../components/icons';

const FEEDBACK_STATUS_BADGE: Record<
  Feedback['status'],
  { label: string; className: string }
> = {
  SUBMITTED: { label: 'Tiếp nhận', className: 'bg-brand-warning-soft text-brand-warning' },
  RESOLVED: { label: 'Hoàn tất', className: 'bg-brand-success-soft text-brand-success' },
};

interface PortalFeedbackSectionProps {
  apartmentId: string;
  residentId: string;
  feedbackList: Feedback[];
  onAddFeedback: (data: FormData) => Promise<void>;
  onViewDetails: (feedback: Feedback) => void;
}

export const PortalFeedbackSection: React.FC<PortalFeedbackSectionProps> = ({
  apartmentId,
  residentId,
  feedbackList,
  onAddFeedback,
  onViewDetails,
}) => {
  const [content, setContent] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Vui lòng nhập nội dung phản ánh.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('apartmentId', apartmentId);
      formData.append('residentId', residentId);
      formData.append('content', content);
      imageFiles.forEach((file) => {
        formData.append('imageData', file);
      });

      await onAddFeedback(formData);
      setSuccess('Gửi phản ánh thành công! Ban quản lý sẽ xem xét sớm nhất.');
      setContent('');
      setImageFiles([]);
      const fileInput = document.getElementById('feedback-image') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      setError(err.message || 'Gửi phản ánh thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h3 className="text-base font-bold text-ink mb-4 flex items-center gap-2">
          <span className="p-1.5 bg-accent-soft text-accent-ink rounded-lg">
            <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />
          </span>
          Gửi Phản Ánh Mới
        </h3>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 p-5 bg-surface rounded-2xl shadow-elevation-raised border border-brand-border"
        >
          <div>
            <label
              htmlFor="feedback-content"
              className="block text-xs font-semibold text-ink-soft mb-1"
            >
              Nội dung
            </label>
            <textarea
              id="feedback-content"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 rounded-[10px] border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              placeholder="Nhập ý kiến hoặc vấn đề bạn gặp phải..."
              required
            />
          </div>
          <div>
            <label
              htmlFor="feedback-image"
              className="block text-xs font-semibold text-ink-soft mb-1"
            >
              Đính kèm hình ảnh (tùy chọn)
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-brand-border rounded-xl bg-surface-alt/50 hover:border-accent/40 transition-colors cursor-pointer relative">
              <input
                type="file"
                id="feedback-image"
                accept="image/png, image/jpeg"
                multiple
                onChange={(e) => setImageFiles(e.target.files ? Array.from(e.target.files) : [])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="space-y-1 text-center">
                <PhotoIcon className="mx-auto h-10 w-10 text-ink-faint" />
                {imageFiles.length > 0 ? (
                  <p className="text-xs text-accent font-semibold">
                    {imageFiles.length} ảnh đã chọn
                  </p>
                ) : (
                  <div className="text-xs text-ink-soft">
                    <span className="font-semibold text-accent hover:underline">
                      Tải ảnh lên
                    </span>
                    <span className="pl-1">hoặc kéo thả vào đây</span>
                  </div>
                )}
                <p className="text-[11px] text-ink-faint">PNG, JPG tối đa 10MB</p>
              </div>
            </div>
          </div>
          {error && (
            <div className="p-3 bg-brand-danger-soft border border-brand-danger/30 text-brand-danger text-xs rounded-xl flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-3 bg-brand-success-soft border border-brand-success/30 text-brand-success text-xs rounded-xl flex items-center gap-2">
              <span>{success}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isSubmitting ? 'Đang gửi...' : 'Gửi Phản Ánh'}
          </button>
        </form>
      </div>

      <div>
        <h3 className="text-base font-bold text-ink mb-4 flex items-center gap-2">
          <span className="p-1.5 bg-secondary-100 text-secondary-600 rounded-lg">
            <ClockIcon className="w-4 h-4" />
          </span>
          Lịch sử Phản Ánh
        </h3>
        {feedbackList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-surface-alt/50 rounded-2xl border-2 border-dashed border-brand-border text-ink-faint">
            <p className="text-xs font-medium">Chưa có phản ánh nào</p>
          </div>
        ) : (
          <ul className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            {feedbackList.map((fb) => (
              <li
                key={fb.id}
                className="bg-surface border border-brand-border rounded-xl p-4 shadow-xs"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full ${FEEDBACK_STATUS_BADGE[fb.status].className}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {FEEDBACK_STATUS_BADGE[fb.status].label}
                      </span>
                      <span className="text-xs text-ink-faint">
                        {new Date(fb.submittedAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-sm text-ink line-clamp-3">
                      {fb.content}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-border/60">
                  <span
                    className={`text-xs ${
                      fb.imageData && fb.imageData.length > 0
                        ? 'text-secondary-600 font-medium'
                        : 'text-ink-faint'
                    }`}
                  >
                    {fb.imageData?.length || 0} ảnh
                  </span>
                  <button
                    onClick={() => onViewDetails(fb)}
                    className="text-xs text-accent-ink hover:underline font-semibold px-2.5 py-1 bg-accent-soft rounded-lg transition-colors cursor-pointer"
                  >
                    Chi tiết →
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PortalFeedbackSection;
