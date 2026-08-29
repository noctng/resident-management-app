import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  UsersIcon,
  Cog6ToothIcon,
  KeyIcon,
  ChatBubbleBottomCenterTextIcon,
  ClockIcon,
  BuildingOfficeIcon,
  TruckIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  WrenchScrewdriverIcon,
  SparklesIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  Squares2x2Icon,
  XMarkIcon,
  BoltIcon,
  MegaphoneIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
} from '../icons';
import CommandPalette, { useCommandPalette, type CommandItem } from '../ui/CommandPalette';
import type { User, Permission } from '../../types';

// ── Nav Definition ────────────────────────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  permission: Permission;
}

interface NavGroup {
  group?: string | null;
  items: NavItem[];
}

export const NAV_CONFIG: NavGroup[] = [
  {
    group: null,
    items: [
      { id: 'dashboard', label: 'Tổng Quan', icon: Squares2x2Icon, permission: 'dashboard' },
    ],
  },
  {
    group: 'Dân Cư & Căn Hộ',
    items: [
      { id: 'apartments', label: 'Căn Hộ', icon: BuildingOfficeIcon, permission: 'apartments' },
      { id: 'residents', label: 'Cư Dân', icon: UsersIcon, permission: 'residents' },
      { id: 'vehicles', label: 'Phương Tiện', icon: TruckIcon, permission: 'vehicles' },
      {
        id: 'resident_accounts',
        label: 'Tài Khoản Cư Dân',
        icon: UserPlusIcon,
        permission: 'resident_accounts',
      },
    ],
  },
  {
    group: 'Vận Hành',
    items: [
      {
        id: 'announcements',
        label: 'Tin Tức',
        icon: MegaphoneIcon,
        permission: 'announcements',
      },
      {
        id: 'feedback',
        label: 'Phản Ánh',
        icon: ChatBubbleBottomCenterTextIcon,
        permission: 'feedback',
      },
      { id: 'amenities', label: 'Tiện Ích', icon: SparklesIcon, permission: 'amenities' },
      {
        id: 'meter-recorder',
        label: 'Ghi Chỉ Số (Mobile)',
        icon: BoltIcon,
        permission: 'meter_reading',
      },
      {
        id: 'operations/construction',
        label: 'Thi Công & Ký Quỹ',
        icon: BuildingOfficeIcon,
        permission: 'utilities',
      },
      {
        id: 'operations/warranty',
        label: 'Bảo Hành Sau Bàn Giao',
        icon: WrenchScrewdriverIcon,
        permission: 'utilities',
      },
    ],
  },
  {
    group: 'Tài Chính & Dịch Vụ',
    items: [
      {
        id: 'utilities',
        label: 'Quản Lý Điện Nước',
        icon: WrenchScrewdriverIcon,
        permission: 'utilities',
      },
      {
        id: 'unified-billing',
        label: 'Hóa Đơn Tổng Hợp',
        icon: BanknotesIcon,
        permission: 'unified_billing',
      },
    ],
  },
  {
    group: null,
    items: [
      { id: 'crm', label: 'Kinh Doanh (CRM)', icon: ArrowTrendingUpIcon, permission: 'crm' },
      {
        id: 'crm/analytics',
        label: 'Báo Cáo & KPI (Điều Hành)',
        icon: ChartBarIcon,
        permission: 'crm',
      },
    ],
  },
  {
    group: 'Hệ Thống',
    items: [
      {
        id: 'configuration',
        label: 'Cấu Hình',
        icon: Cog6ToothIcon,
        permission: 'configuration',
      },
      { id: 'users', label: 'Nhân Viên', icon: ShieldCheckIcon, permission: 'users' },
      { id: 'logs', label: 'Lịch Sử Hệ Thống', icon: ClockIcon, permission: 'logs' },
    ],
  },
];

