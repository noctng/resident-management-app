import React, { useState } from 'react';
import Modal from './ui/Modal';
import { useToast } from './ui';
import type { User, Permission } from '../types';
import PermissionSelector from './PermissionSelector';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddUser: (userData: Omit<User, 'id'> & { password?: string }) => void;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onAddUser }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<User['role']>(1); // Default to Amenity Manager
  const [permissions, setPermissions] = useState<Permission[]>(['dashboard', 'amenities']); // Default permissions
  const toast = useToast();

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setRole(1);
    setPermissions(['dashboard', 'amenities']);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.warning('Tên đăng nhập và mật khẩu là bắt buộc.');
      return;
    }
    onAddUser({ username, password, role, permissions });
    handleClose();
  };

  const inputStyle =
    'mt-1 block w-full px-3 py-2 border border-brand-border rounded-md shadow-sm focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none bg-surface text-ink';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Thêm Người Dùng Mới">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium text-ink"
          >
            Tên đăng nhập
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={inputStyle}
            required
            autoComplete="off"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-ink"
          >
            Mật khẩu
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputStyle}
            required
            autoComplete="new-password"
          />
        </div>
        <div>
          <label
            htmlFor="role"
            className="block text-sm font-medium text-ink"
          >
            Vai trò
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(parseInt(e.target.value) as User['role'])}
            className={inputStyle}
          >
            <option value={1}>Nhân Viên</option>
            <option value={0}>Quản trị viên (Admin)</option>
          </select>
        </div>

        {role === 1 && (
          <PermissionSelector selectedPermissions={permissions} onChange={setPermissions} />
        )}

        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-surface-alt text-ink rounded-md hover:brightness-95 transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md transition-colors cursor-pointer"
          >
            Thêm
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddUserModal;
