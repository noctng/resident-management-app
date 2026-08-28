import React, { useState } from 'react';
import type { AmenityType, AmenityUsage } from '../types';
import {
  GolfFlagIcon,
  HorseshoeIcon,
  MuseumIcon,
  ZenTreeIcon,
  SaunaSteamIcon,
  ArcheryTargetIcon,
  DumbbellIcon,
  LotusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
} from './icons';

export interface AmenityLimitConfig {
  monthlyLimit: number;
  description: string;
}

interface AmenityManagerProps {
  apartmentId: string;
  amenityUsages: AmenityUsage[];
  onBook: (amenity: AmenityType) => void;
  isAmenityAccessAllowed?: boolean;
  amenityLimits?: Record<string, AmenityLimitConfig> | null;
}

const AMENITY_DETAILS: Record<
  AmenityType,
  {
    name: string;
    category: 'sports' | 'relax';
    limit: number | null;
    icon: React.FC<{ className?: string }>;
    accentColor: string;
    progressBar: string;
    buttonColor: string;
  }
> = {
  GOLF_3D: {
    name: 'Golf 3D',
    category: 'sports',
    limit: 8,
    icon: GolfFlagIcon,
    accentColor: 'bg-accent-soft text-accent-ink',
    progressBar: 'bg-accent',
    buttonColor: 'bg-accent hover:bg-accent-hover text-white',
  },
  HORSE_RIDING: {
    name: 'Cưỡi ngựa Ả Rập',
    category: 'sports',
    limit: 2,
    icon: HorseshoeIcon,
    accentColor: 'bg-brand-warning-soft text-brand-warning',
    progressBar: 'bg-accent',
    buttonColor: 'bg-accent hover:bg-accent-hover text-white',
  },
  MUSEUM: {
    name: 'Thăm quan bảo tàng',
    category: 'relax',
    limit: 2,
    icon: MuseumIcon,
    accentColor: 'bg-brand-teal-soft text-brand-teal',
    progressBar: 'bg-accent',
    buttonColor: 'bg-accent hover:bg-accent-hover text-white',
  },
  ZEN_GARDEN: {
    name: 'Thăm quan vườn Zen',
    category: 'relax',
    limit: null,
    icon: ZenTreeIcon,
    accentColor: 'bg-brand-success-soft text-brand-success',
    progressBar: 'bg-accent',
    buttonColor: 'bg-accent hover:bg-accent-hover text-white',
  },
  SAUNA: {
    name: 'Xông Hơi Thư Giãn',
    category: 'relax',
    limit: 8,
    icon: SaunaSteamIcon,
    accentColor: 'bg-accent-soft text-accent-ink',
    progressBar: 'bg-accent',
    buttonColor: 'bg-accent hover:bg-accent-hover text-white',
  },
  ARCHERY: {
    name: 'Bắn Cung Nghệ Thuật',
    category: 'sports',
    limit: 8,
    icon: ArcheryTargetIcon,
    accentColor: 'bg-brand-warning-soft text-brand-warning',
    progressBar: 'bg-accent',
    buttonColor: 'bg-accent hover:bg-accent-hover text-white',
  },
  GYM: {
    name: 'Phòng Tập Gym',
    category: 'sports',
    limit: null,
    icon: DumbbellIcon,
    accentColor: 'bg-brand-teal-soft text-brand-teal',
    progressBar: 'bg-accent',
    buttonColor: 'bg-accent hover:bg-accent-hover text-white',
  },
  YOGA: {
    name: 'Yoga & Thiền Định',
    category: 'sports',
    limit: null,
    icon: LotusIcon,
    accentColor: 'bg-brand-success-soft text-brand-success',
    progressBar: 'bg-accent',
    buttonColor: 'bg-accent hover:bg-accent-hover text-white',
  },
};

