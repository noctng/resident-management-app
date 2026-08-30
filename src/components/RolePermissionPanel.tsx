import React from 'react';
import type { Permission, PermAction } from '../types';
import {
  MODULE_LABELS,
  MODULE_ORDER,
  ACTION_META,
  ROLE_PERMISSION_MATRIX,
  permissionsFromRoles,
} from './PermissionMatrixSelector';
import { ROLE_OPTIONS } from './PermissionSelector';

// Mô tả vai trò (blueprint A.4, rút gọn)
const ROLE_DESCRIPTIONS: Record<string, string> = {
  ADMIN: 'Toàn quyền hệ thống, quản lý người dùng & phân quyền',
  MANAGER: 'Quản lý (legacy) — cấp quyền cao nhất, bao gồm tất cả các quyền',
  DIR: 'Xem mọi báo cáo, duyệt vượt hạn mức ban điều hành',
  SM: 'Chính sách giá/chiết khấu/hoa hồng, duyệt hợp đồng, phê duyệt vượt hạn mức',
  SHEAD: 'Quản lý team kinh doanh, phân lead, duyệt giữ chỗ/giỏ hàng',
  SALE: 'Lead, chăm sóc, giỏ hàng, giữ chỗ, đặt cọc; không xóa dữ liệu tài chính',
  AGENT: 'Giữ chỗ/cọc hộ khách qua cổng đối tác',
  CS: 'Tiếp nhận tổng đài, hỗ trợ sau bán hàng',
  'ACC-S': 'Phiếu thu, đối soát, công nợ phải thu, xuất hóa đơn thanh toán',
  LAW: 'Mẫu hợp đồng, rà soát pháp lý, trình ký, lưu trữ',
  PMO: 'Kế hoạch bàn giao, nghiệm thu, cầu nối vận hành',
  'PMS-M': 'Biểu phí, phê duyệt miễn giảm/thi công/ký quỹ, SLA',
  'PMS-FE': 'Hỏi đáp quầy, tiếp nhận phản ánh, ghi chỉ số',
  'PMS-BILL': 'Chốt công tơ, tính phí, hóa đơn, công nợ cư dân',
  'PMS-TECH': 'Xử lý phản ánh kỹ thuật, CMMS, nghiệm thu thi công',
  'PMS-SEC': 'Ra vào, xe, khách, giao hàng',
  AUDIT: 'Chỉ đọc toàn bộ (kể cả nhật ký) — kiểm toán nội bộ',
};

// Phân nhóm module theo phân hệ (cho counter "Quyền (X/Y)")
const SUBSYSTEM_OF_MODULE: Record<Permission, 'ban_hang' | 'van_hanh' | 'chung'> = {
  dashboard: 'chung',
  configuration: 'chung',
  users: 'chung',
  logs: 'chung',
  crm: 'ban_hang',
  crm_approve: 'ban_hang',
  contracts: 'ban_hang',
  pricebook: 'ban_hang',
  leads: 'ban_hang',
  deposits: 'ban_hang',
  handover: 'ban_hang',
  commission: 'ban_hang',
  revenue: 'ban_hang',
  apartments: 'van_hanh',
  residents: 'van_hanh',
  vehicles: 'van_hanh',
  resident_accounts: 'van_hanh',
  announcements: 'van_hanh',
  feedback: 'van_hanh',
  amenities: 'van_hanh',
  meter_reading: 'van_hanh',
  utilities: 'van_hanh',
  unified_billing: 'van_hanh',
  billing: 'van_hanh',
  construction: 'van_hanh',
  warranty: 'van_hanh',
};

const SUBSYSTEM_META = {
  ban_hang: { label: 'Kinh Doanh (Sales)', accent: 'secondary', badge: 'bg-secondary-100 text-secondary-700' },
  van_hanh: { label: 'Vận Hành (Operations)', accent: 'accent', badge: 'bg-accent-soft text-accent-ink' },
  chung: { label: 'Cấu Hình Chung (System)', accent: 'ink', badge: 'bg-surface-alt text-ink-soft' },
} as const;

const SUBSYSTEM_ORDER: ('ban_hang' | 'van_hanh' | 'chung')[] = ['ban_hang', 'van_hanh', 'chung'];

interface RolePermissionPanelProps {
  selectedRoles: string[];
}

const toKey = (m: Permission, a: PermAction) => `${m}:${a}`;

const RolePermissionPanel: React.FC<RolePermissionPanelProps> = ({ selectedRoles }) => {
  const rolePerms = permissionsFromRoles(selectedRoles);
  const roleMeta = ROLE_OPTIONS.filter((r) => selectedRoles.includes(r.code));

  return (
    <div className="space-y-4">
      {/* Danh sách thẻ vai trò đã chọn */}
      {roleMeta.map((r) => {
        const sub = SUBSYSTEM_META[r.subsystem as keyof typeof SUBSYSTEM_META];
        return (
          <div
            key={r.code}
            className="rounded-lg border border-brand-border bg-surface p-4 shadow-elevation-surface"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-serif text-lg text-ink">{r.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sub.badge}`}>
                    {r.code}
                  </span>
                </div>
                <p className="text-sm text-ink-soft mt-0.5">
                  {ROLE_DESCRIPTIONS[r.code] || ''}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${sub.badge}`}>
                {sub.label}
              </span>
            </div>
          </div>
        );
      })}

      {roleMeta.length === 0 && (
        <div className="text-sm text-ink-soft italic p-3 bg-surface-alt rounded-lg">
          Chưa chọn vai trò — vui lòng chọn ít nhất một vai trò để xem chi tiết quyền.
        </div>
      )}

      {/* Ma trận quyền theo nhóm phân hệ */}
      {SUBSYSTEM_ORDER.map((subKey) => {
        const mods = MODULE_ORDER.filter((m) => SUBSYSTEM_OF_MODULE[m] === subKey);
        if (mods.length === 0) return null;
        const sub = SUBSYSTEM_META[subKey];
        // Counter: số module có ít nhất 1 quyền / tổng module nhóm
        const grantedMods = mods.filter((m) =>
          ACTION_META.some((a) => rolePerms.has(toKey(m, a.key)))
        ).length;
        return (
          <div key={subKey} className="rounded-lg border border-brand-border bg-surface overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-surface-alt border-b border-brand-border">
              <span className="text-sm font-semibold text-ink">{sub.label}</span>
              <span className="text-xs text-ink-soft">
                Quyền (<span className="font-medium text-accent">{grantedMods}</span>/{mods.length})
              </span>
            </div>
            <div className="divide-y divide-brand-border">
              {mods.map((m) => {
                const granted = ACTION_META.filter((a) => rolePerms.has(toKey(m, a.key)));
                return (
                  <div key={m} className="px-4 py-2.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm text-ink truncate">{MODULE_LABELS[m]}</div>
                      <div className="text-xs text-ink-faint">{m}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {ACTION_META.map((a) => {
                        const checked = rolePerms.has(toKey(m, a.key));
                        return (
                          <label
                            key={a.key}
                            className="flex items-center gap-1 cursor-default"
                            title={a.hint}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled
                              className="rounded border-brand-border text-accent focus:ring-accent/30 disabled:opacity-50"
                            />
                            <span
                              className={`text-xs ${
                                checked ? 'text-ink font-medium' : 'text-ink-faint'
                              }`}
                            >
                              {a.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RolePermissionPanel;
