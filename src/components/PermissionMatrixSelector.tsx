import React from 'react';
import type { Permission, PermAction, EffectivePermission } from '../types';

// ===== Định nghĩa module & action =====
export const MODULE_LABELS: Record<Permission, string> = {
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
  contracts: 'Hợp Đồng Mua Bán',
  pricebook: 'Bảng Giá / Chiết Khấu',
  leads: 'Lead / Khách Hàng Tiềm Năng',
  deposits: 'Đặt Cọc / Giữ Chỗ',
  handover: 'Bàn Giao Nhà',
  commission: 'Hoa Hồng',
  revenue: 'Doanh Thu / Báo Cáo',
  construction: 'Thi Công / Cải Tạo',
  billing: 'Thu Phí / Đối Soát',
  warranty: 'Bảo Hành / Bảo Trì (CMMS)',
};

// Thứ tự module hiển thị (nhóm theo phân hệ)
export const MODULE_ORDER: Permission[] = [
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
  'billing',
  'construction',
  'warranty',
  'crm',
  'crm_approve',
  'contracts',
  'pricebook',
  'leads',
  'deposits',
  'handover',
  'commission',
  'revenue',
  'configuration',
  'users',
  'logs',
];

export const ACTION_META: { key: PermAction; label: string; hint: string }[] = [
  { key: 'C', label: 'Tạo', hint: 'C = Tạo mới (Create)' },
  { key: 'R', label: 'Xem', hint: 'R = Xem / Đọc (Read)' },
  { key: 'U', label: 'Sửa', hint: 'U = Cập nhật / Sửa (Update)' },
  { key: 'D', label: 'Xóa', hint: 'D = Xóa logic / Vô hiệu (Delete)' },
  { key: 'A', label: 'Duyệt', hint: 'A = Phê duyệt / Duyệt (Approve)' },
];

// ===== Ma trận quyền mặc định theo vai trò (mirror DB seed GĐ2) =====
// Dùng để auto-tick khi chọn vai trò. ADMIN/MANAGER = full (mọi module × 5 action).
const ALL_MODULES = MODULE_ORDER;
const FULL: string[] = ALL_MODULES.flatMap((m) =>
  (['C', 'R', 'U', 'D', 'A'] as PermAction[]).map((a) => `${m}:${a}`)
);

// Quyền R trên toàn bộ module cho mọi role (theo seed)
const R_ALL = ALL_MODULES.map((m) => `${m}:R`);

const baseR = (extra: string[] = []): string[] => [...R_ALL, ...extra];

export const ROLE_PERMISSION_MATRIX: Record<string, string[]> = {
  ADMIN: FULL,
  MANAGER: FULL,
  DIR: baseR([
    'crm:A', 'crm_approve:A', 'unified_billing:A', 'billing:A',
    'construction:A', 'vehicles:A', 'deposits:A', 'handover:A', 'commission:A',
  ]),
  SM: baseR([
    'crm:C', 'crm:U', 'crm:D',
    'pricebook:C', 'pricebook:U',
    'crm_approve:A',
    'contracts:R', 'contracts:U',
  ]),
  SHEAD: baseR([
    'crm:C', 'crm:U',
    'pricebook:C', 'pricebook:U',
    'crm_approve:A',
    'deposits:A',
  ]),
  SALE: baseR([
    'crm:C', 'crm:U',
    'contracts:R', 'contracts:U',
    'deposits:C', 'deposits:U',
  ]),
  AGENT: baseR(['crm:C']),
  CS: baseR(['crm:U', 'feedback:R', 'feedback:U', 'feedback:C']),
  'ACC-S': baseR([
    'unified_billing:C', 'unified_billing:U',
    'billing:C', 'billing:U',
    'revenue:R', 'commission:R',
  ]),
  LAW: baseR(['contracts:R', 'contracts:U']),
  PMO: baseR(['handover:R', 'handover:U', 'apartments:R', 'residents:R']),
  'PMS-M': baseR([
    'apartments:C', 'apartments:U', 'apartments:D',
    'residents:C', 'residents:U', 'residents:D',
    'utilities:C', 'utilities:U',
    'amenities:C', 'amenities:U',
    'vehicles:C', 'vehicles:U', 'vehicles:A',
    'construction:C', 'construction:U', 'construction:A',
    'unified_billing:C', 'unified_billing:U', 'unified_billing:A',
    'billing:A', 'feedback:A',
    'warranty:C', 'warranty:U', 'warranty:A',
    'meter_reading:A',
  ]),
  'PMS-FE': baseR([
    'residents:R', 'residents:U',
    'feedback:R', 'feedback:U', 'feedback:C',
    'amenities:R', 'amenities:U',
  ]),
  'PMS-BILL': baseR([
    'utilities:C', 'utilities:U',
    'meter_reading:C', 'meter_reading:U',
    'unified_billing:C', 'unified_billing:U', 'unified_billing:A',
    'billing:C', 'billing:U', 'billing:A',
  ]),
  'PMS-TECH': baseR([
    'construction:C', 'construction:U', 'construction:A',
    'feedback:R', 'feedback:U', 'feedback:C',
    'utilities:R', 'meter_reading:R',
    'warranty:C', 'warranty:U',
  ]),
  'PMS-SEC': baseR(['vehicles:R', 'vehicles:U', 'residents:R']),
  RESIDENT: baseR([
    'feedback:C', 'feedback:U',
    'amenities:C',
    'vehicles:C',
    'residents:U',
  ]),
  AUDIT: [...R_ALL], // chỉ xem
};