const AmenityManager: React.FC<AmenityManagerProps> = ({
  amenityUsages,
  onBook,
  isAmenityAccessAllowed = true,
  amenityLimits = null,
}) => {
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'SPORTS' | 'RELAX'>('ALL');
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const getUsageForCurrentMonth = (amenity: AmenityType) => {
    return amenityUsages.filter((u) => {
      const usageDate = new Date(u.usageDate);
      return (
        u.amenity === amenity &&
        u.status === 'USED' && // Only count USED bookings towards the limit
        usageDate.getMonth() === currentMonth &&
        usageDate.getFullYear() === currentYear
      );
    }).length;
  };

  const amenityEntries = Object.entries(AMENITY_DETAILS).filter(([_, config]) => {
    if (activeCategory === 'SPORTS') return config.category === 'sports';
    if (activeCategory === 'RELAX') return config.category === 'relax';
    return true;
  });

  return (
    <div className="space-y-3.5">
      {/* ── Mobile Category Filter Tabs ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none">
        <button
          onClick={() => setActiveCategory('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer border ${
            activeCategory === 'ALL'
              ? 'bg-accent text-white border-accent'
              : 'bg-surface text-ink-soft hover:bg-surface-alt hover:text-ink border-brand-border'
          }`}
        >
          Tất cả (8)
        </button>
        <button
          onClick={() => setActiveCategory('SPORTS')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer border ${
            activeCategory === 'SPORTS'
              ? 'bg-accent text-white border-accent'
              : 'bg-surface text-ink-soft hover:bg-surface-alt hover:text-ink border-brand-border'
          }`}
        >
          Thể thao &amp; Giải trí (5)
        </button>
        <button
          onClick={() => setActiveCategory('RELAX')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer border ${
            activeCategory === 'RELAX'
              ? 'bg-accent text-white border-accent'
              : 'bg-surface text-ink-soft hover:bg-surface-alt hover:text-ink border-brand-border'
          }`}
        >
          Thư giãn &amp; Nghỉ dưỡng (3)
        </button>
      </div>

      {/* ── Amenity Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {amenityEntries.map(([type, config]) => {
          const amenityType = type as AmenityType;
          const usageCount = getUsageForCurrentMonth(amenityType);

          // Dynamic limit from DB if available, otherwise fall back
          const dbLimit = amenityLimits?.[amenityType]?.monthlyLimit;
          const effectiveLimit =
            dbLimit !== undefined && dbLimit !== null
              ? dbLimit <= 0
                ? null // -1 or 0 = unlimited
                : dbLimit
              : config.limit;

          const isLimited = effectiveLimit !== null;
          const isLimitReached = isLimited && usageCount >= effectiveLimit!;
          const remaining = isLimited ? Math.max(0, effectiveLimit! - usageCount) : null;
          const progress = isLimited ? Math.min((usageCount / effectiveLimit!) * 100, 100) : 0;

          return (
            <div
              key={amenityType}
              onClick={() => {
                if (!isLimitReached && isAmenityAccessAllowed) {
                  onBook(amenityType);
                }
              }}
              className={`group relative rounded-xl p-4 sm:p-5 bg-surface border border-brand-border shadow-xs hover:border-accent/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer`}
            >
              {/* Header: Row 1 (Icon & Badge), Row 2 (Full-Width Title) */}
              <div>
                {/* Row 1: Icon on left, Quota Badge on right */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${config.accentColor}`}>
                    <config.icon className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>

                  {/* Quota Badge */}
                  <div>
                    {isLimited ? (
                      isLimitReached ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-brand-danger-soft text-brand-danger border border-brand-danger/25 whitespace-nowrap">
                          Hết lượt
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-brand-success-soft text-brand-success border border-brand-success/25 whitespace-nowrap">
                          Còn {remaining}/{effectiveLimit}
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-brand-teal-soft text-brand-teal border border-brand-teal/25 whitespace-nowrap">
                        Vô hạn
                      </span>
                    )}
                  </div>
                </div>

                {/* Row 2: Full-width Title & Subtitle */}
                <div className="mb-2">
                  <h4 className="text-base font-bold text-ink leading-tight truncate" title={config.name}>
                    {config.name}
                  </h4>
                  <p className="text-xs text-ink-soft mt-0.5 truncate">
                    {config.category === 'sports' ? 'Thể thao đẳng cấp' : 'Nghỉ dưỡng & thư giãn'}
                  </p>
                </div>

                {/* Row 3: Progress Bar or Unlimited Subtitle */}
                <div className="my-2 pt-1">
                  {isLimited ? (
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold mb-1">
                        <span className="text-ink-soft text-[11px]">Đã sử dụng</span>
                        <span className={`text-xs font-bold ${isLimitReached ? 'text-brand-danger' : 'text-ink'}`}>
                          {usageCount} / {effectiveLimit} lượt
                        </span>
                      </div>
                      <div className="w-full bg-surface-alt rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isLimitReached ? 'bg-brand-danger' : config.progressBar
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 py-1 text-xs text-brand-teal font-medium">
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      <span>Không giới hạn lượt sử dụng</span>
                    </div>
                  )}
                </div>
              </div>


              {/* Touch-Friendly Action Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isLimitReached && isAmenityAccessAllowed) {
                    onBook(amenityType);
                  }
                }}
                disabled={isLimitReached || !isAmenityAccessAllowed}
                className={`mt-2.5 w-full py-2.5 px-4 text-xs sm:text-sm font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                  !isAmenityAccessAllowed
                    ? 'bg-surface-alt text-ink-faint cursor-not-allowed'
                    : isLimitReached
                    ? 'bg-brand-danger-soft text-brand-danger border border-brand-danger/25 cursor-not-allowed'
                    : `${config.buttonColor} cursor-pointer`
                }`}
              >
                {!isAmenityAccessAllowed ? (
                  <>
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    <span>Bị Chặn Quyền</span>
                  </>
                ) : isLimitReached ? (
                  <>
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    <span>Đã Dùng Hết Lượt</span>
                  </>
                ) : (
                  <>
                    <CalendarIcon className="w-4 h-4" />
                    <span>Đặt Lịch Ngay</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AmenityManager;

