import React, { useState, useMemo } from 'react';
import type { Feedback, User } from '../types';
import {
  ArrowLeftIcon,
  ChatBubbleBottomCenterTextIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from '../components/icons';
// import Modal from '../components/Modal'; // Removed as custom modal is used
import ImageViewerModal from '../components/ImageViewerModal';
import {
  getFeedbackStatusBadgeClass,
  translateFeedbackStatus,
} from '../constants/statusLabels';

interface FeedbackManagementPageProps {
  feedbackList: Feedback[];
  onResolveFeedback: (feedbackId: string, formData: FormData) => Promise<void>;
  onBack: () => void;
}

const ResolveFeedbackModal: React.FC<{
  feedback: Feedback;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (feedbackId: string, formData: FormData) => Promise<void>;
}> = ({ feedback, isOpen, onClose, onResolve }) => {
  const [responseContent, setResponseContent] = useState('');
  const [responseImageFiles, setResponseImageFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseContent.trim()) {
      setError('Vui lòng nhập nội dung phản hồi.');
      return;
    }
    setIsSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('adminResponseContent', responseContent);
      responseImageFiles.forEach((file) => {
        formData.append('adminResponseImageData', file);
      });

      await onResolve(feedback.id, formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gửi phản hồi thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-fade-in"
        onClick={onClose}
      >
        <div
          className="bg-surface rounded-2xl border border-brand-border shadow-elevation-raised w-full max-w-lg max-h-[92vh] overflow-y-auto custom-scrollbar animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center p-5 border-b border-brand-border bg-surface">
            <div>
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <span className="p-1.5 bg-accent-soft rounded-lg">
                  <ChatBubbleBottomCenterTextIcon className="w-5 h-5 text-accent-ink" />
                </span>
                Phản hồi P.A #{feedback.id.split('_')[1]}
              </h3>
              <p className="text-sm text-ink-soft mt-1">
                Xem và xử lý phản ánh của cư dân
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Đóng"
              className="p-2 text-ink-faint hover:text-ink hover:bg-surface-alt rounded-full transition-colors cursor-pointer"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-surface-alt/50 rounded-xl p-4 border border-brand-border">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center border border-accent/30 text-accent-ink font-bold text-xs">
                  {feedback.residentName?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="text-sm font-bold text-ink ">
                    {feedback.residentName || 'Cư dân ẩn danh'}
                  </p>
                  <p className="text-sm text-ink-soft ">
                    Căn hộ <span className="font-mono">{feedback.apartmentCode}</span> •{' '}
                    {new Date(feedback.submittedAt).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
              <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed bg-surface p-3 rounded-lg border border-brand-border">
                {feedback.content}
              </p>

              {feedback.imageData && feedback.imageData.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase text-ink-soft mb-2 tracking-wider">
                    Hình ảnh đính kèm:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {feedback.imageData.map((filename, index) => (
                      <button
                        type="button"
                        onClick={() => setViewingImage(`/picture_feedback/${filename}`)}
                        key={index}
                        className="group relative w-14 h-14 rounded-lg overflow-hidden border border-brand-border bg-surface-alt cursor-pointer"
                      >
                        <img
                          src={`/picture_feedback/${filename}`}
                          alt={`Resident attachment ${index + 1}`}
                          className="w-full h-full object-cover"
                        />                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {feedback.status === 'RESOLVED' ? (
              <div className="bg-brand-success-soft/30 rounded-xl p-4 border border-brand-success/25">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-brand-success-soft flex items-center justify-center text-brand-success font-bold text-xs">
                    BQL
                  </div>
                  <div>
                    <p className="text-sm font-bold text-brand-success">
                      Ban Quản Lý
                    </p>
                    <p className="text-sm text-ink-soft ">
                      Xử lý bởi {feedback.resolvedByUsername} •{' '}
                      {new Date(feedback.resolvedAt!).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed bg-surface p-3 rounded-lg border border-brand-border">
                  {feedback.adminResponseContent}
                </p>

                {feedback.adminResponseImageData && feedback.adminResponseImageData.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase text-ink-soft mb-2 tracking-wider">
                      Hình ảnh phản hồi:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {feedback.adminResponseImageData.map((filename, index) => (
                        <button
                          type="button"
                          onClick={() => setViewingImage(`/picture_feedback/${filename}`)}
                          key={index}
                          className="group relative w-14 h-14 rounded-lg overflow-hidden border border-brand-border bg-surface-alt cursor-pointer"
                        >
                          <img
                            src={`/picture_feedback/${filename}`}
                            alt={`Admin attachment ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="border-t border-brand-border pt-4">
                  <p className="text-sm font-bold text-ink mb-3">
                    Phản hồi của Ban Quản Lý
                  </p>
                  <div>
                    <label
                      htmlFor="response-content"
                      className="block text-xs font-medium text-ink-soft mb-1"
                    >
                      Nội dung xử lý <span className="text-brand-danger">*</span>
                    </label>
                    <textarea
                      id="response-content"
                      rows={4}
                      value={responseContent}
                      onChange={(e) => setResponseContent(e.target.value)}
                      placeholder="Nhập nội dung phản hồi cho cư dân..."
                      className="w-full px-4 py-3 border border-brand-border rounded-xl bg-surface text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none"
                      required
                    ></textarea>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-2">
                    Đính kèm hình ảnh (tùy chọn)
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label
                      htmlFor="response-image"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-brand-border border-dashed rounded-xl cursor-pointer bg-surface-alt/50 hover:bg-surface-alt transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg
                          className="w-8 h-8 mb-3 text-ink-faint"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          ></path>
                        </svg>
                        <p className="text-sm text-ink-soft ">
                          <span className="font-semibold">Nhấn để tải lên</span> hoặc kéo thả
                        </p>
                        <p className="text-sm text-ink-faint ">
                          PNG, JPG (Tối đa 5 ảnh)
                        </p>
                      </div>
                      <input
                        id="response-image"
                        type="file"
                        className="hidden"
                        accept="image/png, image/jpeg"
                        multiple
                        onChange={(e) =>
                          setResponseImageFiles(e.target.files ? Array.from(e.target.files) : [])
                        }
                      />
                    </label>
                  </div>
                  {responseImageFiles.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {responseImageFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="bg-accent-soft text-accent-ink px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 border border-accent/30"
                        >
                          <span>{file.name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setResponseImageFiles((files) => files.filter((_, i) => i !== idx))
                            }
                            className="hover:text-accent-hover "
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-4 h-4"
                            >
                              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-brand-danger-soft text-brand-danger text-sm rounded-lg flex items-center gap-2 border border-brand-danger/25">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-5 h-5 flex-shrink-0"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {error}
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 bg-surface border border-brand-border text-ink-soft rounded-xl hover:bg-surface-alt font-medium transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent/40 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
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
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-5 h-5"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Xác nhận Đã xử lý
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
      <ImageViewerModal
        isOpen={!!viewingImage}
        onClose={() => setViewingImage(null)}
        imageUrl={viewingImage}
      />
    </>
  );
};

import FeedbackStats from '../components/FeedbackStats';

// ... (existing helper function)

const FeedbackManagementPage: React.FC<FeedbackManagementPageProps> = ({
  feedbackList,
  onResolveFeedback,
  onBack,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'RESOLVED'>('ALL');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  const filteredFeedback = useMemo(() => {
    return feedbackList
      .filter((fb) => statusFilter === 'ALL' || fb.status === statusFilter)
      .filter((fb) => {
        const lowerSearch = searchTerm.toLowerCase();
        return (
          fb.id.toLowerCase().includes(lowerSearch) ||
          (fb.residentName || '').toLowerCase().includes(lowerSearch) ||
          (fb.apartmentCode || '').toLowerCase().includes(lowerSearch)
        );
      });
  }, [feedbackList, searchTerm, statusFilter]);

  const handleFilterChange = (status: 'ALL' | 'SUBMITTED' | 'RESOLVED') => {
    if (statusFilter === status && status !== 'ALL') {
      setStatusFilter('ALL'); // Toggle off if clicking the same active filter
    } else {
      setStatusFilter(status);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-center justify-between pb-4 border-b border-brand-border">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-surface-alt transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="w-5 h-5 text-ink-soft" />
          </button>
          <h1 className=" font-seriftext-3xl font-bold text-ink">Quản Lý Phản Ánh</h1>
        </div>
      </header>

      <FeedbackStats
        feedbackList={feedbackList}
        onFilterChange={handleFilterChange}
        currentFilter={statusFilter}
      />

      <div className="bg-surface rounded-xl shadow-xs border border-brand-border p-4">
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-grow relative">
            <input
              type="text"
              placeholder="Tìm theo mã P.A, tên cư dân, mã căn hộ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-surface text-ink placeholder:text-ink-faint"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-ink-faint" />
            </div>
          </div>
          {statusFilter !== 'ALL' && (
            <button
              onClick={() => setStatusFilter('ALL')}
              className="px-4 py-2 text-sm text-accent hover:text-accent-hover font-medium hover:bg-accent-soft rounded-full transition-colors cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-brand-border">
          <table className="w-full text-sm text-left">
            <thead className="text-sm text-ink-soft uppercase bg-surface-alt border-b border-brand-border">
              <tr>
                <th className="px-6 py-3 tracking-wider font-semibold">Mã P.A</th>
                <th className="px-6 py-3 tracking-wider font-semibold">Căn hộ</th>
                <th className="px-6 py-3 tracking-wider font-semibold">Cư dân</th>
                <th className="px-6 py-3 tracking-wider font-semibold">Ngày gửi</th>
                <th className="px-6 py-3 tracking-wider font-semibold">Trạng thái</th>
                <th className="px-6 py-3 tracking-wider text-center font-semibold">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border bg-surface">
              {filteredFeedback.length > 0 ? (
                filteredFeedback.map((fb) => (
                  <tr
                    key={fb.id}
                    className="hover:bg-surface-alt/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-sm text-ink-soft">
                      #{fb.id.split('_')[1]}
                    </td>
                    <td className="px-6 py-4 font-semibold text-ink">
                      {fb.apartmentCode}
                    </td>
                    <td className="px-6 py-4 text-ink-soft">
                      {fb.residentName}
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-faint">
                      {new Date(fb.submittedAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full ${getFeedbackStatusBadgeClass(
                          fb.status,
                        )}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {translateFeedbackStatus(fb.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedFeedback(fb)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border cursor-pointer ${
                          fb.status === 'RESOLVED'
                            ? 'bg-surface text-ink-soft border-brand-border hover:bg-surface-alt'
                            : 'bg-accent text-white border-transparent hover:bg-accent-hover'
                        }`}
                      >
                        {fb.status === 'RESOLVED' ? 'Xem lại' : 'Xem & Phản hồi'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-ink-soft">
                    Không tìm thấy phản ánh nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedFeedback && (
        <ResolveFeedbackModal
          feedback={selectedFeedback}
          isOpen={!!selectedFeedback}
          onClose={() => setSelectedFeedback(null)}
          onResolve={onResolveFeedback}
        />
      )}
    </div>
  );
};

export default FeedbackManagementPage;