const PAGE_METADATA: Record<string, [string, string]> = {
  dashboard: ['Tổng quan', 'Toàn cảnh vận hành khu đô thị hôm nay'],
  residents: ['Cư dân', 'Danh sách cư dân đang sinh sống tại khu đô thị'],
  apartments: ['Căn hộ', 'Danh mục toàn bộ căn hộ theo khối và tầng'],
  utilities: ['Quản lý điện nước', 'Ghi chỉ số và tính tiêu thụ điện, nước theo kỳ'],
  'meter-recorder': ['Ghi chỉ số di động', 'Quét AI và chụp ảnh ghi nhận chỉ số điện nước'],
  'unified-billing': ['Hóa đơn tổng hợp', 'Tổng hợp hoá đơn phí quản lý, điện, nước theo căn hộ'],
  'management-fees': ['Phí quản lý', 'Quản lý thu phí dịch vụ và vận hành'],
  'debt-dashboard': ['Quản lý công nợ', 'Theo dõi tình hình công nợ toàn khu đô thị'],
  'fee-config': ['Cấu hình định mức', 'Thiết lập bảng giá và các loại phí'],
  amenities: ['Tiện ích', 'Danh mục tiện ích và lịch đặt chỗ của cư dân'],
  vehicles: ['Phương tiện', 'Quản lý xe ra vào và thẻ xe của cư dân'],
  feedback: ['Phản ánh', 'Ghi nhận và xử lý phản ánh, khiếu nại từ cư dân'],
  crm: ['Kinh doanh (CRM)', 'Theo dõi khách hàng tiềm năng thuê / mua căn hộ'],
  'crm/sales-matrix': ['Ma trận bán hàng BĐS', 'Bản đồ tồn kho căn hộ phân khu TESLA, CANTATA, NOXH'],
  'crm/inventory': ['Quản lý kho căn BĐS', 'Cấu hình, thêm mới, chỉnh sửa thông số và trạng thái sản phẩm'],
  'crm/products': ['Quản lý kho căn BĐS', 'Cấu hình, thêm mới, chỉnh sửa thông số và trạng thái sản phẩm'],
  'crm/leads': ['Phễu khách hàng (Leads)', 'Quản lý khách hàng tiềm năng theo quy trình 3 tầng'],
  'crm/bookings': ['Giỏ hàng & Giữ chỗ', 'Quản lý giỏ hàng tư vấn và khóa căn giữ chỗ 7 ngày'],
  'crm/deposits': ['Quản lý Đặt cọc (PDC)', 'Theo dõi phiếu cọc, xác nhận tiền về và chuyển căn'],
  'crm/contracts': ['Hợp đồng BĐS', 'Quản lý hợp đồng mua bán và cho thuê'],
  'crm/documents': ['Bản Scan PDF Hợp Đồng', 'Lưu trữ và xem trực tiếp bản scan HĐMB, cọc, chuyển nhượng'],
  'crm/transfers': ['Chuyển nhượng HĐMB', 'Quản lý thủ tục sang tên đổi chủ căn hộ'],
  'crm/commissions': ['Chính sách hoa hồng', 'Bảng tính hoa hồng môi giới và giải ngân'],
  'crm/pricing-policy': ['Bảng giá & Chiết khấu', 'Quản lý bảng giá niêm yết và chính sách ưu đãi'],
  'crm/handover': ['Nghiệm thu & Bàn giao', 'Quản lý Snag List và kích hoạt Cầu nối vận hành KĐT'],
  'crm/customers': ['Khách hàng CRM', 'Quản lý thông tin và hồ sơ khách hàng'],
  'crm/approval-queue': ['Hàng đợi phê duyệt', 'Duyệt các yêu cầu hợp đồng và chiết khấu'],
  'crm/overdue-payments': ['Công nợ quá hạn CRM', 'Theo dõi các đợt thanh toán trễ hạn'],
  'crm/revenue-report': ['Báo cáo điều hành & KPI', 'Hợp nhất 4 trụ cột Bán hàng, Tài chính tuổi nợ, Vận hành SLA và Cư dân'],
  'crm/analytics': ['Báo cáo điều hành & KPI', 'Hợp nhất 4 trụ cột Bán hàng, Tài chính tuổi nợ, Vận hành SLA và Cư dân'],
  'operations/warranty': ['Quản lý bảo hành sau bàn giao', 'Theo dõi sự cố, điều phối nhà thầu và giám sát SLA'],
  'operations/construction': ['Đăng ký thi công & Ký quỹ 100Tr', 'Quản lý hồ sơ hoàn thiện nội thất, ký quỹ 100Tr và thẻ công nhân'],
  users: ['Nhân viên', 'Danh sách nhân sự ban quản lý khu đô thị'],
  resident_accounts: ['Tài khoản cư dân', 'Quản lý tài khoản đăng nhập ứng dụng cư dân'],
  configuration: ['Cấu hình', 'Thông tin khu đô thị và các thông số tính phí'],
  logs: ['Lịch sử hệ thống', 'Nhật ký thao tác của người dùng trong hệ thống'],
};

