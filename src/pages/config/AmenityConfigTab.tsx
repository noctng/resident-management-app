import React from 'react';
import {
  TicketIcon,
  ExclamationTriangleIcon,
  GolfFlagIcon,
  HorseshoeIcon,
  MuseumIcon,
  ZenTreeIcon,
  SaunaSteamIcon,
  ArcheryTargetIcon,
  DumbbellIcon,
  LotusIcon,
} from '../../components/icons';
import { AMENITY_NAMES } from '../../constants/amenities';
import type { AmenityType } from '../../types';

interface AmenityLimitItem {
  monthlyLimit: number;
  description: string;
}

export type AmenityLimitsConfig = Record<AmenityType, AmenityLimitItem>;

const AMENITY_ICON_COMPONENTS: Record<AmenityType, React.FC<{ className?: string }>> = {
  GOLF_3D: GolfFlagIcon,
  HORSE_RIDING: HorseshoeIcon,
  MUSEUM: MuseumIcon,
  ZEN_GARDEN: ZenTreeIcon,
  SAUNA: SaunaSteamIcon,
  ARCHERY: ArcheryTargetIcon,
  GYM: DumbbellIcon,
  YOGA: LotusIcon,
};

interface AmenityConfigTabProps {
  amenityLimits: AmenityLimitsConfig;
  setAmenityLimits: React.Dispatch<React.SetStateAction<AmenityLimitsConfig | null>>;
  setIsAmenityDirty: (dirty: boolean) => void;
  setSaveMessage: (msg: string | null) => void;
}

export const AmenityConfigTab: React.FC<AmenityConfigTabProps> = ({
  amenityLimits,
  setAmenityLimits,
  setIsAmenityDirty,
  setSaveMessage,
}) => {
  if (!amenityLimits) return null;

  return (
    <div className="space-y-6 animate-slide-up">
      <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
        <h2 className="text-sm font-bold text-ink flex items-center gap-2">
          <TicketIcon className="w-5 h-5 text-accent" />
          Cấu hình Lượt Sử Dụng Tiện Ích
        </h2>
        <p className="text-sm text-ink-soft">
          Thiết lập số lượt sử dụng tối đa mỗi tháng cho từng tiện ích trong khu đô thị. Tích chọn{' '}
          <span className="font-semibold">"Không giới hạn"</span> hoặc đặt{' '}
          <span className="font-semibold">0</span> để bỏ giới hạn.
        </p>
        <div className="overflow-hidden rounded-xl border border-brand-border">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-surface-alt text-xs uppercase">
              <tr>
                <th className="px-6 py-3 text-ink-soft font-semibold">
                  Tiện ích
                </th>
                <th className="px-6 py-3 text-center text-ink-soft font-semibold">
                  Lượt / Tháng
                </th>
                <th className="px-6 py-3 text-center text-ink-soft font-semibold">
                  Không giới hạn
                </th>
                <th className="px-6 py-3 text-ink-soft font-semibold">
                  Ghi chú
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {(Object.keys(AMENITY_NAMES) as AmenityType[]).map((type) => {
                const IconComp = AMENITY_ICON_COMPONENTS[type];
                const isUnlimited = amenityLimits[type]?.monthlyLimit === -1;
                return (
                  <tr
                    key={type}
                    className="hover:bg-surface-alt/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-accent-soft text-accent-ink shrink-0">
                          <IconComp className="w-4 h-4" />
                        </span>
                        <span className="font-medium text-ink">
                          {AMENITY_NAMES[type]}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <input
                        type="number"
                        min={0}
                        disabled={isUnlimited}
                        value={isUnlimited ? '' : (amenityLimits[type]?.monthlyLimit ?? 0)}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setAmenityLimits((prev) => {
                            if (!prev) return prev;
                            return {
                              ...prev,
                              [type]: { ...prev[type], monthlyLimit: val },
                            };
                          });
                          setIsAmenityDirty(true);
                          setSaveMessage(null);
                        }}
                        placeholder={isUnlimited ? 'Vô hạn' : ''}
                        className={`w-24 px-3 py-2 text-center bg-surface-alt border border-brand-border rounded-lg text-sm text-ink font-mono placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors ${
                          isUnlimited ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      />
                    </td>
                    <td className="px-6 py-3 text-center">
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isUnlimited}
                          onChange={(e) => {
                            setAmenityLimits((prev) => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                [type]: {
                                  ...prev[type],
                                  monthlyLimit: e.target.checked ? -1 : 0,
                                },
                              };
                            });
                            setIsAmenityDirty(true);
                            setSaveMessage(null);
                          }}
                          className="w-4 h-4 accent-accent rounded cursor-pointer focus:ring-2 focus:ring-accent/40"
                        />
                        {isUnlimited && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-brand-teal-soft text-brand-teal text-xs font-semibold">
                            Vô hạn
                          </span>
                        )}
                      </label>
                    </td>
                    <td className="px-6 py-3">
                      <input
                        type="text"
                        value={amenityLimits[type]?.description ?? ''}
                        onChange={(e) => {
                          setAmenityLimits((prev) => {
                            if (!prev) return prev;
                            return {
                              ...prev,
                              [type]: { ...prev[type], description: e.target.value },
                            };
                          });
                          setIsAmenityDirty(true);
                          setSaveMessage(null);
                        }}
                        placeholder="VD: Tối đa 2 lượt/hộ, đặt trước 24h..."
                        className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-brand-warning-soft/60 border border-brand-warning/20 p-4 sm:p-5 rounded-xl">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-brand-warning mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-ink">Lưu ý</p>
            <p className="text-sm text-ink-soft mt-1">
              Giới hạn lượt sử dụng sẽ được tính theo tháng và áp dụng khi cư dân đặt lịch qua cổng
              thông tin. Đặt <span className="font-semibold">0</span> hoặc tích chọn{' '}
              <span className="font-semibold">"Không giới hạn"</span> nếu không muốn giới hạn số
              lượt cho tiện ích đó.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AmenityConfigTab;
