import type { AmenityUsage } from '../types';

// ── Amenity Status ──────────────────────────────────────────────────────────

export function translateAmenityStatus(status: AmenityUsage['status']): string {
  switch (status) {
    case 'PENDING':
      return 'Chờ xác nhận';
    case 'USED':
      return 'Đã sử dụng';
    case 'CANCELLED':
      return 'Đã hủy';
    default:
      return status;
  }
}

export function getAmenityStatusBadgeClass(status: AmenityUsage['status']): string {
  switch (status) {
    case 'PENDING':
      return 'bg-brand-warning-soft text-brand-warning border border-brand-warning/25';
    case 'USED':
      return 'bg-brand-success-soft text-brand-success border border-brand-success/25';
    case 'CANCELLED':
      return 'bg-brand-danger-soft text-brand-danger border border-brand-danger/25';
    default:
      return 'bg-surface-alt text-ink-soft border border-brand-border';
  }
}

// ── Management Fee / Payment Status ────────────────────────────────────────

export function translatePaymentStatus(status: string): string {
  switch (status) {
    case 'PAID':
      return 'Đã thanh toán';
    case 'PENDING':
      return 'Chờ thanh toán';
    case 'OVERDUE':
      return 'Quá hạn';
    case 'CANCELLED':
      return 'Đã hủy';
    case 'PARTIAL':
      return 'Thanh toán một phần';
    default:
      return status;
  }
}

export function getPaymentStatusBadgeClass(status: string): string {
  switch (status) {
    case 'PAID':
      return 'bg-brand-success-soft text-brand-success border border-brand-success/25';
    case 'PENDING':
      return 'bg-brand-warning-soft text-brand-warning border border-brand-warning/25';
    case 'OVERDUE':
      return 'bg-brand-danger-soft text-brand-danger border border-brand-danger/25';
    case 'CANCELLED':
      return 'bg-surface-alt text-ink-soft border border-brand-border';
    case 'PARTIAL':
      return 'bg-brand-teal-soft text-brand-teal border border-brand-teal/25';
    default:
      return 'bg-surface-alt text-ink-soft border border-brand-border';
  }
}

// ── Contract Status ──────────────────────────────────────────────────────────

export function translateContractStatus(status: string): string {
  switch (status) {
    case 'DEPOSIT':
      return 'Đặt cọc';
    case 'SIGNED':
      return 'Đã ký';
    case 'PAYING':
      return 'Đang thanh toán';
    case 'COMPLETED':
      return 'Hoàn thành';
    case 'CANCELLED':
      return 'Đã hủy';
    default:
      return status;
  }
}

export function getContractStatusBadgeClass(status: string): string {
  switch (status) {
    case 'DEPOSIT':
      return 'bg-brand-warning-soft text-brand-warning border border-brand-warning/25';
    case 'SIGNED':
      return 'bg-accent-soft text-accent-ink border border-accent/30';
    case 'PAYING':
      return 'bg-brand-success-soft text-brand-success border border-brand-success/25';
    case 'COMPLETED':
      return 'bg-brand-teal-soft text-brand-teal border border-brand-teal/25';
    case 'CANCELLED':
      return 'bg-brand-danger-soft text-brand-danger border border-brand-danger/25';
    default:
      return 'bg-surface-alt text-ink-soft border border-brand-border';
  }
}

// ── Feedback Status ──────────────────────────────────────────────────────────

export function translateFeedbackStatus(status: string): string {
  switch (status) {
    case 'SUBMITTED':
      return 'Chờ xử lý';
    case 'RESOLVED':
      return 'Đã giải quyết';
    default:
      return status;
  }
}

export function getFeedbackStatusBadgeClass(status: string): string {
  switch (status) {
    case 'SUBMITTED':
      return 'bg-brand-warning-soft text-brand-warning border border-brand-warning/25';
    case 'RESOLVED':
      return 'bg-brand-success-soft text-brand-success border border-brand-success/25';
    default:
      return 'bg-surface-alt text-ink-soft border border-brand-border';
  }
}
