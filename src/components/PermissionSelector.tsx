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

// ===== RBAC: 17 vai trò blueprint (A.4) để chọn trong UI =====
export const ROLE_OPTIONS: { code: string; name: string; subsystem: string }[] = [
  { code: 'ADMIN', name: 'Quản trị hệ thống', subsystem: 'chung' },
  { code: 'MANAGER', name: 'Quản lý (legacy full quyền)', subsystem: 'chung' },
  { code: 'DIR', name: 'Ban điều hành', subsystem: 'chung' },
  { code: 'SM', name: 'Giám đốc kinh doanh', subsystem: 'ban_hang' },
  { code: 'SHEAD', name: 'Trưởng phòng kinh doanh', subsystem: 'ban_hang' },
  { code: 'SALE', name: 'Nhân viên kinh doanh', subsystem: 'ban_hang' },
  { code: 'AGENT', name: 'Đại lý/kênh', subsystem: 'ban_hang' },
  { code: 'CS', name: 'Chăm sóc khách hàng', subsystem: 'ban_hang' },
  { code: 'ACC-S', name: 'Kế toán bán hàng', subsystem: 'ban_hang' },
  { code: 'LAW', name: 'Pháp chế hợp đồng', subsystem: 'ban_hang' },
  { code: 'PMO', name: 'Điều hành bàn giao', subsystem: 'chung' },
  { code: 'PMS-M', name: 'Trưởng BQL KĐT', subsystem: 'van_hanh' },
  { code: 'PMS-FE', name: 'Nhân sự BQL (tiếp nhận)', subsystem: 'van_hanh' },
  { code: 'PMS-BILL', name: 'Kế toán dịch vụ', subsystem: 'van_hanh' },
  { code: 'PMS-TECH', name: 'Kỹ thuật/bảo trì', subsystem: 'van_hanh' },
  { code: 'PMS-SEC', name: 'An ninh/kiểm soát', subsystem: 'van_hanh' },
  { code: 'AUDIT', name: 'Kiểm toán nội bộ', subsystem: 'chung' },
  // RESIDENT quản lý riêng qua cổng cư dân, không gán cho user nội bộ
];

export const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((r) => [r.code, `${r.code} — ${r.name}`])
);

interface RoleSelectorProps {
  selectedRoles: string[];
  onChange: (roles: string[]) => void;
  disabled?: boolean;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  selectedRoles,
  onChange,
  disabled = false,
}) => {
  const toggleRole = (code: string) => {
    if (disabled) return;
    if (selectedRoles.includes(code)) {
      onChange(selectedRoles.filter((c) => c !== code));
    } else {
      onChange([...selectedRoles, code]);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-ink">Vai trò (RBAC)</label>
      <div className="grid grid-cols-2 gap-2 p-3 bg-surface-alt rounded-lg max-h-64 overflow-y-auto">
        {ROLE_OPTIONS.map((r) => (
          <label
            key={r.code}
            className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface'
            }`}
          >
            <input
              type="checkbox"
              checked={selectedRoles.includes(r.code)}
              onChange={() => toggleRole(r.code)}
              disabled={disabled}
              className="rounded border-brand-border text-accent focus:ring-accent/30 cursor-pointer"
            />
            <span className="text-sm text-ink">
              <span className="font-medium">{r.code}</span>{' '}
              <span className="text-ink-soft text-xs">{r.name}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="text-xs text-ink-soft">Đã chọn: {selectedRoles.length} vai trò</div>
    </div>
  );
};
