import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type {
  AmenityType,
  AmenityUsage,
  UtilityRecord,
  Apartment,
  AmenityBookingData,
  Feedback,
  PricingConfig,
} from '../types';
import AmenityManager, { type AmenityLimitConfig } from '../components/AmenityManager';
import {
  AppLogo,
  ArrowPathIcon,
  QrCodeIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  BuildingOfficeIcon,
  KeyIcon,
  NewspaperIcon,
  DocumentTextIcon,
  TicketIcon,
  BoltIcon,
  DocumentChartBarIcon,
  ChatBubbleBottomCenterTextIcon,
  BellIcon,
  WrenchScrewdriverIcon,
  TruckIcon,
} from '../components/icons';
import { useToast, useConfirm } from '../components/ui';
import BookAmenityModal from '../components/BookAmenityModal';
import ImageViewerModal from '../components/ImageViewerModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import FeedbackDetailModal from '../components/FeedbackDetailModal';
import UtilityRecordDetailModal from '../components/UtilityRecordDetailModal';
import QRCodeModal from '../components/QRCodeModal';
import PaymentQRModal from '../components/PaymentQRModal';
import InvoiceViewModal from '../components/InvoiceViewModal';
import type { UnifiedBillingRecord } from './billing/UnifiedHistoryView';
import { createChat } from '@n8n/chat';
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribedToPush,
  getNotificationPermission,
} from '../services/pushService';
import { AMENITY_NAMES } from '../constants/amenities';
import { translateAmenityStatus, getAmenityStatusBadgeClass } from '../constants/statusLabels';
import PortalFeedbackSection from './portal/PortalFeedbackSection';
import PortalNewsSection from './portal/PortalNewsSection';
import ResidentHandbookView from './portal/ResidentHandbookView';
import PortalWarrantySection from './portal/PortalWarrantySection';
import PortalConstructionSection from './portal/PortalConstructionSection';
import PortalVehicleSection from './portal/PortalVehicleSection';


interface AuthenticatedData {
  resident: { id: string; name: string; canUseAmenities: boolean };
  apartments: Pick<Apartment, 'id' | 'code'>[];
}

interface ResidentPortalPageProps {
  authenticatedData: AuthenticatedData;
  selectedApartment: Pick<Apartment, 'id' | 'code'>;
  utilityRecords: UtilityRecord[];
  amenityUsages: AmenityUsage[];
  feedbackList: Feedback[];
  appConfig: PricingConfig | null;
  onAddAmenityUsage: (
    apartmentId: string,
    amenity: AmenityType,
    bookingData: AmenityBookingData,
    residentId: string
  ) => Promise<AmenityUsage>;
  onUpdateAmenityStatus: (usageId: string, newStatus: 'USED' | 'CANCELLED') => void;
  onAddFeedback: (data: FormData) => Promise<void>;
  onRefetchAmenityUsages: () => Promise<void>;
  isAmenityListLoading: boolean;
  onLogout: () => void;
  onChangeApartment: () => void;
  amenityLimits?: Record<string, AmenityLimitConfig> | null;
}

