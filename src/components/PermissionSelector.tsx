import React from 'react';
import type { Permission } from '../types';

interface PermissionSelectorProps {
  selectedPermissions: Permission[];
  onChange: (permissions: Permission[]) => void;
  disabled?: boolean;
}

const PERMISSION_LABELS: Record<Permission, string> = {
  dashboard: 'Tổng Quan',
  apartments: 'Căn hộ',
  residents: 'Cư dân',
  vehicles: 'Phương tiện',
  resident_accounts: 'Tài khoản Cư dân',
  announcements: 'Tin Tức & Thông Báo',
  feedback: 'Phản Ánh',
  amenities: 'Tiện ích',
  meter_reading: 'Ghi chỉ số Điện Nước (Mobile)',
  utilities: 'Quản Lý Điện Nước',
  unified_billing: 'Hóa Đơn Tổng Hợp',
  crm: 'Kinh Doanh (CRM)',
  crm_approve: 'Phê Duyệt CRM (Duyệt cọc, HĐ, C/N)',
  configuration: 'Cấu hình Hệ thống',
  users: 'Nhân viên & Phân quyền',
  logs: 'Lịch sử Hệ thống (Audit Log)',
};

const ALL_PERMISSIONS: Permission[] = [
  'dashboard',
  'apartments',
  'residents',
  'vehicles',
  'resident_accounts',
  'announcements',
  'feedback',
  'amenities',
  'meter_reading',
  'utilities',
  'unified_billing',
  'crm',
  'crm_approve',
  'configuration',
  'users',
  'logs',
];

const PermissionSelector: React.FC<PermissionSelectorProps> = ({
  selectedPermissions,
  onChange,
  disabled = false,
}) => {
  const togglePermission = (permission: Permission) => {
    if (disabled) return;

    if (selectedPermissions.includes(permission)) {
      onChange(selectedPermissions.filter((p) => p !== permission));
    } else {
      onChange([...selectedPermissions, permission]);
    }
  };

  const selectAll = () => {
    onChange(ALL_PERMISSIONS);
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-ink">
          Quyền truy cập
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            disabled={disabled}
            className="text-xs text-accent hover:text-accent-hover disabled:opacity-50"
          >
            Chọn tất cả
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={disabled}
            className="text-xs text-ink-soft hover:text-ink disabled:opacity-50"
          >
            Bỏ chọn
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 bg-surface-alt rounded-lg">
        {ALL_PERMISSIONS.map((permission) => (
          <label
            key={permission}
            className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
              disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-surface'
            }`}
          >
            <input
              type="checkbox"
              checked={selectedPermissions.includes(permission)}
              onChange={() => togglePermission(permission)}
              disabled={disabled}
              className="rounded border-brand-border text-accent focus:ring-accent/30 cursor-pointer"
            />
            <span className="text-sm text-ink">
              {PERMISSION_LABELS[permission]}
            </span>
          </label>
        ))}
      </div>

      <div className="text-xs text-ink-soft">
        Đã chọn: {selectedPermissions.length}/{ALL_PERMISSIONS.length} quyền
      </div>
    </div>
  );
};

export default PermissionSelector;
export { PERMISSION_LABELS, ALL_PERMISSIONS };
