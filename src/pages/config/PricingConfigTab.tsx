import React from 'react';
import { CurrencyDollarIcon } from '../../components/icons';
import type { PricingConfig, FeeConfig } from '../../types';

interface PricingConfigTabProps {
  feeConfig: FeeConfig | null;
  setFeeConfig: React.Dispatch<React.SetStateAction<FeeConfig | null>>;
  setIsFeeConfigDirty: (dirty: boolean) => void;
  editableConfig: PricingConfig;
  handleInputChange: (path: (string | number)[], value: string | number) => void;
  inputStyle: string;
}

export const PricingConfigTab: React.FC<PricingConfigTabProps> = ({
  feeConfig,
  setFeeConfig,
  setIsFeeConfigDirty,
  editableConfig,
  handleInputChange,
  inputStyle,
}) => {
  const renderTierDescription = (tiers: any[], index: number, unit: string) => {
    const tier = tiers[index];
    if (tier.limit === null) {
      const prevTier = tiers[index - 1];
      return `Trên ${prevTier.limit} ${unit}`;
    }
    const start = index === 0 ? 0 : tiers[index - 1].limit;
    return `Từ ${start > 0 ? start + 1 : 1} - ${tier.limit} ${unit}`;
  };

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Tổng quan biểu phí */}
      <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
        <h2 className="text-sm font-bold text-ink flex items-center gap-2">
          <CurrencyDollarIcon className="w-5 h-5 text-accent" />
          Tổng Quan Biểu Phí Hiện Tại
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-surface-alt/60 border border-brand-border rounded-lg p-4">
            <div className="text-xs font-semibold text-ink-soft">Phí quản lý</div>
            <div className="text-2xl font-mono text-ink mt-1 tabular-nums">
              {(feeConfig?.management_fee_per_sqm ?? 0).toLocaleString('vi-VN')}
            </div>
            <div className="text-[11px] text-ink-soft mt-0.5">VNĐ / m² / tháng</div>
          </div>
          <div className="bg-surface-alt/60 border border-brand-border rounded-lg p-4">
            <div className="text-xs font-semibold text-ink-soft">Điện sinh hoạt (Bậc 1)</div>
            <div className="text-2xl font-mono text-ink mt-1 tabular-nums">
              {(editableConfig.residentialElectricity[0]?.rate ?? 0).toLocaleString('vi-VN')}
            </div>
            <div className="text-[11px] text-ink-soft mt-0.5">VNĐ / kWh</div>
          </div>
          <div className="bg-surface-alt/60 border border-brand-border rounded-lg p-4">
            <div className="text-xs font-semibold text-ink-soft">Nước sinh hoạt</div>
            <div className="text-2xl font-mono text-ink mt-1 tabular-nums">
              {editableConfig.water.residentialRate.toLocaleString('vi-VN')}
            </div>
            <div className="text-[11px] text-ink-soft mt-0.5">VNĐ / m³</div>
          </div>
          <div className="bg-surface-alt/60 border border-brand-border rounded-lg p-4">
            <div className="text-xs font-semibold text-ink-soft">VAT điện / nước</div>
            <div className="text-2xl font-mono text-ink mt-1 tabular-nums">
              {editableConfig.vat.electricity}% / {editableConfig.vat.water}%
            </div>
            <div className="text-[11px] text-ink-soft mt-0.5">Thuế suất GTGT</div>
          </div>
        </div>
      </section>

      {/* Management Fees Section */}
      {feeConfig && (
        <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <CurrencyDollarIcon className="w-5 h-5 text-accent" />
            Cấu hình Phí Quản Lý & Dịch Vụ
          </h2>
          <div className="overflow-hidden rounded-xl border border-brand-border">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-surface-alt text-xs uppercase">
                <tr>
                  <th className="px-6 py-3 text-ink-soft font-semibold">
                    Loại Phí
                  </th>
                  <th className="px-6 py-3 text-right text-ink-soft font-semibold">
                    Đơn giá (VNĐ)
                  </th>
                  <th className="px-6 py-3 text-ink-soft font-semibold">
                    Đơn vị tính
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                <tr className="hover:bg-surface-alt/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-ink">
                    Phí Quản Lý
                  </td>
                  <td className="px-6 py-3">
                    <input
                      type="number"
                      value={feeConfig.management_fee_per_sqm}
                      onChange={(e) => {
                        setFeeConfig({
                          ...feeConfig,
                          management_fee_per_sqm: Number(e.target.value),
                        });
                        setIsFeeConfigDirty(true);
                      }}
                      className={inputStyle}
                    />
                  </td>
                  <td className="px-6 py-4 text-ink-soft">/ m² / tháng</td>
                </tr>
                <tr className="hover:bg-surface-alt/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-ink">Internet</td>
                  <td className="px-6 py-3">
                    <input
                      type="number"
                      value={feeConfig.internet_fee}
                      onChange={(e) => {
                        setFeeConfig({ ...feeConfig, internet_fee: Number(e.target.value) });
                        setIsFeeConfigDirty(true);
                      }}
                      className={inputStyle}
                    />
                  </td>
                  <td className="px-6 py-4 text-ink-soft">/ hộ / tháng</td>
                </tr>
                <tr className="hover:bg-surface-alt/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-ink">
                    Truyền hình cáp
                  </td>
                  <td className="px-6 py-3">
                    <input
                      type="number"
                      value={feeConfig.cable_tv_fee}
                      onChange={(e) => {
                        setFeeConfig({ ...feeConfig, cable_tv_fee: Number(e.target.value) });
                        setIsFeeConfigDirty(true);
                      }}
                      className={inputStyle}
                    />
                  </td>
                  <td className="px-6 py-4 text-ink-soft">/ hộ / tháng</td>
                </tr>
                <tr className="hover:bg-surface-alt/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-ink">
                    Gửi xe Ô tô
                  </td>
                  <td className="px-6 py-3">
                    <input
                      type="number"
                      value={feeConfig.parking_car_fee}
                      onChange={(e) => {
                        setFeeConfig({ ...feeConfig, parking_car_fee: Number(e.target.value) });
                        setIsFeeConfigDirty(true);
                      }}
                      className={inputStyle}
                    />
                  </td>
                  <td className="px-6 py-4 text-ink-soft">/ xe / tháng</td>
                </tr>
                <tr className="hover:bg-surface-alt/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-ink">
                    Gửi xe Máy
                  </td>
                  <td className="px-6 py-3">
                    <input
                      type="number"
                      value={feeConfig.parking_motorbike_fee}
                      onChange={(e) => {
                        setFeeConfig({
                          ...feeConfig,
                          parking_motorbike_fee: Number(e.target.value),
                        });
                        setIsFeeConfigDirty(true);
                      }}
                      className={inputStyle}
                    />
                  </td>
                  <td className="px-6 py-4 text-ink-soft">/ xe / tháng</td>
                </tr>
                <tr className="hover:bg-surface-alt/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-ink">
                    Phí Bảo Vệ
                  </td>
                  <td className="px-6 py-3">
                    <input
                      type="number"
                      value={feeConfig.security_fee}
                      onChange={(e) => {
                        setFeeConfig({ ...feeConfig, security_fee: Number(e.target.value) });
                        setIsFeeConfigDirty(true);
                      }}
                      className={inputStyle}
                    />
                  </td>
                  <td className="px-6 py-4 text-ink-soft">/ hộ / tháng</td>
                </tr>
                <tr className="hover:bg-surface-alt/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-ink">
                    Phí Vệ Sinh
                  </td>
                  <td className="px-6 py-3">
                    <input
                      type="number"
                      value={feeConfig.cleaning_fee}
                      onChange={(e) => {
                        setFeeConfig({ ...feeConfig, cleaning_fee: Number(e.target.value) });
                        setIsFeeConfigDirty(true);
                      }}
                      className={inputStyle}
                    />
                  </td>
                  <td className="px-6 py-4 text-ink-soft">/ hộ / tháng</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Residential Electricity */}
      <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
        <h2 className="text-sm font-bold text-ink">
          Bảng giá Điện Sinh Hoạt (Bậc thang)
        </h2>
        <div className="overflow-hidden rounded-xl border border-brand-border">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-surface-alt text-xs uppercase">
              <tr>
                <th className="px-6 py-3 font-semibold text-ink-soft">Bậc</th>
                <th className="px-6 py-3 font-semibold text-ink-soft">
                  Mức sử dụng (kWh)
                </th>
                <th className="px-6 py-3 font-semibold text-ink-soft text-right">
                  Đơn giá (VND/kWh)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {editableConfig.residentialElectricity.map((tier, index) => (
                <tr
                  key={index}
                  className={`transition-colors hover:bg-surface-alt/50 ${
                    index > 0 ? 'bg-surface-alt/50' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-bg border border-brand-border text-xs font-semibold text-ink">
                      Bậc {index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-ink-soft">
                    {renderTierDescription(editableConfig.residentialElectricity, index, 'kWh')}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <input
                      type="number"
                      value={tier.rate}
                      onChange={(e) =>
                        handleInputChange(
                          ['residentialElectricity', index, 'rate'],
                          Number(e.target.value)
                        )
                      }
                      className={inputStyle}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Business Electricity */}
      <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
        <h2 className="text-sm font-bold text-ink">
          Bảng giá Điện Kinh Doanh
        </h2>
        <div className="overflow-hidden rounded-xl border border-brand-border">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-surface-alt text-xs uppercase">
              <tr>
                <th className="px-6 py-3 font-semibold text-ink-soft">
                  Khung giờ
                </th>
                <th className="px-6 py-3 font-semibold text-ink-soft text-right">
                  Đơn giá (VND/kWh)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              <tr className="hover:bg-surface-alt/50 transition-colors">
                <td className="px-6 py-4 font-medium text-ink">
                  Giờ bình thường
                </td>
                <td className="px-6 py-3 text-right">
                  <input
                    type="number"
                    value={editableConfig.businessElectricity.normalRate}
                    onChange={(e) =>
                      handleInputChange(
                        ['businessElectricity', 'normalRate'],
                        Number(e.target.value)
                      )
                    }
                    className={inputStyle}
                  />
                </td>
              </tr>
              <tr className="hover:bg-surface-alt/50 transition-colors">
                <td className="px-6 py-4 font-medium text-ink">
                  Giờ thấp điểm
                </td>
                <td className="px-6 py-3 text-right">
                  <input
                    type="number"
                    value={editableConfig.businessElectricity.offPeakRate}
                    onChange={(e) =>
                      handleInputChange(
                        ['businessElectricity', 'offPeakRate'],
                        Number(e.target.value)
                      )
                    }
                    className={inputStyle}
                  />
                </td>
              </tr>
              <tr className="hover:bg-surface-alt/50 transition-colors">
                <td className="px-6 py-4 font-medium text-ink">
                  Giờ cao điểm
                </td>
                <td className="px-6 py-3 text-right">
                  <input
                    type="number"
                    value={editableConfig.businessElectricity.peakRate}
                    onChange={(e) =>
                      handleInputChange(['businessElectricity', 'peakRate'], Number(e.target.value))
                    }
                    className={inputStyle}
                  />
                </td>
              </tr>
              <tr className="bg-brand-success-soft/40">
                <td className="px-6 py-4 font-semibold text-ink">
                  Giá trung bình
                </td>
                <td className="px-6 py-3 text-right">
                  <input
                    type="number"
                    value={editableConfig.businessElectricity.averageRate}
                    onChange={(e) =>
                      handleInputChange(
                        ['businessElectricity', 'averageRate'],
                        Number(e.target.value)
                      )
                    }
                    className={inputStyle}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Water */}
      <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
        <h2 className="text-sm font-bold text-ink">Đơn giá Nước</h2>
        <div className="overflow-hidden rounded-xl border border-brand-border">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-surface-alt text-xs uppercase">
              <tr>
                <th className="px-6 py-3 font-semibold text-ink-soft">
                  Loại hình
                </th>
                <th className="px-6 py-3 font-semibold text-ink-soft text-right">
                  Đơn giá (VND/m³)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              <tr className="hover:bg-surface-alt/50 transition-colors">
                <td className="px-6 py-4 font-medium text-brand-teal">
                  Sinh hoạt
                </td>
                <td className="px-6 py-3 text-right">
                  <input
                    type="number"
                    value={editableConfig.water.residentialRate}
                    onChange={(e) =>
                      handleInputChange(['water', 'residentialRate'], Number(e.target.value))
                    }
                    className={inputStyle}
                  />
                </td>
              </tr>
              <tr className="hover:bg-surface-alt/50 transition-colors">
                <td className="px-6 py-4 font-medium text-accent">
                  Kinh doanh
                </td>
                <td className="px-6 py-3 text-right">
                  <input
                    type="number"
                    value={editableConfig.water.businessRate}
                    onChange={(e) =>
                      handleInputChange(['water', 'businessRate'], Number(e.target.value))
                    }
                    className={inputStyle}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* VAT */}
      <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
        <h2 className="text-sm font-bold text-ink">
          Thuế suất thuế GTGT (VAT)
        </h2>
        <div className="overflow-hidden rounded-xl border border-brand-border">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-surface-alt text-xs uppercase">
              <tr>
                <th className="px-6 py-3 font-semibold text-ink-soft">Loại</th>
                <th className="px-6 py-3 font-semibold text-ink-soft text-right">
                  Thuế suất (%)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              <tr className="hover:bg-surface-alt/50 transition-colors">
                <td className="px-6 py-4 font-medium text-accent">Điện</td>
                <td className="px-6 py-3 text-right">
                  <input
                    type="number"
                    value={editableConfig.vat.electricity}
                    onChange={(e) =>
                      handleInputChange(['vat', 'electricity'], Number(e.target.value))
                    }
                    className={inputStyle}
                  />
                </td>
              </tr>
              <tr className="hover:bg-surface-alt/50 transition-colors">
                <td className="px-6 py-4 font-medium text-brand-teal">Nước</td>
                <td className="px-6 py-3 text-right">
                  <input
                    type="number"
                    value={editableConfig.vat.water}
                    onChange={(e) => handleInputChange(['vat', 'water'], Number(e.target.value))}
                    className={inputStyle}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default PricingConfigTab;