function ResidentPortalPage({
  authenticatedData,
  selectedApartment,
  utilityRecords,
  amenityUsages,
  feedbackList,
  onAddAmenityUsage,
  onUpdateAmenityStatus,
  onAddFeedback,
  onRefetchAmenityUsages,
  isAmenityListLoading,
  onLogout,
  onChangeApartment,
  amenityLimits = null,
}: ResidentPortalPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab =
    (searchParams.get('tab') as
      | 'amenities'
      | 'utilities'
      | 'unified'
      | 'feedback'
      | 'news'
      | 'handbook'
      | 'warranty'
      | 'construction'
      | 'vehicles') || 'news';

  const setActiveTab = (
    tab:
      | 'amenities'
      | 'utilities'
      | 'unified'
      | 'feedback'
      | 'news'
      | 'handbook'
      | 'warranty'
      | 'construction'
      | 'vehicles'
  ) => {
    setSearchParams({ tab });
  };

  const [isBookingModalOpen, setBookingModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [selectedAmenity, setSelectedAmenity] = useState<AmenityType | null>(null);
  const [viewingFeedback, setViewingFeedback] = useState<Feedback | null>(null);
  const [viewingQrCode, setViewingQrCode] = useState<AmenityUsage | null>(null);
  const [viewingUtilityDetail, setViewingUtilityDetail] = useState<UtilityRecord | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // desktop collapsed
  const [newsUnreadCount, setNewsUnreadCount] = useState(0);
  const [paymentModal, setPaymentModal] = useState<{ record: UtilityRecord } | null>(null);
  const [unifiedPaymentModal, setUnifiedPaymentModal] = useState<{ record: UnifiedBillingRecord } | null>(null);
  const toast = useToast();
  const { confirm } = useConfirm();
  const [pushNotificationBanner, setPushNotificationBanner] = useState<{
    title: string;
    message: string;
    type: 'utility' | 'unified';
    month: number;
    year: number;
  } | null>(null);

  const [localUtilityRecords, setLocalUtilityRecords] = useState<UtilityRecord[]>(utilityRecords);

  useEffect(() => {
    setLocalUtilityRecords(utilityRecords);
  }, [utilityRecords]);

  const fetchUtilityRecords = async () => {
    try {
      const res = await fetch('/api/utility-records', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setLocalUtilityRecords(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch utility records:', err);
    }
  };

  const [viewingInvoice, setViewingInvoice] = useState<{
    type: 'utility' | 'unified';
    id?: string;
    apartmentId?: string;
    apartmentCode: string;
    month: number;
    year: number;
  } | null>(null);

  const [unifiedHistory, setUnifiedHistory] = useState<UnifiedBillingRecord[]>([]);
  const [unifiedLoading, setUnifiedLoading] = useState(false);

  const fetchUnifiedHistory = async (apartmentId: string) => {
    try {
      setUnifiedLoading(true);
      const res = await fetch(`/api/unified-billing/history/${apartmentId}?limit=24`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUnifiedHistory(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch unified billing history:', err);
    } finally {
      setUnifiedLoading(false);
    }
  };

  const handlePaymentSuccess = (
    type: 'utility' | 'unified',
    month: number,
    year: number
  ) => {
    setPushNotificationBanner({
      title: 'Thanh Toán Thành Công!',
      message: `Hóa đơn ${type === 'unified' ? 'Hóa Đơn Tổng Hợp' : 'Điện Nước'} Tháng ${month}/${year} đã được gạch nợ thành công.`,
      type,
      month,
      year,
    });

    if (type === 'unified' && selectedApartment?.id) {
      fetchUnifiedHistory(selectedApartment.id);
    } else {
      fetchUtilityRecords();
    }
  };

  useEffect(() => {
    if (selectedApartment?.id) {
      fetchUnifiedHistory(selectedApartment.id);
    }
  }, [selectedApartment?.id, activeTab]);

  const [qrConfig, setQrConfig] = useState<{
    QR_BANK_CODE?: string;
    QR_BANK_ACCOUNT?: string;
    QR_ACCOUNT_NAME?: string;
    QR_SEPAY_VA?: string;
    QR_SEPAY_BANK_CODE?: string;
  } | null>(null);

  const chatInstanceRef = useRef<any>(null);
  const isInitializingRef = useRef<boolean>(false);

  const [showPushPrompt, setShowPushPrompt] = useState(false);

  useEffect(() => {
    if (isPushSupported()) {
      isSubscribedToPush().then((subscribed) => {
        setPushEnabled(subscribed);
        if (Notification.permission === 'granted' && selectedApartment?.id) {
          subscribeToPush(selectedApartment.id).then((ok) => {
            if (ok) setPushEnabled(true);
          });
        } else if (
          Notification.permission === 'default' &&
          !localStorage.getItem('push_prompt_dismissed')
        ) {
          setShowPushPrompt(true);
        }
      });
    }
  }, [selectedApartment?.id]);

  const handleEnablePushFromPrompt = async () => {
    setPushLoading(true);
    try {
      const ok = await subscribeToPush(selectedApartment?.id);
      setPushEnabled(ok);
      setShowPushPrompt(false);
    } catch (e) {
      console.error(e);
    } finally {
      setPushLoading(false);
    }
  };

  const handleDismissPushPrompt = () => {
    setShowPushPrompt(false);
    localStorage.setItem('push_prompt_dismissed', 'true');
  };

  useEffect(() => {
    fetch('/api/config/qr-public', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setQrConfig)
      .catch(() => setQrConfig(null));
  }, []);

  // Compute news unread count (posts newer than last read time)
  useEffect(() => {
    const lastRead = localStorage.getItem('news_last_read');
    fetch('/api/announcements', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.data) return;
        if (!lastRead) {
          setNewsUnreadCount(data.data.length);
        } else {
          const count = data.data.filter(
            (p: { published_at: string }) => new Date(p.published_at) > new Date(lastRead)
          ).length;
          setNewsUnreadCount(count);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let isActive = true;

    const cleanupChat = () => {
      if (chatInstanceRef.current) {
        try {
          if (typeof chatInstanceRef.current.destroy === 'function') {
            chatInstanceRef.current.destroy();
          } else if (typeof chatInstanceRef.current === 'function') {
            chatInstanceRef.current();
          }
        } catch (e) {
          console.warn('Lỗi khi hủy chatbot:', e);
        }
        chatInstanceRef.current = null;
      }

      const selectors = [
        '#n8n-chat',
        '.n8n-chat',
        '.n8n-chat-widget',
        'div[id^="n8n-chat"]',
        '.n8n-chat-container',
        '.n8n-chat-app-container',
      ];

      selectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          if ((el as any)._vnode || (el as any).__vue_app__) {
            (el as any).__vue_app__?.unmount?.();
          }
          el.remove();
        });
      });
    };

    const initChat = async () => {
      if (isInitializingRef.current) return;
      isInitializingRef.current = true;

      await new Promise((resolve) => setTimeout(resolve, 300));

      if (!isActive) {
        isInitializingRef.current = false;
        return;
      }

      cleanupChat();

      if (authenticatedData && selectedApartment) {
        try {
          if (chatInstanceRef.current) {
            isInitializingRef.current = false;
            return;
          }

          chatInstanceRef.current = createChat({
            webhookUrl: '/api/chat-proxy',
            metadata: {
              residentId: authenticatedData.resident.id,
              residentName: authenticatedData.resident.name,
              apartmentId: selectedApartment.id,
              apartmentCode: selectedApartment.code,
            },
            initialMessages: [
              `Xin chào ${authenticatedData.resident.name}! Ban Quản Lý có thể hỗ trợ gì cho bạn ở căn hộ ${selectedApartment.code}?`,
            ],
            i18n: {
              en: {
                title: 'Hỗ trợ cư dân',
                subtitle: 'Ban Quản Lý sẵn sàng lắng nghe bạn',
                footer: '',
                getStarted: 'Bắt đầu hội thoại',
                inputPlaceholder: 'Nhập tin nhắn của bạn...',
                closeButtonTooltip: 'Đóng khung chat',
              },
            },
          });
        } catch (e) {
          console.error('Lỗi khi khởi tạo n8n chat:', e);
        } finally {
          isInitializingRef.current = false;
        }
      } else {
        isInitializingRef.current = false;
      }
    };

    initChat();

    return () => {
      isActive = false;
      cleanupChat();
    };
  }, [
    authenticatedData.resident.id,
    selectedApartment.id,
    authenticatedData.resident.name,
    selectedApartment.code,
  ]);

  const handleTogglePush = async () => {
    if (!isPushSupported()) {
      toast.warning('Trình duyệt không hỗ trợ thông báo đẩy');
      return;
    }
    if (getNotificationPermission() === 'denied') {
      toast.warning('Bạn đã chặn thông báo. Vui lòng vào cài đặt trình duyệt để bật lại.');
      return;
    }
    setPushLoading(true);
    try {
      if (pushEnabled) {
        const ok = await unsubscribeFromPush();
        if (ok) setPushEnabled(false);
      } else {
        const ok = await subscribeToPush(selectedApartment.id);
        if (ok) {
          setPushEnabled(true);
        }
      }
    } catch (err) {
      console.error('Push toggle error:', err);
    } finally {
      setPushLoading(false);
    }
  };

  const usagesForSelectedApartment = useMemo(() => {
    return amenityUsages
      .filter((u) => u.apartmentId === selectedApartment.id)
      .sort((a, b) => {
        const dateDiff = new Date(b.usageDate).getTime() - new Date(a.usageDate).getTime();
        if (dateDiff !== 0) return dateDiff;
        if (!a.startTime || !b.startTime) return 0;
        return a.startTime.localeCompare(b.startTime);
      });
  }, [selectedApartment, amenityUsages]);

  const handleOpenBookingModal = (amenity: AmenityType) => {
    setSelectedAmenity(amenity);
    setBookingModalOpen(true);
  };

  const handleCloseBookingModal = () => {
    setBookingModalOpen(false);
    setSelectedAmenity(null);
  };

  const handleBookAmenity = (bookingData: AmenityBookingData) => {
    if (selectedApartment && selectedAmenity && authenticatedData) {
      return onAddAmenityUsage(
        selectedApartment.id,
        selectedAmenity,
        bookingData,
        authenticatedData.resident.id
      );
    }
    return Promise.reject(new Error('Lỗi xác thực hoặc chưa chọn tiện ích.'));
  };

  const handleCancelBooking = async (usageId: string) => {
    const ok = await confirm({
      title: 'Huỷ lượt đặt chỗ?',
      description: 'Lượt đặt chỗ này sẽ được huỷ và không thể hoàn tác.',
      variant: 'danger',
      confirmLabel: 'Huỷ đặt chỗ',
    });
    if (ok) {
      try {
        await onUpdateAmenityStatus(usageId, 'CANCELLED');
      } catch (error) {
        console.error('Failed to cancel booking', error);
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const handleViewImage = (type: 'E' | 'W', record: UtilityRecord) => {
    const monthStr = record.month.toString().padStart(2, '0');
    const folderName = `${monthStr}${record.year}`;
    const fileName = `${type}-${selectedApartment.code}-${monthStr}${record.year}.jpg`;
    const url = `/utility/${folderName}/${fileName}`;
    setSelectedImageUrl(url);
    setIsImageModalOpen(true);
  };

  // Sidebar nav items
  const getTabClass = (tabName: string) => {
    const baseClass =
      'flex-1 py-3.5 text-center font-semibold border-b-2 transition-colors focus:outline-none text-xs sm:text-sm relative overflow-hidden min-h-[48px] flex items-center justify-center cursor-pointer';
    if (activeTab === tabName) {
      return `${baseClass} text-accent border-accent bg-accent-soft/40`;
    }
    return `${baseClass} text-ink-soft border-transparent hover:bg-surface-alt hover:text-ink`;
  };

  // Sidebar nav items
  const NAV_ITEMS = [
    { key: 'news' as const, icon: NewspaperIcon, label: 'Tin Tức', badge: newsUnreadCount },
    { key: 'handbook' as const, icon: DocumentTextIcon, label: 'Sổ Tay Cư Dân' },
    { key: 'warranty' as const, icon: WrenchScrewdriverIcon, label: 'Bảo Hành Căn Hộ' },
    { key: 'construction' as const, icon: BuildingOfficeIcon, label: 'Đăng Ký Cải Tạo' },
    { key: 'vehicles' as const, icon: TruckIcon, label: 'Thẻ Xe Phương Tiện' },
    { key: 'amenities' as const, icon: TicketIcon, label: 'Đăng Ký Tiện Ích' },
    { key: 'utilities' as const, icon: BoltIcon, label: 'Điện Nước' },
    { key: 'unified' as const, icon: DocumentChartBarIcon, label: 'Hóa Đơn Tổng Hợp' },
    { key: 'feedback' as const, icon: ChatBubbleBottomCenterTextIcon, label: 'Phản Ánh' },
  ];

  return (
    <div className="w-full max-w-6xl lg:max-w-7xl mx-auto bg-surface border-0 sm:border border-brand-border sm:rounded-2xl sm:shadow-elevation-raised flex flex-col overflow-hidden transition-all duration-300 min-h-screen sm:min-h-[85vh] lg:min-h-[90vh]">
      {/* ── TOP HEADER ── */}
      <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-brand-border px-4 py-3 sm:px-5 sm:py-3 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Hamburger (mobile) + Logo */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Mobile: sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="sm:hidden p-1.5 rounded-xl text-ink hover:bg-surface-alt flex-shrink-0 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {/* Desktop: collapse toggle */}
            <button
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="hidden sm:flex p-1.5 rounded-xl text-ink-faint hover:bg-surface-alt flex-shrink-0 cursor-pointer"
              title={sidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <AppLogo className="w-8 h-7 sm:w-10 sm:h-8 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-serif font-semibold text-ink truncate leading-tight">
                Cổng Thông Tin Cư Dân
              </h1>
              <p className="text-[11px] text-ink-soft truncate">
                <span className="font-mono font-semibold text-accent">{selectedApartment.code}</span>
                <span className="mx-1 text-brand-border">·</span>
                {authenticatedData.resident.name}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Push bell */}
            {isPushSupported() && (
              <button
                onClick={handleTogglePush}
                disabled={pushLoading}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  pushEnabled
                    ? 'bg-brand-success-soft text-brand-success border-brand-success/25'
                    : 'bg-surface-alt text-ink-faint border-brand-border hover:text-ink'
                }`}
                title={pushEnabled ? 'Thông báo đang bật' : 'Bật thông báo'}
                aria-label={pushEnabled ? 'Tắt thông báo đẩy' : 'Bật thông báo đẩy'}
              >
                <BellIcon className="w-4 h-4" />
              </button>
            )}
            {/* Desktop extras */}
            <div className="hidden sm:flex items-center gap-1.5">
              {authenticatedData.apartments.length > 1 && (
                <button
                  onClick={onChangeApartment}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface text-ink-soft border border-brand-border rounded-xl text-xs font-semibold hover:bg-surface-alt hover:text-ink transition-colors cursor-pointer"
                >
                  <BuildingOfficeIcon className="w-4 h-4" />
                  <span>Đổi căn</span>
                </button>
              )}
              <button
                onClick={() => setChangePasswordModalOpen(true)}
                aria-label="Đổi mật khẩu"
                title="Đổi mật khẩu"
                className="inline-flex items-center justify-center px-3 py-1.5 bg-surface text-ink-soft border border-brand-border rounded-xl text-xs font-semibold hover:bg-surface-alt hover:text-ink transition-colors cursor-pointer"
              >
                <KeyIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onLogout}
                className="px-3 py-1.5 bg-brand-danger-soft text-brand-danger border border-brand-danger/20 rounded-xl text-xs font-semibold hover:bg-brand-danger-soft/70 transition-colors cursor-pointer"
              >
                Đăng xuất
              </button>
            </div>
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 rounded-xl text-ink-soft hover:bg-surface-alt cursor-pointer"
              aria-label="Mở menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile context menu dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden mt-2 pt-2 border-t border-brand-border space-y-1.5">
            {isPushSupported() && (
              <button
                onClick={() => { handleTogglePush(); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl cursor-pointer ${pushEnabled ? 'bg-brand-success-soft text-brand-success' : 'bg-surface-alt text-ink-soft'}`}
              >
                <span>Thông báo đẩy</span>
                <span className={`text-[10px] font-bold ${pushEnabled ? 'text-brand-success' : 'text-ink-faint'}`}>{pushEnabled ? 'ĐÃ BẬT' : 'TẮT'}</span>
              </button>
            )}
            {authenticatedData.apartments.length > 1 && (
              <button onClick={() => { onChangeApartment(); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 min-h-tap text-xs font-semibold rounded-xl bg-surface-alt text-ink">Đổi căn hộ</button>
            )}
            <button onClick={() => { setChangePasswordModalOpen(true); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 min-h-tap text-xs font-semibold rounded-xl bg-surface-alt text-ink">Đổi mật khẩu</button>
            <button onClick={() => { onLogout(); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2 min-h-tap text-xs font-semibold rounded-xl bg-brand-danger-soft text-brand-danger">Đăng xuất</button>
          </div>
        )}
      </header>

      {/* ── BODY: Sidebar + Content ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── DESKTOP SIDEBAR ── */}
        <aside
          className={`hidden sm:flex flex-col flex-shrink-0 border-r border-brand-border bg-surface-alt/50 transition-all duration-300 ${sidebarCollapsed ? 'w-14' : 'w-52'}`}
        >
          <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`w-full flex items-center gap-3 px-2.5 py-2.5 min-h-tap rounded-xl text-sm font-medium transition-colors duration-200 relative cursor-pointer ${
                    isActive
                      ? 'bg-accent-soft text-accent-ink'
                      : 'text-ink-soft hover:bg-surface-alt hover:text-ink'
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-accent rounded-full" aria-hidden="true" />
                  )}
                  <item.icon className="w-5 h-5 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate text-[13px]">{item.label}</span>}
                  {(item.badge ?? 0) > 0 && (
                    <span className={`${sidebarCollapsed ? 'absolute top-1 right-1' : 'ml-auto'} min-w-[18px] h-[18px] bg-brand-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar bottom: push status */}
          <div className={`px-2 py-3 border-t border-brand-border ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
            {isPushSupported() && (
              <button
                onClick={handleTogglePush}
                disabled={pushLoading}
                className={`${sidebarCollapsed ? 'p-2' : 'w-full flex items-center gap-2 px-2.5 py-2'} rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  pushEnabled
                    ? 'bg-brand-success-soft text-brand-success'
                    : 'text-ink-soft hover:bg-surface-alt hover:text-ink'
                }`}
                title={pushEnabled ? 'Tắt thông báo' : 'Bật thông báo'}
              >
                <BellIcon className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{pushEnabled ? 'Thông báo bật' : 'Bật thông báo'}</span>}
              </button>
            )}
          </div>
        </aside>

        {/* ── MOBILE SIDEBAR DRAWER ── */}
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <div
              className="sm:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Drawer */}
            <div className="sm:hidden fixed inset-y-0 left-0 z-50 w-64 bg-surface shadow-elevation-overlay flex flex-col">
              {/* Drawer header */}
              <div className="flex items-center justify-between px-4 py-4 border-b border-brand-border">
                <div>
                  <p className="text-xs font-bold text-ink">Menu</p>
                  <p className="text-[11px] text-ink-soft"><span className="font-mono">{selectedApartment.code}</span> · {authenticatedData.resident.name}</p>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 hover:bg-surface-alt rounded-xl cursor-pointer"
                  aria-label="Đóng menu"
                >
                  <svg className="w-5 h-5 text-ink-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* Nav items */}
              <nav className="flex-1 py-3 space-y-0.5 px-3 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                  const isActive = activeTab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => { setActiveTab(item.key); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-3 min-h-tap rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-accent-soft text-accent-ink'
                          : 'text-ink-soft hover:bg-surface-alt hover:text-ink'
                      }`}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {(item.badge ?? 0) > 0 && (
                        <span className="min-w-[20px] h-5 bg-brand-danger text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
              {/* Drawer bottom */}
              <div className="px-3 py-3 border-t border-brand-border space-y-1.5">
                {authenticatedData.apartments.length > 1 && (
                  <button onClick={() => { onChangeApartment(); setSidebarOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl bg-surface-alt text-ink cursor-pointer">Đổi căn hộ</button>
                )}
                <button onClick={() => { setChangePasswordModalOpen(true); setSidebarOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl bg-surface-alt text-ink cursor-pointer">Đổi mật khẩu</button>
                <button onClick={onLogout} className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl bg-brand-danger-soft text-brand-danger cursor-pointer">Đăng xuất</button>
              </div>
            </div>
          </>
        )}

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 overflow-y-auto min-w-0">
          <div className="px-4 py-5 sm:px-6 sm:py-6 max-w-4xl mx-auto">
        {/* Push Notification Permission Prompt */}
        {showPushPrompt && (
          <div className="mb-4 bg-brand-teal-soft/60 border border-brand-teal/25 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-teal-soft text-brand-teal flex items-center justify-center shrink-0">
                <BellIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-ink">
                  Bật thông báo đẩy PWA
                </h4>
                <p className="text-[11px] sm:text-sm text-ink-soft">
                  Nhận tin tức hóa đơn và thông báo xác nhận thanh toán tự động ngay trên màn hình điện thoại.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={handleDismissPushPrompt}
                className="px-3 py-1.5 text-sm text-ink-soft hover:text-ink font-medium rounded-xl hover:bg-surface-alt transition-colors cursor-pointer"
              >
                Để sau
              </button>
              <button
                type="button"
                disabled={pushLoading}
                onClick={handleEnablePushFromPrompt}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-accent hover:bg-accent-hover rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {pushLoading ? 'Đang bật...' : 'Bật thông báo'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'handbook' && (
          <ResidentHandbookView />
        )}

        {activeTab === 'amenities' && (
          <div className="space-y-6">
            <div>
              {!authenticatedData.resident.canUseAmenities && (
                <div className="mb-4 p-3 text-center bg-brand-warning-soft border border-brand-warning/25 rounded-xl text-xs text-brand-warning">
                  <strong>Thông báo:</strong> Bạn không có quyền đặt lịch tiện ích. Vui lòng liên hệ
                  BQL.
                </div>
              )}
              <h2 className="text-base font-bold text-ink mb-3 flex items-center justify-between">
                <span>Chọn Tiện Ích &amp; Đặt Lịch (Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()})</span>
              </h2>
              <AmenityManager
                apartmentId={selectedApartment.id}
                amenityUsages={usagesForSelectedApartment}
                onBook={handleOpenBookingModal}
                isAmenityAccessAllowed={authenticatedData.resident.canUseAmenities}
                amenityLimits={amenityLimits}
              />

            </div>

            <div className="border-t border-brand-border pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-ink">
                  Lịch sử Đặt chỗ
                </h2>
                <button
                  onClick={onRefetchAmenityUsages}
                  disabled={isAmenityListLoading}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-accent-ink bg-accent-soft rounded-lg hover:bg-accent-soft/70 transition-colors cursor-pointer"
                >
                  <ArrowPathIcon
                    className={`w-3.5 h-3.5 ${isAmenityListLoading ? 'animate-spin' : ''}`}
                  />
                  <span>Tải lại</span>
                </button>
              </div>

              {usagesForSelectedApartment.length === 0 ? (
                <p className="text-sm text-ink-soft py-8 text-center">
                  Bạn chưa có lượt đặt chỗ nào.
                </p>
              ) : (
                <ul className="space-y-3">
                  {usagesForSelectedApartment.map((usage) => (
                    <li
                      key={usage.id}
                      className="bg-surface p-4 rounded-xl shadow-xs border border-brand-border hover:shadow-md transition-shadow duration-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-bold text-ink text-sm">
                            {AMENITY_NAMES[usage.amenity]}
                          </p>
                          {usage.residentName && (
                            <span className="text-[10px] px-2 py-0.5 bg-surface-alt text-ink-soft rounded-full font-medium">
                              {usage.residentName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-ink-soft">
                          <span>
                            {new Date(usage.usageDate + 'T00:00:00').toLocaleDateString('vi-VN')}
                          </span>
                          <span>•</span>
                          <span>
                            {usage.startTime} - {usage.endTime}
                          </span>
                        </div>
                        <div className="mt-1.5">
                          <span className="text-[10px] text-ink-faint font-mono bg-surface-alt px-1.5 py-0.5 rounded">
                            #{usage.bookingCode}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <button
                          onClick={() => setViewingQrCode(usage)}
                          className="p-1.5 text-ink-soft bg-surface border border-brand-border hover:text-accent hover:border-accent/40 rounded-lg transition-colors cursor-pointer"
                          title="Mã QR"
                          aria-label={`Xem mã QR đặt chỗ ${usage.bookingCode}`}
                        >
                          <QrCodeIcon className="w-4 h-4" />
                        </button>
                        <span
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase ${getAmenityStatusBadgeClass(
                            usage.status
                          )}`}
                        >
                          {translateAmenityStatus(usage.status)}
                        </span>
                        {usage.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancelBooking(usage.id)}
                            className="px-2.5 py-1 text-brand-danger bg-brand-danger-soft border border-brand-danger/20 text-[10px] font-bold rounded-lg hover:bg-brand-danger-soft/70 transition-colors cursor-pointer"
                          >
                            Hủy
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {activeTab === 'utilities' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-ink">
              Chi tiết tiêu thụ Điện Nước
            </h2>
            {localUtilityRecords.length === 0 ? (
              <p className="text-sm text-ink-soft py-8 text-center bg-surface rounded-xl border border-brand-border">
                Chưa có dữ liệu điện nước cho căn hộ này.
              </p>
            ) : (
              <div className="space-y-4">
                {localUtilityRecords.map((record) => (
                  <div
                    key={record.id}
                    className="bg-surface border border-brand-border rounded-xl shadow-sm p-4"
                  >
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-brand-border">
                      <h4 className="text-sm font-mono font-bold text-ink">
                        Tháng {record.month}/{record.year}
                      </h4>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          record.paymentStatus === 'PAID'
                            ? 'bg-brand-success-soft text-brand-success'
                            : 'bg-brand-warning-soft text-brand-warning'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            record.paymentStatus === 'PAID' ? 'bg-brand-success' : 'bg-brand-warning'
                          }`}
                        />
                        {record.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Electricity */}
                      <div className="p-3.5 bg-brand-warning-soft/50 rounded-xl border border-brand-warning/25">
                        <div className="flex items-center justify-between mb-2">
                          <span className="flex items-center gap-1.5 font-bold text-ink text-sm">
                            <BoltIcon className="w-4 h-4 text-brand-warning" />
                            Tiền Điện
                          </span>
                          <button
                            onClick={() => handleViewImage('E', record)}
                            className="p-1.5 text-ink-soft hover:bg-surface-alt hover:text-ink rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                            title="Xem ảnh đồng hồ"
                          >
                            <PhotoIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-1 text-ink-soft">
                          <div className="flex justify-between">
                            <span>Chỉ số:</span>
                            <span className="font-mono tabular-nums">
                              {record.electricity.oldReading} → {record.electricity.newReading}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tiêu thụ:</span>
                            <span className="font-semibold text-brand-warning font-mono tabular-nums">
                              {record.electricity.consumption} kWh
                            </span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-brand-warning/30 font-bold text-ink">
                            <span>Thành tiền:</span>
                            <span className="font-mono tabular-nums">{formatCurrency(record.electricity.cost)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Water */}
                      <div className="p-3.5 bg-brand-teal-soft/50 rounded-xl border border-brand-teal/25">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-ink text-sm">
                            Nước
                          </span>
                          <button
                            onClick={() => handleViewImage('W', record)}
                            className="p-1.5 text-ink-soft hover:bg-surface-alt hover:text-ink rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                            title="Xem ảnh đồng hồ"
                          >
                            <PhotoIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-1 text-ink-soft">
                          <div className="flex justify-between">
                            <span>Chỉ số:</span>
                            <span className="font-mono tabular-nums">
                              {record.water.oldReading} → {record.water.newReading}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tiêu thụ:</span>
                            <span className="font-semibold text-brand-teal font-mono tabular-nums">
                              {record.water.consumption} m³
                            </span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-brand-teal/30 font-bold text-ink">
                            <span>Thành tiền:</span>
                            <span className="font-mono tabular-nums">{formatCurrency(record.water.cost)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-brand-border flex flex-wrap justify-between items-center gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewingUtilityDetail(record)}
                          className="px-2.5 py-1 text-xs text-accent-ink bg-accent-soft font-semibold rounded-lg hover:bg-accent-soft/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                        >
                          Xem chi tiết bậc thang
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-semibold text-ink">
                          Tổng:{' '}
                          <span className="text-ink font-mono tabular-nums">
                            {formatCurrency(record.electricity.cost + record.water.cost)}
                          </span>
                        </span>

                        {record.paymentStatus !== 'PAID' ? (
                          <button
                            onClick={() => setPaymentModal({ record })}
                            className="px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-xl font-semibold text-xs shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                          >
                            <QrCodeIcon className="w-3.5 h-3.5" />
                            <span>Thanh Toán QR</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                setViewingInvoice({
                                  type: 'utility',
                                  id: record.id,
                                  apartmentId: selectedApartment.id,
                                  apartmentCode: selectedApartment.code,
                                  month: record.month,
                                  year: record.year,
                                })
                              }
                              className="px-2.5 py-1 text-xs font-semibold text-ink bg-surface border border-brand-border rounded-lg hover:border-accent/40 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Xem Hóa đơn điện tử"
                            >
                              <DocumentTextIcon className="w-3.5 h-3.5 text-accent" />
                              <span>Xem HĐĐT</span>
                            </button>
                            <a
                              href={`/api/vnpt-invoice/download-pdf?type=utility&id=${record.id}&apartmentId=${selectedApartment.id}&apartmentCode=${selectedApartment.code}&month=${record.month}&year=${record.year}`}
                              download={`HDDT_${selectedApartment.code}_${String(record.month).padStart(2, '0')}${record.year}.pdf`}
                              className="px-2 py-1 text-brand-danger bg-brand-danger-soft hover:bg-brand-danger-soft/70 rounded-lg text-xs font-semibold border border-brand-danger/20 transition-colors"
                              title="Tải PDF HĐĐT"
                            >
                              PDF
                            </a>
                            <a
                              href={`/api/vnpt-invoice/download-xml?type=utility&id=${record.id}&apartmentId=${selectedApartment.id}&apartmentCode=${selectedApartment.code}&month=${record.month}&year=${record.year}`}
                              download={`HDDT_${selectedApartment.code}_${String(record.month).padStart(2, '0')}${record.year}.xml`}
                              className="px-2 py-1 text-accent-ink bg-accent-soft hover:bg-accent-soft/70 rounded-lg text-xs font-semibold border border-accent/20 transition-colors"
                              title="Tải XML chuẩn Thuế"
                            >
                              XML
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Hóa Đơn Tổng Hợp (Unified Billing) */}
        {activeTab === 'unified' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-ink flex items-center gap-2">
                  <span>Hóa Đơn Tổng Hợp Căn Hộ</span>
                </h2>
                <p className="text-sm text-ink-soft mt-0.5">
                  Tổng hợp toàn bộ phí quản lý, phí gửi xe, tiền điện và tiền nước trong kỳ
                </p>
              </div>
              <button
                onClick={() => fetchUnifiedHistory(selectedApartment.id)}
                disabled={unifiedLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-700 bg-primary-50  rounded-xl hover:bg-primary-100 transition"
              >
                <ArrowPathIcon className={`w-3.5 h-3.5 ${unifiedLoading ? 'animate-spin' : ''}`} />
                <span>Tải lại</span>
              </button>
            </div>

            {unifiedLoading ? (
              <div className="p-12 text-center text-ink-soft bg-surface rounded-xl border border-brand-border">
                <ArrowPathIcon className={`w-8 h-8 animate-spin text-primary-500 mx-auto mb-2`} />
                <p className="text-xs">Đang tải danh sách hóa đơn tổng hợp...</p>
              </div>
            ) : unifiedHistory.length === 0 ? (
              <p className="text-sm text-ink-soft py-10 text-center bg-surface rounded-xl border border-brand-border">
                Chưa có dữ liệu hóa đơn tổng hợp cho căn hộ này.
              </p>
            ) : (
              <div className="space-y-4">
                {unifiedHistory.map((item) => {
                  const isPaid = item.combined_status === 'PAID';
                  const vehicleFee =
                    Number(item.management_fee_breakdown?.parking_car_fee || 0) +
                    Number(item.management_fee_breakdown?.parking_motorbike_fee || 0);

                  return (
                    <div
                      key={`${item.apartment_id}-${item.month}-${item.year}`}
                      className="bg-surface border border-brand-border rounded-xl shadow-sm p-4"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-brand-border">
                        <div>
                          <h4 className="text-sm font-bold text-ink">
                            Kỳ Hóa Đơn Tháng <span className="font-mono">{String(item.month).padStart(2, '0')}/{item.year}</span>
                          </h4>
                          <span className="text-[11px] text-ink-soft font-mono">
                            Mã tra cứu: UB_{selectedApartment.code.replace(/[^a-zA-Z0-9]/g, '')}_{String(item.month).padStart(2, '0')}{item.year}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            isPaid
                              ? 'bg-brand-success-soft text-brand-success'
                              : 'bg-brand-warning-soft text-brand-warning'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-brand-success' : 'bg-brand-warning'}`}
                          />
                          {isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                        </span>
                      </div>

                      {/* Breakdown Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-3">
                        {/* Management Fee */}
                        <div className="p-3 bg-surface-alt rounded-xl border border-brand-border">
                          <span className="text-ink-soft block mb-1 font-medium">
                            Phí Quản Lý Vận Hành
                          </span>
                          <div className="font-bold text-ink text-sm font-mono tabular-nums">
                            {formatCurrency(Number(item.management_fee_cost || 0))}
                          </div>
                          {vehicleFee > 0 && (
                            <div className="text-[11px] text-ink-soft mt-1">
                              (Đã gồm xe: {formatCurrency(vehicleFee)})
                            </div>
                          )}
                        </div>

                        {/* Electricity */}
                        <div className="p-3 bg-brand-warning-soft/50 rounded-xl border border-brand-warning/25">
                          <span className="text-ink-soft block mb-1 font-medium">
                            Tiền Điện Sinh Hoạt
                          </span>
                          <div className="font-bold text-ink text-sm font-mono tabular-nums">
                            {formatCurrency(Number(item.electricity_cost || 0))}
                          </div>
                          <div className="text-[11px] text-ink-soft mt-1">
                            Tiêu thụ: {item.electricity_usage || 0} kWh
                          </div>
                        </div>

                        {/* Water */}
                        <div className="p-3 bg-brand-teal-soft/50 rounded-xl border border-brand-teal/25">
                          <span className="text-ink-soft block mb-1 font-medium">
                            Nước Sinh Hoạt
                          </span>
                          <div className="font-bold text-ink text-sm font-mono tabular-nums">
                            {formatCurrency(Number(item.water_cost || 0))}
                          </div>
                          <div className="text-[11px] text-ink-soft mt-1">
                            Tiêu thụ: {item.water_usage || 0} m³
                          </div>
                        </div>
                      </div>

                      {/* Footer / Total & Actions */}
                      <div className="pt-3 border-t border-brand-border flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-ink-soft">
                            Tổng cần phải trả:{' '}
                            <span className="font-serif text-3xl sm:text-4xl font-semibold text-ink align-middle">
                              {formatCurrency(Number(item.grand_total || 0))}
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {!isPaid ? (
                            <button
                              onClick={() => setUnifiedPaymentModal({ record: item })}
                              className="px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-xl font-semibold text-xs shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                            >
                              <QrCodeIcon className="w-4 h-4" />
                              <span>Thanh Toán QR</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() =>
                                  setViewingInvoice({
                                    type: 'unified',
                                    apartmentId: selectedApartment.id,
                                    apartmentCode: selectedApartment.code,
                                    month: item.month,
                                    year: item.year,
                                  })
                                }
                                className="px-2.5 py-1 text-xs font-semibold text-ink bg-surface border border-brand-border rounded-lg hover:border-accent/40 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <DocumentTextIcon className="w-3.5 h-3.5 text-accent" />
                                <span>Xem HĐĐT</span>
                              </button>
                              <a
                                href={`/api/vnpt-invoice/download-pdf?type=unified&apartmentId=${selectedApartment.id}&apartmentCode=${selectedApartment.code}&month=${item.month}&year=${item.year}`}
                                download={`HDDT_${selectedApartment.code}_${String(item.month).padStart(2, '0')}${item.year}.pdf`}
                                className="px-2 py-1 text-brand-danger bg-brand-danger-soft hover:bg-brand-danger-soft/70 rounded-lg text-xs font-semibold border border-brand-danger/20 transition-colors"
                                title="Tải PDF HĐĐT"
                              >
                                PDF
                              </a>
                              <a
                                href={`/api/vnpt-invoice/download-xml?type=unified&apartmentId=${selectedApartment.id}&apartmentCode=${selectedApartment.code}&month=${item.month}&year=${item.year}`}
                                download={`HDDT_${selectedApartment.code}_${String(item.month).padStart(2, '0')}${item.year}.xml`}
                                className="px-2 py-1 text-accent-ink bg-accent-soft hover:bg-accent-soft/70 rounded-lg text-xs font-semibold border border-accent/20 transition-colors"
                                title="Tải XML chuẩn Thuế"
                              >
                                XML
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'feedback' && (
          <PortalFeedbackSection
            apartmentId={selectedApartment.id}
            residentId={authenticatedData.resident.id}
            feedbackList={feedbackList}
            onAddFeedback={onAddFeedback}
            onViewDetails={setViewingFeedback}
          />
        )}

        {/* ── NEWS TAB ── */}
        {activeTab === 'news' && (
          <PortalNewsSection onMarkRead={() => setNewsUnreadCount(0)} />
        )}

        {/* ── WARRANTY TAB ── */}
        {activeTab === 'warranty' && (
          <PortalWarrantySection
            apartmentId={selectedApartment.id}
            apartmentCode={selectedApartment.code}
            residentName={authenticatedData.resident.name}
          />
        )}

        {/* ── CONSTRUCTION TAB ── */}
        {activeTab === 'construction' && (
          <PortalConstructionSection
            apartmentId={selectedApartment.id}
            apartmentCode={selectedApartment.code}
          />
        )}

        {/* ── VEHICLES TAB ── */}
        {activeTab === 'vehicles' && (
          <PortalVehicleSection
            apartmentId={selectedApartment.id}
            apartmentCode={selectedApartment.code}
          />
        )}
          </div>
        </main>
      </div>

      {/* Modals */}
      {selectedAmenity && (
        <BookAmenityModal
          isOpen={isBookingModalOpen}
          onClose={handleCloseBookingModal}
          onBook={handleBookAmenity}
          amenityType={selectedAmenity}
        />
      )}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
        residentId={authenticatedData.resident.id}
      />
      <FeedbackDetailModal
        isOpen={!!viewingFeedback}
        onClose={() => setViewingFeedback(null)}
        feedback={viewingFeedback}
      />
      <QRCodeModal
        isOpen={!!viewingQrCode}
        onClose={() => setViewingQrCode(null)}
        usage={viewingQrCode}
      />
      <UtilityRecordDetailModal
        isOpen={!!viewingUtilityDetail}
        onClose={() => setViewingUtilityDetail(null)}
        record={viewingUtilityDetail}
        apartmentCode={selectedApartment.code}
      />
      <ImageViewerModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        imageUrl={selectedImageUrl}
      />
      {/* Floating Push Notification Banner */}
      {pushNotificationBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[92%] bg-brand-success text-white p-4 rounded-2xl shadow-elevation-raised flex items-center justify-between gap-3 animate-slide-down border border-white/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <DocumentChartBarIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">{pushNotificationBanner.title}</h4>
              <p className="text-xs text-white/85 mt-0.5">{pushNotificationBanner.message}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => {
                setViewingInvoice({
                  type: pushNotificationBanner.type,
                  apartmentId: selectedApartment.id,
                  apartmentCode: selectedApartment.code,
                  month: pushNotificationBanner.month,
                  year: pushNotificationBanner.year,
                });
                setPushNotificationBanner(null);
              }}
              className="px-3 py-1.5 bg-white text-brand-success rounded-xl text-xs font-bold shadow-xs hover:bg-brand-success-soft transition-colors cursor-pointer"
            >
              Xem HĐĐT
            </button>
            <button
              onClick={() => setPushNotificationBanner(null)}
              aria-label="Đóng"
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {paymentModal && (
        <PaymentQRModal
          isOpen={true}
          onClose={() => setPaymentModal(null)}
          title="Thanh Toán Điện Nước"
          type="utility"
          amount={paymentModal.record.electricity.cost + paymentModal.record.water.cost}
          transferContent={`EW-${selectedApartment.code}-${String(paymentModal.record.month).padStart(2, '0')}${paymentModal.record.year}`}
          apartmentCode={selectedApartment.code}
          apartmentId={selectedApartment.id}
          month={paymentModal.record.month}
          year={paymentModal.record.year}
          qrConfig={qrConfig}
          onPaymentSuccess={() => {
            handlePaymentSuccess(
              'utility',
              paymentModal.record.month,
              paymentModal.record.year
            );
          }}
        />
      )}
      {unifiedPaymentModal && (
        <PaymentQRModal
          isOpen={true}
          onClose={() => setUnifiedPaymentModal(null)}
          title="Thanh Toán Hóa Đơn Tổng Hợp"
          type="unified"
          amount={Number(unifiedPaymentModal.record.grand_total || 0)}
          transferContent={`UB-${selectedApartment.code}-${String(unifiedPaymentModal.record.month).padStart(2, '0')}${unifiedPaymentModal.record.year}`}
          apartmentCode={selectedApartment.code}
          apartmentId={selectedApartment.id}
          month={unifiedPaymentModal.record.month}
          year={unifiedPaymentModal.record.year}
          qrConfig={qrConfig}
          onPaymentSuccess={() => {
            handlePaymentSuccess(
              'unified',
              unifiedPaymentModal.record.month,
              unifiedPaymentModal.record.year
            );
          }}
        />
      )}
      {viewingInvoice && (
        <InvoiceViewModal
          isOpen={true}
          onClose={() => setViewingInvoice(null)}
          type={viewingInvoice.type}
          id={viewingInvoice.id}
          apartmentId={viewingInvoice.apartmentId}
          apartmentCode={viewingInvoice.apartmentCode}
          month={viewingInvoice.month}
          year={viewingInvoice.year}
        />
      )}
    </div>
  );
}

export default ResidentPortalPage;
