import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type {
  AmenityType,
  AmenityUsage,
  UtilityRecord,
  Apartment,
  AmenityBookingData,
  Feedback,
  FeedbackSubmissionData,
  PricingConfig,
} from '../types';
import type { AmenityLimitConfig } from './AmenityManager';
import ResidentPortalPage from '../pages/ResidentPortalPage';
import { ArrowLeftIcon, BuildingOfficeIcon, ArrowRightIcon } from './icons';
import { useToast } from './ui';
import PortalOnboarding from './PortalOnboarding';

interface AuthenticatedData {
  resident: { id: string; name: string; canUseAmenities: boolean };
  apartments: Pick<Apartment, 'id' | 'code'>[];
}

function ResidentPortalHost() {
  const [authenticatedData, setAuthenticatedData] = useState<AuthenticatedData | null>(null);
  const [selectedApartment, setSelectedApartment] = useState<Pick<Apartment, 'id' | 'code'> | null>(
    null
  );
  const [utilityRecords, setUtilityRecords] = useState<UtilityRecord[]>([]);
  const [amenityUsages, setAmenityUsages] = useState<AmenityUsage[]>([]);
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [appConfig, setAppConfig] = useState<PricingConfig | null>(null);
  const [amenityLimits, setAmenityLimits] = useState<Record<string, AmenityLimitConfig> | null>(
    null
  );
  const [authChecked, setAuthChecked] = useState(false);
  const toast = useToast();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAmenityListLoading, setIsAmenityListLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const data = await api.get<{ user: AuthenticatedData; userType: string }>('/auth/session');
        if (data && data.userType === 'resident') {
          setAuthenticatedData(data.user);
          if (data.user.apartments.length === 1) {
            await handleSelectApartment(data.user.apartments[0]);
          }
        }
      } catch (error) {
        console.error('Session check failed:', error);
      } finally {
        setAuthChecked(true);
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    // Fetch initial data needed for the portal
    const fetchInitialData = async () => {
      setIsAmenityListLoading(true);
      try {
        const [amenityUsages, pricingConfig, limits] = await Promise.all([
          api.get<AmenityUsage[]>('/amenity-usage'),
          api.get<PricingConfig>('/config/pricing'),
          api.get<Record<string, AmenityLimitConfig>>('/amenity-limits').catch(() => null),
        ]);

        setAmenityUsages(amenityUsages);
        setAppConfig(pricingConfig);
        setAmenityLimits(limits);
      } catch (error) {
        console.error('Failed to fetch initial data for resident portal:', error);
        setError('Không thể tải dữ liệu. Vui lòng thử lại sau.');
      } finally {
        setIsAmenityListLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.post<AuthenticatedData>('/resident-portal/login', {
        phoneNumber,
        password,
      });

      setAuthenticatedData(data);
      if (data.apartments.length === 1) {
        await handleSelectApartment(data.apartments[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectApartment = async (apartment: Pick<Apartment, 'id' | 'code'>) => {
    setIsLoading(true);
    try {
      const [utilityData, feedbackData] = await Promise.all([
        api.get<{ data?: UtilityRecord[] }>(`/resident-portal/billing?apartmentId=${apartment.id}`),
        api.get<Feedback[]>(`/resident-portal/feedback?apartmentId=${apartment.id}`),
      ]);

      setUtilityRecords(utilityData?.data || []);
      setFeedbackList(feedbackData || []);
      setSelectedApartment(apartment);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      setAuthenticatedData(null);
      setSelectedApartment(null);
      setUtilityRecords([]);
      setFeedbackList([]);
      setPhoneNumber('');
      setPassword('');
      setError(null);
    }
  };

  const handleChangeApartment = () => {
    setSelectedApartment(null);
    setUtilityRecords([]);
    setFeedbackList([]);
    setError(null);
  };

  const handleRefetchAmenityUsages = async () => {
    if (!selectedApartment?.id) return;
    setIsAmenityListLoading(true);
    try {
      const newUsages = await api.get<AmenityUsage[]>(
        `/resident-portal/amenities?apartmentId=${selectedApartment.id}`
      );
      setAmenityUsages(newUsages);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setIsAmenityListLoading(false);
    }
  };

  const handleAddAmenityUsage = async (
    apartmentId: string,
    amenity: AmenityType,
    bookingData: AmenityBookingData,
    residentId: string
  ): Promise<AmenityUsage> => {
    try {
      const newUsage = await api.post<AmenityUsage>('/resident-portal/amenities/booking', {
        apartmentId,
        amenity,
        ...bookingData,
        residentId,
      });

      setAmenityUsages((prev) =>
        [...prev, newUsage].sort(
          (a, b) => new Date(b.usageDate).getTime() - new Date(a.usageDate).getTime()
        )
      );
      return newUsage;
    } catch (error: any) {
      console.error(error);
      throw error;
    }
  };

  const handleUpdateAmenityStatus = async (usageId: string, status: 'USED' | 'CANCELLED') => {
    try {
      const updatedUsage = await api.put<AmenityUsage>(`/amenity-usage/${usageId}/status`, {
        status,
      });
      setAmenityUsages((prevUsages) =>
        prevUsages.map((u) => (u.id === usageId ? updatedUsage : u))
      );
    } catch (error: any) {
      console.error(error);
      toast.error('Cập nhật trạng thái đặt chỗ thất bại.');
    }
  };

  const handleAddFeedback = async (formData: FormData) => {
    if (!selectedApartment?.id) throw new Error('Chưa chọn căn hộ.');
    try {
      formData.set('apartmentId', selectedApartment.id);
      const newFeedback = await api.upload<Feedback>('/resident-portal/feedback', formData, 'POST');
      setFeedbackList((prev) =>
        [newFeedback, ...prev].sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        )
      );
    } catch (error: any) {
      throw new Error(error.message || 'Gửi phản ánh thất bại.');
    }
  };

  const inputClass =
    'mt-1 block w-full px-3 py-2.5 rounded-[10px] border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors disabled:opacity-60';
  const labelClass = 'block text-xs font-semibold text-ink-soft';

  const renderContent = () => {
    // ── Portal đầy đủ: chiếm toàn màn hình, không còn panel thương hiệu ──
    if (authenticatedData && selectedApartment) {
      return (
        <>
          <ResidentPortalPage
            authenticatedData={authenticatedData}
            selectedApartment={selectedApartment}
            utilityRecords={utilityRecords}
            amenityUsages={amenityUsages}
            feedbackList={feedbackList}
            appConfig={appConfig}
            onAddAmenityUsage={handleAddAmenityUsage}
            onUpdateAmenityStatus={handleUpdateAmenityStatus}
            onAddFeedback={handleAddFeedback}
            onRefetchAmenityUsages={handleRefetchAmenityUsages}
            isAmenityListLoading={isAmenityListLoading}
            onLogout={handleLogout}
            onChangeApartment={handleChangeApartment}
            amenityLimits={amenityLimits}
          />
          <PortalOnboarding
            apartmentCode={selectedApartment.code}
            residentName={authenticatedData.resident.name}
          />
        </>
      );
    }

    return (
      <div className="flex min-h-screen bg-bg font-sans">
        {/* ── Brand Panel (desktop) ── */}
        <aside
          aria-hidden="true"
          className="hidden lg:flex lg:w-1/2 relative flex-col justify-between overflow-hidden bg-gradient-to-br from-sidebar-bg to-sidebar-bg-2 p-12"
        >
          {/* Decorative arcs */}
          <svg
            className="absolute -bottom-40 -right-40 w-[480px] h-[480px] opacity-[0.08]"
            viewBox="0 0 200 200"
            fill="none"
            stroke="#F2F3EF"
            strokeWidth="0.6"
          >
            <circle cx="100" cy="100" r="98" />
            <circle cx="100" cy="100" r="78" />
            <circle cx="100" cy="100" r="58" />
            <circle cx="100" cy="100" r="38" />
          </svg>

          <div className="relative">
            <p className="text-xs font-semibold tracking-[0.3em] uppercase text-white/50">
              Thành Phố Cà Phê
            </p>
          </div>

          <div className="relative max-w-md">
            <h2 className="font-serif text-4xl xl:text-5xl font-medium text-bg leading-tight">
              Cổng thông tin
              <br />
              cư dân
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-white/60">
              Quản lý hóa đơn điện nước, đặt tiện ích và gửi phản ánh — mọi dịch vụ của khu đô thị
              trong một ứng dụng duy nhất.
            </p>
          </div>

          <div className="relative">
            <p className="text-xs text-white/40">
              Ban Quản Lý Thành Phố Cà Phê · {new Date().getFullYear()}
            </p>
          </div>
        </aside>

        {/* ── Form Side ── */}
        <main className="flex-1 flex items-center justify-center p-6 sm:p-10 relative">
          {!authenticatedData && (
            <a
              href="/"
              className="absolute top-5 left-5 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-accent transition-colors"
              aria-label="Về trang đăng nhập quản lý"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>Quản trị</span>
            </a>
          )}

          {!authChecked || isLoading ? (
            <div className="flex flex-col items-center gap-3 text-ink-soft">
              <div className="rounded-full h-9 w-9 border-2 border-accent/70"></div>
              <p className="text-sm">Đang tải dữ liệu...</p>
            </div>
          ) : authenticatedData && !selectedApartment ? (
            /* ── Chọn căn hộ ── */
            <div className="w-full max-w-md">
              {/* Brand thu gọn cho mobile */}
              <div className="lg:hidden mb-8">
                <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-ink-faint text-center">
                  Thành Phố Cà Phê
                </p>
                <h1 className="mt-2 font-serif text-2xl font-semibold text-ink text-center">
                  Chọn căn hộ
                </h1>
              </div>
              <h1 className="hidden lg:block font-serif text-2xl font-semibold text-ink">
                Chọn căn hộ
              </h1>
              <p className="mt-2 text-sm text-ink-soft">
                Tài khoản của bạn được liên kết với nhiều căn hộ. Vui lòng chọn một để tiếp tục.
              </p>

              <div role="listbox" aria-label="Danh sách căn hộ" className="mt-6 space-y-3">
                {authenticatedData.apartments.map((apt) => (
                  <button
                    key={apt.id}
                    role="option"
                    aria-selected={false}
                    onClick={() => handleSelectApartment(apt)}
                    className="group w-full flex items-center justify-between gap-3 p-4 rounded-xl border border-brand-border bg-surface shadow-xs hover:border-accent hover:shadow-md transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="p-2 rounded-lg bg-accent-soft text-accent-ink shrink-0">
                        <BuildingOfficeIcon className="w-5 h-5" />
                      </span>
                      <span className="font-mono font-semibold text-base text-ink truncate">
                        {apt.code}
                      </span>
                    </span>
                    <ArrowRightIcon className="w-4 h-4 text-ink-faint group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))}
              </div>

              <button
                onClick={handleLogout}
                className="mt-6 mx-auto block px-4 py-2 text-sm font-semibold text-ink-soft hover:text-brand-danger transition-colors cursor-pointer"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            /* ── Đăng nhập ── */
            <div className="w-full max-w-sm">
              {/* Brand thu gọn cho mobile */}
              <div className="lg:hidden mb-8 text-center">
                <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-ink-faint">
                  Thành Phố Cà Phê
                </p>
                <h1 className="mt-2 font-serif text-2xl font-semibold text-ink">
                  Cổng thông tin cư dân
                </h1>
              </div>

              <h1 className="hidden lg:block font-serif text-3xl font-semibold text-ink">
                Cổng thông tin cư dân
              </h1>
              <p className="hidden lg:block mt-2 text-sm text-ink-soft">
                Đăng nhập để quản lý hóa đơn, tiện ích và phản ánh của bạn.
              </p>

              <form className="mt-8 space-y-5" onSubmit={handleLogin}>
                <div>
                  <label htmlFor="phone-number" className={labelClass}>
                    Số điện thoại
                  </label>
                  <input
                    id="phone-number"
                    name="phone-number"
                    type="tel"
                    required
                    autoComplete="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className={inputClass}
                    placeholder="Số điện thoại đã đăng ký"
                  />
                </div>
                <div>
                  <label htmlFor="resident-password" className={labelClass}>
                    Mật khẩu
                  </label>
                  <input
                    id="resident-password"
                    name="resident-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <p
                    role="alert"
                    className="flex items-start gap-2 text-sm text-brand-danger bg-brand-danger-soft border border-brand-danger/20 rounded-lg px-3 py-2"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-wait cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2" aria-label="Đóng">
                  {isLoading && (
                    <span className="inline-flex items-center justify-center rounded-full h-4 w-4 border-2 border-white/80"></span>
                  )}
                  {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    );
  };

  return renderContent();
}

export default ResidentPortalHost;
