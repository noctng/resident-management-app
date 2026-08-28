import React, { useMemo } from 'react';
import { AmenityUsage, AmenityType } from '../types';
import type { AmenityLimitConfig } from './AmenityManager';
import {
  GolfFlagIcon,
  HorseshoeIcon,
  MuseumIcon,
  ZenTreeIcon,
  SaunaSteamIcon,
  ArcheryTargetIcon,
  DumbbellIcon,
  LotusIcon,
} from './icons';

interface AmenityStatsProps {
  amenityUsages: AmenityUsage[];
  amenityNames: Record<AmenityType, string>;
  onAmenityClick?: (amenity: AmenityType) => void;
  amenityLimits?: Record<string, AmenityLimitConfig> | null;
}

const AMENITY_ICONS: Record<AmenityType, React.FC<{ className?: string }>> = {
  GOLF_3D: GolfFlagIcon,
  HORSE_RIDING: HorseshoeIcon,
  MUSEUM: MuseumIcon,
  ZEN_GARDEN: ZenTreeIcon,
  SAUNA: SaunaSteamIcon,
  ARCHERY: ArcheryTargetIcon,
  GYM: DumbbellIcon,
  YOGA: LotusIcon,
};

// Hardcoded fallback limits (same as AmenityManager)
const FALLBACK_LIMITS: Partial<Record<AmenityType, number | null>> = {
  GOLF_3D: 8,
  HORSE_RIDING: 2,
  MUSEUM: 2,
  ZEN_GARDEN: null,
  SAUNA: 8,
  ARCHERY: 8,
  GYM: null,
  YOGA: null,
};

const AmenityStats: React.FC<AmenityStatsProps> = ({
  amenityUsages,
  amenityNames,
  onAmenityClick,
  amenityLimits = null,
}) => {
  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    const amenities = Object.keys(amenityNames) as AmenityType[];

    amenities.forEach((amenity) => {
      counts[amenity] = 0;
    });

    amenityUsages.forEach((usage) => {
      if (usage.status === 'USED') {
        if (counts[usage.amenity] !== undefined) {
          counts[usage.amenity]++;
        }
      }
    });

    return counts;
  }, [amenityUsages, amenityNames]);

  const getEffectiveLimit = (amenity: AmenityType): number | null => {
    const dbLimit = amenityLimits?.[amenity]?.monthlyLimit;
    if (dbLimit !== undefined && dbLimit !== null) {
      return dbLimit <= 0 ? null : dbLimit; // -1 or 0 = unlimited
    }
    return FALLBACK_LIMITS[amenity] ?? null;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
      {(Object.keys(amenityNames) as AmenityType[]).map((amenity) => {
        const used = stats[amenity] || 0;
        const limit = getEffectiveLimit(amenity);
        const isLimited = limit !== null;
        const isOverLimit = isLimited && used >= limit;

        return (
          <div
            key={amenity}
            onClick={() => onAmenityClick && onAmenityClick(amenity)}
            className={`bg-surface rounded-lg shadow p-3 flex flex-col items-center justify-center text-center space-y-2 transition-all duration-200 border border-transparent ${onAmenityClick ? 'cursor-pointer hover:shadow-md hover:border-accent/40' : ''}`}
          >
            <div className="p-2 rounded-full bg-surface-alt text-ink-soft">
              {React.createElement(AMENITY_ICONS[amenity], { className: 'w-7 h-7' })}
            </div>
            <div>
              <p
                className="text-xs font-medium text-ink-soft line-clamp-1"
                title={amenityNames[amenity]}
              >
                {amenityNames[amenity]}
              </p>
              {isLimited ? (
                <>
                  <p
                    className={`text-xl font-bold font-mono tabular-nums ${isOverLimit ? 'text-brand-danger' : 'text-ink'}`}
                  >
                    {used} <span className="text-sm font-normal text-ink-faint">/ {limit}</span>
                  </p>
                  {/* Progress bar */}
                  <div className="w-full bg-surface-alt rounded-full h-1.5 mt-1 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${isOverLimit ? 'bg-brand-danger' : 'bg-accent'}`}
                      style={{ width: `${Math.min((used / limit) * 100, 100)}%` }}
                    ></div>
                  </div>
                </>
              ) : (
                <p className="text-xl font-bold font-mono tabular-nums text-ink">{used}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AmenityStats;
