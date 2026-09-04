import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { ResidentAccountInfo } from '../types';
import { ArrowLeftIcon, ArrowPathIcon, UserPlusIcon, MagnifyingGlassIcon, KeyIcon, ShieldCheckIcon } from '../components/icons';
import { useToast, useConfirm } from '../components/ui';
import { EmptyState } from '../components/ui';
import RolePermissionPanel from '../components/RolePermissionPanel';

interface ResidentAccountsPageProps {
  onBack: () => void;
}

const ResidentAccountsPage: React.FC<ResidentAccountsPageProps> = ({ onBack }) => {
  const [accounts, setAccounts] = useState<ResidentAccountInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingPermsOf, setViewingPermsOf] = useState<ResidentAccountInfo | null>(null);
  const toast = useToast();
  const { confirm } = useConfirm();

  const fetchAccounts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/resident-accounts`, { credentials: 'include' });
      if (!response.ok) throw new Error('Không thể tải danh sách tài khoản.');
      const data = await response.json();
      setAccounts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const filteredAccounts = useMemo(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    return accounts.filter(
      (acc) =>
        acc.name.toLowerCase().includes(lowercasedFilter) ||
        acc.phoneNumber.includes(lowercasedFilter)
    );
  }, [accounts, searchTerm]);

  const handleResetPassword = async (residentId: string, residentName: string) => {
    if (
      !(await confirm({
        title: 'Reset mật khẩu',
        description: `Bạn có chắc muốn reset mật khẩu cho cư dân "${residentName}" về mặc định (Abc@12345) không?`,
        variant: 'primary',
      }))
    )
      return;
    try {
      const response = await fetch(`/api/resident-accounts/${residentId}/reset-password`, {
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

  const handleSyncAccounts = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/resident-accounts/sync`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Đồng bộ thất bại.');
      }
      toast.success(data.message);
      await fetchAccounts(); // Refresh the list after syncing
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-surface rounded-xl shadow-sm border border-brand-border p-6 h-full flex flex-col">
      <header className="flex items-center justify-between mb-4 pb-4 border-b border-brand-border flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg border border-brand-border bg-surface text-ink-soft hover:text-accent hover:border-accent/40 transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
          <h1 className="font-serif text-3xl font-bold text-ink">
            Quản Lý Tài Khoản Cư Dân
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncAccounts}
            disabled={isLoading || isSyncing}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-brand-success bg-brand-success-soft rounded-md hover:bg-brand-success hover:text-white disabled:opacity-50 disabled:cursor-wait transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40"
            aria-label="Đồng bộ & Tạo Tài khoản"
          >
            <UserPlusIcon className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ & Tạo Tài khoản'}</span>
          </button>
          <button
            onClick={fetchAccounts}
            disabled={isLoading || isSyncing}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-ink-soft bg-surface border border-brand-border rounded-md hover:text-accent hover:border-accent/40 disabled:opacity-50 disabled:cursor-wait transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40"
            aria-label="Tải lại danh sách"
          >
            <ArrowPathIcon className={`w-4 h-4 ${isLoading && !isSyncing ? 'animate-spin' : ''}`} />
            <span>Tải lại</span>
          </button>
        </div>
      </header>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-faint">
            <MagnifyingGlassIcon className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Tìm theo tên hoặc SĐT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
          />
        </div>
      </div>

      <main className="flex-grow overflow-y-auto custom-scrollbar">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-ink-soft py-10 text-sm">
            <span className="w-5 h-5 rounded-full border-2 border-brand-border border-t-accent animate-spin" />
            Đang tải danh sách tài khoản...
          </div>
        )}
        {error && <p className="text-brand-danger text-center text-sm">{error}</p>}
        {!isLoading && !error && (
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-surface-alt text-[11px] uppercase tracking-wider font-semibold text-ink-soft">
                <tr>
                  <th scope="col" className="px-6 py-3">
                    Tên Cư Dân
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Tên đăng nhập (SĐT)
                  </th>
                  <th scope="col" className="px-6 py-3 text-center">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {filteredAccounts.map((acc) => (
                  <tr
                    key={acc.id}
                    className="hover:bg-surface-alt/60 transition-colors duration-150"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-full bg-accent-soft text-accent-ink font-bold flex items-center justify-center shrink-0">
                          {acc.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="text-sm font-semibold text-ink">{acc.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-ink-soft">{acc.phoneNumber}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setViewingPermsOf(acc)}
                          className="p-1.5 rounded-lg border border-brand-border bg-surface text-ink-soft hover:text-accent hover:border-accent/40 transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40"
                          title="Xem phân quyền tài khoản cư dân"
                          aria-label={`Xem phân quyền của ${acc.name}`}
                        >
                          <ShieldCheckIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleResetPassword(acc.id, acc.name)}
                          className="p-1.5 rounded-lg border border-brand-border bg-surface text-ink-soft hover:text-accent hover:border-accent/40 transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40"
                          title="Reset mật khẩu về mặc định (Abc@12345)"
                          aria-label={`Reset mật khẩu cho ${acc.name}`}
                        >
                          <KeyIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAccounts.length === 0 && (
              <EmptyState
                icon={UserPlusIcon}
                tone="neutral"
                title={
                  searchTerm
                    ? 'Không tìm thấy tài khoản nào khớp'
                    : 'Không có tài khoản cư dân nào được tìm thấy'
                }
                description={
                  searchTerm
                    ? 'Thử thay đổi từ khóa tìm kiếm hoặc kiểm tra lại số điện thoại'
                    : 'Tài khoản chỉ được tạo cho cư dân có số điện thoại và đang ở trạng thái hoạt động.'
                }
                size="md"
              />
            )}
          </div>
        )}
      </main>

      {/* Modal: Phân quyền tài khoản cư dân (read-only, theo vai trò RESIDENT) */}
      {viewingPermsOf && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => setViewingPermsOf(null)}
        >
          <div
            className="bg-surface rounded-xl shadow-lg border border-brand-border w-full max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between px-5 py-4 border-b border-brand-border sticky top-0 bg-surface">
              <div>
                <h2 className="font-serif text-lg font-semibold text-ink">Phân quyền tài khoản cư dân</h2>
                <p className="text-sm text-ink-soft mt-0.5">
                  {viewingPermsOf.name} · <span className="font-mono text-xs">{viewingPermsOf.phoneNumber}</span>
                </p>
              </div>
              <button
                onClick={() => setViewingPermsOf(null)}
                className="p-2 rounded-lg border border-brand-border bg-surface text-ink-soft hover:text-accent hover:border-accent/40 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40"
                aria-label="Đóng"
              >
                <ArrowLeftIcon className="w-5 h-5 rotate-180" />
              </button>
            </header>
            <div className="p-5">
              <p className="text-xs text-ink-faint mb-4">
                Tài khoản cư dân được cấp quyền tự động theo vai trò <span className="font-medium text-accent-ink">RESIDENT</span> (Blueprint A.4). Các ô checkbox thể hiện quyền được phép của vai trò này — chỉ đọc, không thể sửa trực tiếp.
              </p>
              <RolePermissionPanel selectedRoles={['RESIDENT']} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentAccountsPage;