// Tính permissions từ danh sách vai trò (union)
export const permissionsFromRoles = (roles: string[]): Set<string> => {
  const set = new Set<string>();
  roles.forEach((r) => {
    (ROLE_PERMISSION_MATRIX[r] || []).forEach((p) => set.add(p));
  });
  return set;
};

interface PermissionMatrixSelectorProps {
  selectedRoles: string[];
  value: EffectivePermission[]; // override thủ công (ngoài vai trò)
  onChange: (perms: EffectivePermission[]) => void;
  disabled?: boolean;
}

const toKey = (m: Permission, a: PermAction) => `${m}:${a}`;

export const PermissionMatrixSelector: React.FC<PermissionMatrixSelectorProps> = ({
  selectedRoles,
  value,
  onChange,
  disabled = false,
}) => {
  const rolePerms = permissionsFromRoles(selectedRoles);
  const manual = new Set(value.map((p) => toKey(p.module, p.action)));

  const isChecked = (m: Permission, a: PermAction) => {
    const k = toKey(m, a);
    return rolePerms.has(k) || manual.has(k);
  };

  const toggle = (m: Permission, a: PermAction) => {
    if (disabled) return;
    const k = toKey(m, a);
    // Nếu đã có từ role -> không cho bỏ (vì đến từ role), chỉ cho thêm manual
    if (rolePerms.has(k)) return;
    const next = new Set(manual);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    onChange(
      Array.from(next).map((s) => {
        const [mod, act] = s.split(':');
        return { module: mod as Permission, action: act as PermAction };
      })
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-ink">
          Ma trận quyền chi tiết (Module × Thao tác)
        </label>
        <span className="text-xs text-ink-soft">
          {selectedRoles.length > 0
            ? `Tự động theo vai trò: ${selectedRoles.join(', ')}`
            : 'Chưa chọn vai trò — tick thủ công'}
        </span>
      </div>

      <div className="overflow-x-auto border border-brand-border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-alt text-ink-soft">
              <th className="text-left p-2 font-medium">Module</th>
              {ACTION_META.map((a) => (
                <th key={a.key} className="p-2 font-medium text-center" title={a.hint}>
                  {a.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULE_ORDER.map((m) => (
              <tr key={m} className="border-t border-brand-border">
                <td className="p-2 text-ink" title={MODULE_LABELS[m]}>
                  {MODULE_LABELS[m]}
                  <span className="block text-xs text-ink-faint">{m}</span>
                </td>
                {ACTION_META.map((a) => {
                  const k = toKey(m, a.key);
                  const fromRole = rolePerms.has(k);
                  const checked = isChecked(m, a.key);
                  return (
                    <td key={a.key} className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled || fromRole}
                        onChange={() => toggle(m, a.key)}
                        title={
                          fromRole
                            ? `Được cấp qua vai trò (${selectedRoles.join(', ')})`
                            : a.hint
                        }
                        className="rounded border-brand-border text-accent focus:ring-accent/30 cursor-pointer disabled:opacity-60"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-ink-soft">
        {ACTION_META.map((a) => (
          <span key={a.key} title={a.hint}>
            <span className="font-semibold text-ink">{a.key}</span> = {a.label}
          </span>
        ))}
        <span className="italic">Ô được tích mờ = quyền đến từ vai trò (không thể bỏ)</span>
      </div>
    </div>
  );
};

export default PermissionMatrixSelector;
