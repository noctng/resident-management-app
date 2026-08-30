import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import type { User, Permission } from '../types';
import PermissionSelector, { RoleSelector } from './PermissionSelector';
import PermissionMatrixSelector from './PermissionMatrixSelector';
import { api } from '../services/api';
import { useToast } from './ui';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user, onUpdateUser }) => {
  const [role, setRole] = useState<User['role']>(1);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [username, setUsername] = useState('');
  const { toast } = useToast();
  const { success, error } = useToast();

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setRole(user.role);
      setPermissions(user.permissions || []);
      // Lấy roles từ user (nếu có) hoặc fallback theo role Int cũ
      if (user.roles && user.roles.length > 0) {
        setSelectedRoles(user.roles.map((r) => r.code));
      } else {
        setSelectedRoles(user.role === 0 ? ['ADMIN'] : ['MANAGER']);
      }
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      onUpdateUser(user.id, { role, permissions });
      // Gán vai trò RBAC qua endpoint chuyên biệt (1 user nhiều vai trò)
      api
        .put(`/users/${user.id}/roles`, { roles: selectedRoles })
        .then(() => success('Đã cập nhật vai trò RBAC'))
        .catch((err) => error(err?.message || 'Lỗi gán vai trò'));
      onClose();
    }
  };

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Sửa Người Dùng: ${username}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink">
            Vai trò (legacy)
          </label>
          <select
            value={role}
            onChange={(e) => setRole(parseInt(e.target.value) as User['role'])}
            className="mt-1 block w-full px-3 py-2 border border-brand-border rounded-md shadow-sm focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none bg-surface text-ink"
            disabled={user.username === 'admin'}
          >
            <option value={1}>Nhân Viên</option>
            <option value={0}>Quản trị viên (Admin)</option>
          </select>
        </div>

        <RoleSelector selectedRoles={selectedRoles} onChange={setSelectedRoles} />

        <PermissionMatrixSelector selectedRoles={selectedRoles} value={[]} onChange={() => {}} disabled />

        {role === 1 && (
          <PermissionSelector selectedPermissions={permissions} onChange={setPermissions} />
        )}

        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-surface-alt text-ink rounded-md hover:brightness-95 transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md transition-colors cursor-pointer"
          >
            Lưu
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditUserModal;
