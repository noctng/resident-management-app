import React, { useState, useEffect } from 'react';
import type { User, Permission } from '../types';
import { ArrowLeftIcon, PlusIcon, TrashIcon, KeyIcon, PencilIcon, ClockIcon, UserIcon } from '../components/icons';
import AddUserModal from '../components/AddUserModal';
import EditUserModal from '../components/EditUserModal';
import { PERMISSION_LABELS, ROLE_LABELS } from '../components/PermissionSelector';
import { useToast, useConfirm } from '../components/ui';
import { EmptyState } from '../components/ui';

interface UserManagementPageProps {
  onBack: () => void;
  currentUser?: User | null;
}

const UserManagementPage: React.FC<UserManagementPageProps> = ({ onBack, currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddUserModalOpen, setAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const toast = useToast();
  const { confirm } = useConfirm();

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/users`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (userData: Omit<User, 'id'> & { password?: string }) => {
    try {
      const response = await fetch(`/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
        credentials: 'include',
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to add user');
      }
      fetchUsers(); // Refresh the list
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    }
  };

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to update user');
      fetchUsers(); // Refresh list to get latest data
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (
      !(await confirm({
        title: 'Xóa người dùng',
        description: 'Bạn có chắc chắn muốn xóa người dùng này không?',
        variant: 'danger',
      }))
    )
      return;
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete user');
      setUsers(users.filter((u) => u.id !== userId));
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    }
  };

  const handleResetPassword = async (userId: string, username: string) => {
    if (
      !(await confirm({
        title: 'Reset mật khẩu',
        description: `Bạn có chắc muốn reset mật khẩu cho "${username}" về mặc định (Mk@12345) không?`,
        variant: 'primary',
      }))
    )
      return;
    try {
      const response = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Reset mật khẩu thất bại.');
      }
      toast.success(data.message);
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    }
  };

  const roleMap = {
    0: 'Quản trị viên (Admin)',
    1: 'Nhân Viên',
  };

  return (
    <div className="bg-surface border border-brand-border rounded-xl shadow-sm p-6 h-full flex flex-col">
      <header className="flex items-center justify-between mb-6 pb-4 border-b border-brand-border">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg border border-brand-border bg-surface text-ink-soft hover:text-accent hover:border-accent/40 transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="font-serif text-3xl font-bold text-ink">Quản Lý Tài Khoản</h1>
        </div>
        <button
          onClick={() => setAddUserModalOpen(true)}
          className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 flex items-center gap-2 transition-colors duration-200 cursor-pointer"
        >
          <PlusIcon className="w-5 h-5" />
          Thêm Người Dùng
        </button>
      </header>

      <main className="flex-grow overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-ink-soft py-10 text-sm">
            <span className="w-5 h-5 rounded-full border-2 border-brand-border border-t-accent animate-spin"></span>
            Đang tải danh sách người dùng...
          </div>
        )}
        {error && <p className="text-brand-danger text-sm">{error}</p>}
        {!isLoading && !error && (
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left relative">
              <thead className="bg-surface-alt text-[11px] uppercase tracking-wider font-semibold text-ink-soft sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-6 py-3">
                    Tên đăng nhập
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Vai trò
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Quyền hạn
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-alt/60 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-full bg-accent-soft text-accent-ink font-bold flex items-center justify-center shrink-0">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                        <span className="font-mono text-sm font-semibold text-ink">
                          {user.username}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.role === 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-accent-soft text-accent-ink">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                          {user.roles && user.roles.length > 0
                            ? user.roles.map((r) => r.code).join(', ')
                            : roleMap[user.role]}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-secondary-200 text-secondary-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary-500"></span>
                          {user.roles && user.roles.length > 0
                            ? user.roles.map((r) => r.code).join(', ')
                            : roleMap[user.role] || 'Unknown'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.role === 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-success-soft text-brand-success">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-success"></span>
                          Toàn quyền
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {user.permissions && user.permissions.length > 0 ? (
                            user.permissions.map((perm) => (
                              <span
                                key={perm}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-alt text-ink-soft border border-brand-border"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-ink-faint"></span>
                                {PERMISSION_LABELS[perm]}
                              </span>
                            ))
                          ) : (
                            <span className="text-ink-soft italic text-xs">Chưa có quyền</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.username !== 'admin' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => (window.location.href = `#/admin/logs?userId=${user.id}`)}
                            className="p-1.5 rounded-lg border border-brand-border bg-surface text-ink-soft hover:text-accent hover:border-accent/40 transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40"
                            aria-label={`View audit logs for ${user.username}`}
                            title="Xem Lịch Sử Thao Tác Của Người Dùng"
                          >
                            <ClockIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingUser(user)}
                            className="p-1.5 rounded-lg border border-brand-border bg-surface text-ink-soft hover:text-accent hover:border-accent/40 transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40"
                            aria-label={`Edit ${user.username}`}
                            title="Sửa Người Dùng & Phân Quyền"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          {currentUser?.role === 0 && (
                            <>
                              <button
                                onClick={() => handleResetPassword(user.id, user.username)}
                                className="p-1.5 rounded-lg border border-brand-border bg-surface text-brand-warning hover:bg-brand-warning-soft hover:border-brand-warning/40 transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40"
                                aria-label={`Reset password for ${user.username}`}
                                title="Reset Mật Khẩu (Admin only)"
                              >
                                <KeyIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-1.5 rounded-lg border border-brand-border bg-surface text-brand-danger hover:bg-brand-danger-soft hover:border-brand-danger/40 transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40"
                                aria-label={`Delete ${user.username}`}
                                title="Xóa Người Dùng (Admin only)"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <EmptyState
                icon={UserIcon}
                tone="neutral"
                title="Chưa có người dùng nào"
                description="Thêm người dùng mới để bắt đầu quản lý hệ thống"
                size="md"
              />
            )}
          </div>
        )}
      </main>
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setAddUserModalOpen(false)}
        onAddUser={handleAddUser}
      />
      <EditUserModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        user={editingUser}
        onUpdateUser={handleUpdateUser}
      />
    </div>
  );
};

export default UserManagementPage;
