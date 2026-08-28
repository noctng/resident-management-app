import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ChartBarIcon,
  Squares2x2Icon,
  BuildingOfficeIcon,
  UsersIcon,
  TicketIcon,
  BanknotesIcon,
  DocumentTextIcon,
  KeyIcon,
  UserIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  TagIcon,
  SparklesIcon,
  ArrowsRightLeftIcon,
  FolderIcon,
} from '../icons';

export interface CrmSubNavProps {
  current?: string;
  title: string;
  subtitle?: string;
  onNavigate?: (route: string) => void;
  onBack?: () => void;
  extraActions?: React.ReactNode;
}

const CRM_TABS = [
  { id: 'crm', label: 'Tổng Quan CRM', route: 'crm', Icon: ChartBarIcon },
  { id: 'sales-matrix', label: 'Ma Trận Căn', route: 'crm/sales-matrix', Icon: Squares2x2Icon },
  { id: 'inventory', label: 'Kho Căn BĐS', route: 'crm/inventory', Icon: BuildingOfficeIcon },
  { id: 'pricing-policy', label: 'Bảng Giá & Ưu Đãi', route: 'crm/pricing-policy', Icon: TagIcon },
  { id: 'leads', label: 'Phễu Leads', route: 'crm/leads', Icon: UsersIcon },
  { id: 'bookings', label: 'Giữ Chỗ & Cọc', route: 'crm/bookings', Icon: TicketIcon },
  { id: 'deposits', label: 'Phiếu Thu PDC', route: 'crm/deposits', Icon: BanknotesIcon },
  { id: 'contracts', label: 'HĐ Mua Bán', route: 'crm/contracts', Icon: DocumentTextIcon },
  { id: 'documents', label: 'Bản Scan PDF', route: 'crm/documents', Icon: FolderIcon },
  { id: 'transfers', label: 'Chuyển Nhượng', route: 'crm/transfers', Icon: ArrowsRightLeftIcon },
  { id: 'commissions', label: 'Hoa Hồng', route: 'crm/commissions', Icon: SparklesIcon },
  { id: 'handover', label: 'Bàn Giao', route: 'crm/handover', Icon: KeyIcon },
  { id: 'customers', label: 'Khách Hàng', route: 'crm/customers', Icon: UserIcon },
  { id: 'overdue-payments', label: 'Nợ Quá Hạn', route: 'crm/overdue-payments', Icon: ExclamationTriangleIcon },
  { id: 'analytics', label: 'Báo Cáo Điều Hành', route: 'crm/analytics', Icon: ChartBarIcon },
];

export const CrmSubNav: React.FC<CrmSubNavProps> = ({
  current,
  title,
  subtitle,
  onNavigate,
  onBack,
  extraActions,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('crm');
    } else {
      navigate(-1);
    }
  };

  const handleTabClick = (route: string) => {
    if (onNavigate) {
      onNavigate(route);
    } else {
      navigate('/admin/' + route);
    }
  };

  return (
    <div className="space-y-3 mb-6 animate-fade-in">
      {/* ── Top Bar: Back Button, Breadcrumbs & Extra Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3.5 sm:px-5 sm:py-3.5 rounded-2xl border border-brand-border shadow-xs">
        <div className="flex items-center gap-3">
          {/* Back Button */}
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-alt hover:bg-accent-soft text-ink-soft hover:text-accent-ink font-bold text-xs transition-colors border border-brand-border cursor-pointer shadow-xs shrink-0"
            title="Quay lại trang trước hoặc trang chủ CRM"
          >
            <ArrowLeftIcon className="w-4 h-4 text-accent" />
            <span>Quay lại</span>
          </button>

          {/* Breadcrumbs & Title */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-soft overflow-hidden text-ellipsis whitespace-nowrap">
              <button
                type="button"
                onClick={() => (onNavigate ? onNavigate('dashboard') : navigate('/admin/dashboard'))}
                className="hover:text-accent transition-colors cursor-pointer"
              >
                Admin
              </button>
              <span>/</span>
              <button
                type="button"
                onClick={() => (onNavigate ? onNavigate('crm') : navigate('/admin/crm'))}
                className="hover:text-accent transition-colors cursor-pointer font-bold text-ink-soft"
              >
                Kinh Doanh BĐS (CRM)
              </button>
              <span>/</span>
              <span className="text-accent font-bold truncate">
                {title}
              </span>
            </div>
            {subtitle && (
              <p className="text-xs text-ink-soft truncate mt-0.5 hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Extra Action Buttons */}
        {extraActions && (
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {extraActions}
          </div>
        )}
      </div>

      {/* ── CRM Sub-Navigation Tabs Bar ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
        {CRM_TABS.map((tab) => {
          const isActive = current === tab.id || (tab.id === 'crm' && current === 'crm');
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.route)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 border ${
                isActive
                  ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                  : 'bg-surface text-ink-soft hover:text-accent hover:bg-accent-soft/50 border-brand-border'
              }`}
            >
              <tab.Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CrmSubNav;
