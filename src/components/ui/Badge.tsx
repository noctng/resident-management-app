import React from 'react';

type BadgeVariant =
  | 'gray'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'blue'
  | 'teal'
  | 'neutral';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  gray: 'bg-surface-alt text-ink-soft border-transparent',
  neutral: 'bg-surface-alt text-ink-soft border-transparent',
  primary: 'bg-accent-soft text-accent border-transparent',
  success: 'bg-brand-success-soft text-brand-success border-transparent',
  warning: 'bg-brand-warning-soft text-brand-warning border-transparent',
  danger: 'bg-brand-danger-soft text-brand-danger border-transparent',
  info: 'bg-brand-teal-soft text-brand-teal border-transparent',
  teal: 'bg-brand-teal-soft text-brand-teal border-transparent',
  blue: 'bg-brand-teal-soft text-brand-teal border-transparent',
};

const dotColors: Record<BadgeVariant, string> = {
  gray: 'bg-ink-soft',
  neutral: 'bg-ink-soft',
  primary: 'bg-accent',
  success: 'bg-brand-success',
  warning: 'bg-brand-warning',
  danger: 'bg-brand-danger',
  info: 'bg-brand-teal',
  teal: 'bg-brand-teal',
  blue: 'bg-brand-teal',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10.5px]',
  md: 'px-2.5 py-0.5 text-[11.5px]',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'gray',
  size = 'md',
  dot = true,
  children,
  className = '',
}) => (
  <span
    className={[
      'inline-flex items-center gap-1.5 font-semibold rounded-full border',
      variantClasses[variant],
      sizeClasses[size],
      className,
    ].join(' ')}
  >
    {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColors[variant]}`} />}
    {children}
  </span>
);

// ── StatusBadge — maps known status strings to Badge variants ────────────────

type StatusKey =
  | 'PAID'
  | 'UNPAID'
  | 'PENDING'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'PARTIAL'
  | 'USED'
  | 'SUBMITTED'
  | 'RESOLVED'
  | 'DEPOSIT'
  | 'SIGNED'
  | 'PAYING'
  | 'COMPLETED'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'APPROVED'
  | 'REJECTED'
  | 'Đang ở'
  | 'Đã ở'
  | 'Tạm vắng'
  | 'Trống'
  | 'Đã chuyển đi'
  | 'Đang sửa chữa'
  | 'Kích hoạt'
  | 'Khoá'
  | 'Hoạt động'
  | 'Bảo trì';

const statusConfig: Record<string, { variant: BadgeVariant; label: string }> = {
  PAID: { variant: 'success', label: 'Đã thanh toán' },
  'Đã thanh toán': { variant: 'success', label: 'Đã thanh toán' },
  UNPAID: { variant: 'warning', label: 'Chưa thanh toán' },
  'Chưa thanh toán': { variant: 'warning', label: 'Chưa thanh toán' },
  PENDING: { variant: 'warning', label: 'Chờ xử lý' },
  OVERDUE: { variant: 'danger', label: 'Quá hạn' },
  'Quá hạn': { variant: 'danger', label: 'Quá hạn' },
  CANCELLED: { variant: 'gray', label: 'Đã hủy' },
  PARTIAL: { variant: 'info', label: 'Một phần' },
  USED: { variant: 'success', label: 'Đã sử dụng' },
  SUBMITTED: { variant: 'warning', label: 'Chờ xử lý' },
  RESOLVED: { variant: 'success', label: 'Đã giải quyết' },
  DEPOSIT: { variant: 'info', label: 'Đặt cọc' },
  SIGNED: { variant: 'blue', label: 'Đã ký' },
  PAYING: { variant: 'warning', label: 'Đang thanh toán' },
  COMPLETED: { variant: 'success', label: 'Hoàn thành' },
  ACTIVE: { variant: 'success', label: 'Đang hoạt động' },
  INACTIVE: { variant: 'gray', label: 'Không hoạt động' },
  APPROVED: { variant: 'success', label: 'Đã duyệt' },
  REJECTED: { variant: 'danger', label: 'Từ chối' },
  'Đang ở': { variant: 'success', label: 'Đang ở' },
  'Đã ở': { variant: 'success', label: 'Đã ở' },
  'Tạm vắng': { variant: 'warning', label: 'Tạm vắng' },
  Trống: { variant: 'warning', label: 'Trống' },
  'Đã chuyển đi': { variant: 'neutral', label: 'Đã chuyển đi' },
  'Đang sửa chữa': { variant: 'danger', label: 'Đang sửa chữa' },
  'Kích hoạt': { variant: 'success', label: 'Kích hoạt' },
  Khoá: { variant: 'danger', label: 'Khoá' },
  'Hoạt động': { variant: 'success', label: 'Hoạt động' },
  'Bảo trì': { variant: 'neutral', label: 'Bảo trì' },
};

interface StatusBadgeProps {
  status: string;
  size?: BadgeSize;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', className }) => {
  const config = statusConfig[status] ?? { variant: 'gray', label: status };
  return (
    <Badge variant={config.variant} size={size} className={className}>
      {config.label}
    </Badge>
  );
};

export default Badge;
