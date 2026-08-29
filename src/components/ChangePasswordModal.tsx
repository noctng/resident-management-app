import React, { useState } from 'react';
import Modal from './ui/Modal';
import { KeyIcon, CheckCircleIcon, ExclamationTriangleIcon } from './icons';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  residentId: string;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  residentId,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccessMessage('');
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới không khớp.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/resident-portal/change-password/${residentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Đổi mật khẩu thất bại.');
      }
      setSuccessMessage(data.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle =
    'mt-1 block w-full px-3 py-2 border border-brand-border rounded-md shadow-sm focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none bg-surface text-ink';

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity" role="dialog" aria-modal="true">
      <div
        className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-md overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 border-b border-brand-border flex justify-between items-center shrink-0">
          <h3 className="text-base font-bold text-ink flex items-center gap-2">
            <KeyIcon className="w-5 h-5 text-accent" />
            Đổi Mật Khẩu
          </h3>
          <button
            onClick={handleClose}
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

        <div className="p-6">
          {successMessage ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-brand-success-soft rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircleIcon className="w-8 h-8 text-brand-success" />
              </div>
              <p className="text-lg text-brand-success font-bold">{successMessage}</p>
              <button
                onClick={handleClose}
                className="mt-4 px-6 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 font-medium w-full transition-colors"
              >
                Đóng
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="current-password"
                    className="block text-sm font-semibold text-ink mb-1"
                  >
                    Mật khẩu hiện tại
                  </label>
                  <input
                    type="password"
                    id="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-brand-border rounded-lg shadow-sm focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none text-ink"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-password"
                    className="block text-sm font-semibold text-ink mb-1"
                  >
                    Mật khẩu mới
                  </label>
                  <input
                    type="password"
                    id="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-brand-border rounded-lg shadow-sm focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none text-ink"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="confirm-password"
                    className="block text-sm font-semibold text-ink mb-1"
                  >
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    type="password"
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-brand-border rounded-lg shadow-sm focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none text-ink"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-brand-danger-soft border border-brand-danger/20 rounded-lg text-sm text-brand-danger flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 shrink-0" /> {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-brand-border">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 bg-surface-alt text-ink rounded-xl hover:brightness-95 transition-colors font-medium text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl disabled:opacity-50 disabled:cursor-wait font-medium text-sm shadow-sm transition-colors"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
