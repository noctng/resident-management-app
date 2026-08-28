import React, { useState } from 'react';
import Modal from './ui/Modal';
import { User } from '../types';

interface ChangeUserPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

const ChangeUserPasswordModal: React.FC<ChangeUserPasswordModalProps> = ({
  isOpen,
  onClose,
  currentUser,
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

    if (!currentUser) {
      setError('Lỗi xác thực người dùng.');
      return;
    }

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
      const response = await fetch(`/api/users/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, currentPassword, newPassword }),
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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Đổi Mật Khẩu">
      {successMessage ? (
        <div className="text-center p-4">
          <p className="text-lg text-brand-success font-semibold">
            {successMessage}
          </p>
          <button
            onClick={handleClose}
            className="mt-4 px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-md transition-colors"
          >
            Đóng
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="current-user-password"
              className="block text-sm font-medium text-ink "
            >
              Mật khẩu hiện tại
            </label>
            <input
              type="password"
              id="current-user-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputStyle}
              required
            />
          </div>
          <div>
            <label
              htmlFor="new-user-password"
              className="block text-sm font-medium text-ink "
            >
              Mật khẩu mới
            </label>
            <input
              type="password"
              id="new-user-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputStyle}
              required
            />
          </div>
          <div>
            <label
              htmlFor="confirm-user-password"
              className="block text-sm font-medium text-ink "
            >
              Xác nhận mật khẩu mới
            </label>
            <input
              type="password"
              id="confirm-user-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputStyle}
              required
            />
          </div>

          {error && <p className="text-sm text-brand-danger text-center">{error}</p>}

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-surface-alt text-ink rounded-md hover:brightness-95 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md disabled:opacity-50 disabled:cursor-wait transition-colors"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default ChangeUserPasswordModal;