interface SidebarContentProps {
  currentUser: User;
  onLogout: () => void;
  onChangePassword: () => void;
  onClose?: () => void;
}

const SidebarContent: React.FC<SidebarContentProps> = ({
  currentUser,
  onLogout,
  onChangePassword,
  onClose,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname.replace(/^\/admin\/?/, '') || 'dashboard';

  const hasPermission = (permission: Permission): boolean => {
    if (currentUser.role === 0) return true;
    return currentUser.permissions?.includes(permission) ?? false;
  };

  const handleNav = (id: string) => {
    navigate(`/admin/${id}`);
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sidebar-bg to-sidebar-bg-2 text-sidebar-text select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-sidebar-line flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <img
            src="/logo.svg"
            alt="Thành Phố Cà Phê"
            className="w-10 h-10 object-contain rounded-[8px] bg-white p-1 flex-shrink-0 shadow-sm"
          />
          <div>
            <div className="text-[15.5px] text-bg font-bold leading-tight">
              Thành Phố Cà Phê
            </div>
            <div className="text-[10.5px] text-sidebar-dim mt-0.5 tracking-wider uppercase font-medium">
              Ban Quản Lý Khu Đô Thị
            </div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-sidebar-dim hover:text-white hover:bg-sidebar-line/50 transition-colors cursor-pointer"
            aria-label="Đóng menu"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3 overflow-y-auto custom-scrollbar space-y-4">
        {NAV_CONFIG.map((group, gIdx) => {
          const visibleItems = group.items.filter((item) => hasPermission(item.permission));
          if (visibleItems.length === 0) return null;

          return (
            <div key={gIdx} className="space-y-1">
              {group.group && (
                <div className="text-[10.5px] tracking-[0.11em] uppercase text-sidebar-dim px-2.5 pt-3 pb-1 border-t border-sidebar-line">
                  {group.group}
                </div>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive =
                    currentPath === item.id ||
                    (item.id === 'crm' && currentPath.startsWith('crm') && currentPath !== 'crm/analytics');
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      title={item.label}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[7px] text-[13.5px] transition-all duration-150 border cursor-pointer ${
                        isActive
                          ? 'bg-accent/15 text-accent-soft border-accent/30 font-medium shadow-sm'
                          : 'text-sidebar-text hover:bg-accent/10 hover:text-bg border-transparent'
                      }`}
                    >
                      <item.icon
                        className={`w-4 h-4 flex-shrink-0 transition-opacity ${
                          isActive ? 'text-accent opacity-100' : 'opacity-80'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User Card & Actions */}
      <div className="border-t border-sidebar-line p-3 space-y-2 flex-shrink-0 bg-sidebar-bg-2/60">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] bg-sidebar-bg border border-sidebar-line">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-teal to-secondary-700 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {currentUser.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-bg truncate leading-tight">
              {currentUser.username}
            </div>
            <div className="text-[10px] text-sidebar-dim truncate">
              {currentUser.role === 0 ? 'Ban Quản Lý' : 'Quản trị viên'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onChangePassword}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-[6px] text-xs text-sidebar-text hover:text-bg hover:bg-sidebar-bg border border-sidebar-line transition-all cursor-pointer"
            title="Đổi mật khẩu"
          >
            <KeyIcon className="w-3.5 h-3.5" />
            <span>Mật khẩu</span>
          </button>
          <button
            onClick={onLogout}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-[6px] text-xs text-brand-danger hover:bg-brand-danger/15 border border-brand-danger/30 transition-all cursor-pointer font-medium"
            title="Đăng xuất"
          >
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface AdminLayoutProps {
  currentUser: User;
  onLogout: () => void;
  onChangePassword: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentUser,
  onLogout,
  onChangePassword,
  children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();

  const currentPath = location.pathname.replace(/^\/admin\/?/, '') || 'dashboard';
  const [pageTitle, pageSub] = PAGE_METADATA[currentPath] || [
    'Quản lý toà nhà',
    'Hệ thống vận hành',
  ];

  const can = (permission: Permission): boolean =>
    currentUser.role === 0 || (currentUser.permissions?.includes(permission) ?? false);

  // ── Command palette commands: nav routes (permission-filtered) + account actions ──
  const commands: CommandItem[] = useMemo(() => {
    const nav: CommandItem[] = NAV_CONFIG.flatMap((g) => g.items)
      .filter((it) => can(it.permission))
      .map((it) => ({
        id: `nav-${it.id}`,
        label: it.label,
        hint: 'Điều hướng',
        icon: it.icon,
        keywords: it.id,
        onSelect: () => navigate(`/admin/${it.id}`),
      }));
    const actions: CommandItem[] = [
      { id: 'action-change-password', label: 'Đổi mật khẩu', hint: 'Tài khoản', icon: KeyIcon, onSelect: onChangePassword },
      { id: 'action-logout', label: 'Đăng xuất', hint: 'Tài khoản', onSelect: onLogout },
    ];
    return [...nav, ...actions];
  }, [currentUser, navigate, onChangePassword, onLogout]);

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[260px] flex-shrink-0 shadow-lg z-20">
        <SidebarContent
          currentUser={currentUser}
          onLogout={onLogout}
          onChangePassword={onChangePassword}
        />
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed inset-y-0 left-0 z-50 w-[260px] shadow-elevation-overlay animate-in">
            <SidebarContent
              currentUser={currentUser}
              onLogout={onLogout}
              onChangePassword={onChangePassword}
              onClose={() => setMobileOpen(false)}
            />
          </aside>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="sticky top-0 z-10 bg-bg/95 backdrop-blur-md border-b border-brand-border px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-[8px] border border-brand-border text-ink-soft hover:bg-surface-alt transition-colors"
              aria-label="Mở menu"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
            <div>
              <h2 className="text-[19px] font-bold text-ink leading-tight m-0 tracking-tight">
                {pageTitle}
              </h2>
              <div className="text-[12.5px] text-ink-soft mt-0.5">{pageSub}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden md:flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full bg-surface-alt border border-brand-border text-ink-soft text-xs hover:bg-surface transition-colors cursor-pointer"
            >
              <MagnifyingGlassIcon className="w-4 h-4" />
              <span>Tìm kiếm...</span>
              <kbd className="font-mono text-[10px] text-ink-soft border border-brand-border rounded px-1">
                ⌘K
              </kbd>
            </button>
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white border border-brand-border shadow-sm">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-teal to-secondary-700 text-white flex items-center justify-center text-xs font-bold font-mono">
                {currentUser.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left text-xs leading-tight pr-1">
                <div className="font-semibold text-ink">{currentUser.username}</div>
                <div className="text-[11px] text-ink-soft">
                  {currentUser.role === 0 ? 'Ban Quản Lý' : 'Nhân sự vận hành'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:px-7 lg:py-6 animate-fade-in">
          <div className="max-w-[1400px] mx-auto space-y-6">{children}</div>
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
      />
    </div>
  );
};

export default AdminLayout;
