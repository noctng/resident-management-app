import React, { useState, useEffect, useCallback } from 'react';
import { FeeConfig } from '../types';
import { formatDate } from '../utils/formatters';
import { api } from '../services/api';
import {
  BriefcaseIcon,
  WifiIcon,
  TvIcon,
  TruckIcon,
  ShieldCheckIcon,
  SparklesIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  PencilIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserIcon,
} from '../components/icons';
import { StatCard } from '../components/ui/Card';

export default function FeeConfigPage() {
  const [currentConfig, setCurrentConfig] = useState<FeeConfig | null>(null);
  const [configHistory, setConfigHistory] = useState<FeeConfig[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    management_fee_per_sqm: 15000,
    internet_fee: 100000,
    cable_tv_fee: 50000,
    security_fee: 50000,
    cleaning_fee: 30000,
    parking_car_fee: 1000000,
    parking_motorbike_fee: 70000,
    effective_from: new Date().toISOString().split('T')[0],
    enabled_fees: {
      management: true,
      internet: true,
      cable_tv: true,
      parking_car: true,
      parking_motorbike: true,
      security: true,
      cleaning: true,
    },
  });

  const fetchCurrentConfig = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<any>('/fee-config/current');
      if (data) {
        setCurrentConfig(data);
        setFormData({
          management_fee_per_sqm: data.management_fee_per_sqm,
          internet_fee: data.internet_fee,
          cable_tv_fee: data.cable_tv_fee,
          security_fee: data.security_fee,
          cleaning_fee: data.cleaning_fee,
          parking_car_fee: data.parking_car_fee,
          parking_motorbike_fee: data.parking_motorbike_fee,
          effective_from: data.effective_from
            ? data.effective_from.split('T')[0]
            : new Date().toISOString().split('T')[0],
          enabled_fees: data.enabled_fees || {
            management: true,
            internet: true,
            cable_tv: true,
            parking_car: true,
            parking_motorbike: true,
            security: true,
            cleaning: true,
          },
        });
      }
    } catch (err) {
      console.error('Error fetching config:', err);
      setError('Không thể tải cấu hình phí');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConfigHistory = useCallback(async () => {
    try {
      const data = await api.get<FeeConfig[]>('/fee-config/history');
      if (data) {
        setConfigHistory(data);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  }, []);

  useEffect(() => {
    fetchCurrentConfig();
    fetchConfigHistory();
  }, [fetchCurrentConfig, fetchConfigHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      await api.post('/fee-config', formData);
      setSuccessMessage('Đã cập nhật cấu hình phí thành công!');
      setIsEditing(false);
      await fetchCurrentConfig();
      await fetchConfigHistory();
    } catch (err: any) {
      console.error('Error updating config:', err);
      setError(err?.message || 'Có lỗi xảy ra khi cập nhật');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const inputStyle =
    'block w-full rounded-xl border-brand-border shadow-sm focus:border-accent focus:ring-accent/30 sm:text-sm disabled:bg-surface-alt disabled:text-ink-faint pl-3 pr-12 py-2.5 transition-shadow';

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 animate-fade-in bg-bg/50 min-h-screen">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className=" font-seriftext-2xl font-bold text-ink flex items-center gap-3">
            <span className="p-2 bg-accent text-white rounded-xl">
              <CurrencyDollarIcon className="w-6 h-6" />
            </span>
            Cấu hình Phí Quản Lý & Dịch Vụ
          </h1>
          <p className="text-sm text-ink-soft mt-1 ml-1">
            Quản lý định mức phí quản lý, dịch vụ và các loại phí khác
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-surface text-ink border border-brand-border hover:border-accent hover:text-accent rounded-xl shadow-sm transition-all text-sm font-medium"
          >
            <PencilIcon className="w-4 h-4" />
            <span>Chỉnh sửa cấu hình</span>
          </button>
        )}
      </header>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="p-4 bg-brand-success-soft border border-brand-success/20 text-brand-success rounded-xl flex items-center gap-3 animate-slide-up shadow-sm">
          <CheckCircleIcon className="w-6 h-6 shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-brand-danger-soft border border-brand-danger/20 text-brand-danger rounded-xl flex items-center gap-3 animate-slide-up shadow-sm">
          <ExclamationTriangleIcon className="w-6 h-6 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Current Configuration Card */}
      <div className="bg-surface rounded-2xl shadow-sm border border-brand-border overflow-hidden transition-all duration-300">
        <div className="px-6 py-5 border-b border-brand-border bg-surface-alt/50 flex justify-between items-center backdrop-blur-sm">
          <h2 className="font-bold text-ink flex items-center gap-2">
            {isEditing ? (
              <>
                <PencilIcon className="w-5 h-5 text-accent" />
                Chỉnh sửa cấu hình
              </>
            ) : (
              <>
                <CurrencyDollarIcon className="w-5 h-5 text-accent" />
                Cấu hình hiện tại
              </>
            )}
          </h2>
          {isEditing && (
            <span className="text-xs font-bold text-accent-ink bg-accent-soft px-3 py-1 rounded-full border border-accent/30 uppercase tracking-wider animate-pulse">
              Đang chỉnh sửa mode
            </span>
          )}
        </div>

        <div className="p-6 md:p-8">
          {loading && !currentConfig ? (
            <div className="flex flex-col items-center justify-center py-12 text-ink-soft">
              <ArrowPathIcon className="w-10 h-10 animate-spin text-accent mb-4" />
              <p className="text-sm font-medium text-ink-soft">
                Đang tải cấu hình...
              </p>
            </div>
          ) : isEditing ? (
            // Edit Form
            <form onSubmit={handleSubmit} className="animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="space-y-6">
                  <h3 className="text-sm font-bold text-ink uppercase tracking-wider border-b border-brand-border pb-2">
                    Phí Quản lý & Tiện ích
                  </h3>

                  <div
                    className={`p-5 rounded-2xl border transition-all ${formData.enabled_fees.management ? 'bg-surface border-brand-border shadow-sm' : 'bg-surface-alt border-transparent opacity-60'}`}
                  >
                    <label className="flex items-center gap-3 mb-4 cursor-pointer">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.enabled_fees.management}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              enabled_fees: {
                                ...formData.enabled_fees,
                                management: e.target.checked,
                              },
                            })
                          }
                          className="w-5 h-5 text-accent rounded border-brand-border focus:ring-accent/30 focus:ring-offset-0 transition-colors"
                        />
                      </div>
                      <span className="text-base font-bold text-ink flex items-center gap-2">
                        <BriefcaseIcon className="w-5 h-5 text-ink-soft" />
                        Phí Quản Lý
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.management_fee_per_sqm}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            management_fee_per_sqm: Number(e.target.value),
                          })
                        }
                        className={inputStyle}
                        min="0"
                        required
                        disabled={!formData.enabled_fees.management}
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <span className="text-ink-soft font-medium text-sm">
                          đ/m²
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-5 rounded-2xl border transition-all ${formData.enabled_fees.internet ? 'bg-surface border-brand-border shadow-sm' : 'bg-surface-alt border-transparent opacity-60'}`}
                  >
                    <label className="flex items-center gap-3 mb-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enabled_fees.internet}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            enabled_fees: { ...formData.enabled_fees, internet: e.target.checked },
                          })
                        }
                        className="w-5 h-5 text-accent rounded border-brand-border focus:ring-accent/30 focus:ring-offset-0 transition-colors"
                      />
                      <span className="text-base font-bold text-ink flex items-center gap-2">
                        <WifiIcon className="w-5 h-5 text-ink-soft" />
                        Internet
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.internet_fee}
                        onChange={(e) =>
                          setFormData({ ...formData, internet_fee: Number(e.target.value) })
                        }
                        className={inputStyle}
                        min="0"
                        required
                        disabled={!formData.enabled_fees.internet}
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <span className="text-ink-soft font-medium text-sm">
                          đ/tháng
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-5 rounded-2xl border transition-all ${formData.enabled_fees.cable_tv ? 'bg-surface border-brand-border shadow-sm' : 'bg-surface-alt border-transparent opacity-60'}`}
                  >
                    <label className="flex items-center gap-3 mb-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enabled_fees.cable_tv}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            enabled_fees: { ...formData.enabled_fees, cable_tv: e.target.checked },
                          })
                        }
                        className="w-5 h-5 text-accent rounded border-brand-border focus:ring-accent/30 focus:ring-offset-0 transition-colors"
                      />
                      <span className="text-base font-bold text-ink flex items-center gap-2">
                        <TvIcon className="w-5 h-5 text-ink-soft" />
                        Truyền Hình
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.cable_tv_fee}
                        onChange={(e) =>
                          setFormData({ ...formData, cable_tv_fee: Number(e.target.value) })
                        }
                        className={inputStyle}
                        min="0"
                        required
                        disabled={!formData.enabled_fees.cable_tv}
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <span className="text-ink-soft font-medium text-sm">
                          đ/tháng
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-bold text-ink uppercase tracking-wider border-b border-brand-border pb-2">
                    Phí Gửi Xe
                  </h3>

                  <div
                    className={`p-5 rounded-2xl border transition-all ${formData.enabled_fees.parking_car ? 'bg-surface border-brand-border shadow-sm' : 'bg-surface-alt border-transparent opacity-60'}`}
                  >
                    <label className="flex items-center gap-3 mb-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enabled_fees.parking_car}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            enabled_fees: {
                              ...formData.enabled_fees,
                              parking_car: e.target.checked,
                            },
                          })
                        }
                        className="w-5 h-5 text-accent rounded border-brand-border focus:ring-accent/30 focus:ring-offset-0 transition-colors"
                      />
                      <span className="text-base font-bold text-ink flex items-center gap-2">
                        <TruckIcon className="w-5 h-5 text-ink-soft" />
                        Gửi Ô tô
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.parking_car_fee}
                        onChange={(e) =>
                          setFormData({ ...formData, parking_car_fee: Number(e.target.value) })
                        }
                        className={inputStyle}
                        min="0"
                        required
                        disabled={!formData.enabled_fees.parking_car}
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <span className="text-ink-soft font-medium text-sm">
                          đ/xe/tháng
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-5 rounded-2xl border transition-all ${formData.enabled_fees.parking_motorbike ? 'bg-surface border-brand-border shadow-sm' : 'bg-surface-alt border-transparent opacity-60'}`}
                  >
                    <label className="flex items-center gap-3 mb-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enabled_fees.parking_motorbike}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            enabled_fees: {
                              ...formData.enabled_fees,
                              parking_motorbike: e.target.checked,
                            },
                          })
                        }
                        className="w-5 h-5 text-accent rounded border-brand-border focus:ring-accent/30 focus:ring-offset-0 transition-colors"
                      />
                      <span className="text-base font-bold text-ink flex items-center gap-2">
                        <TruckIcon className="w-5 h-5 text-ink-soft" />
                        Gửi Xe Máy
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.parking_motorbike_fee}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            parking_motorbike_fee: Number(e.target.value),
                          })
                        }
                        className={inputStyle}
                        min="0"
                        required
                        disabled={!formData.enabled_fees.parking_motorbike}
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <span className="text-ink-soft font-medium text-sm">
                          đ/xe/tháng
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-bold text-ink uppercase tracking-wider border-b border-brand-border pb-2">
                    Dịch Vụ Khác & Hiệu Lực
                  </h3>

                  <div
                    className={`p-5 rounded-2xl border transition-all ${formData.enabled_fees.security ? 'bg-surface border-brand-border shadow-sm' : 'bg-surface-alt border-transparent opacity-60'}`}
                  >
                    <label className="flex items-center gap-3 mb-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enabled_fees.security}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            enabled_fees: { ...formData.enabled_fees, security: e.target.checked },
                          })
                        }
                        className="w-5 h-5 text-accent rounded border-brand-border focus:ring-accent/30 focus:ring-offset-0 transition-colors"
                      />
                      <span className="text-base font-bold text-ink flex items-center gap-2">
                        <ShieldCheckIcon className="w-5 h-5 text-ink-soft" />
                        An Ninh - Bảo Vệ
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.security_fee}
                        onChange={(e) =>
                          setFormData({ ...formData, security_fee: Number(e.target.value) })
                        }
                        className={inputStyle}
                        min="0"
                        required
                        disabled={!formData.enabled_fees.security}
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <span className="text-ink-soft font-medium text-sm">
                          đ/tháng
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-5 rounded-2xl border transition-all ${formData.enabled_fees.cleaning ? 'bg-surface border-brand-border shadow-sm' : 'bg-surface-alt border-transparent opacity-60'}`}
                  >
                    <label className="flex items-center gap-3 mb-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enabled_fees.cleaning}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            enabled_fees: { ...formData.enabled_fees, cleaning: e.target.checked },
                          })
                        }
                        className="w-5 h-5 text-accent rounded border-brand-border focus:ring-accent/30 focus:ring-offset-0 transition-colors"
                      />
                      <span className="text-base font-bold text-ink flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5 text-ink-soft" />
                        Vệ Sinh
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.cleaning_fee}
                        onChange={(e) =>
                          setFormData({ ...formData, cleaning_fee: Number(e.target.value) })
                        }
                        className={inputStyle}
                        min="0"
                        required
                        disabled={!formData.enabled_fees.cleaning}
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <span className="text-ink-soft font-medium text-sm">
                          đ/tháng
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-accent-soft/40 rounded-2xl border border-accent/30">
                    <label className="block text-sm font-bold text-accent-ink mb-3 flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5" />
                      Ngày bắt đầu áp dụng
                    </label>
                    <input
                      type="date"
                      value={formData.effective_from}
                      onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                      className="block w-full rounded-xl border-accent/40 shadow-sm focus:border-accent focus:ring-accent/30 sm:text-sm py-2.5 px-3 bg-surface"
                      required
                    />
                    <p className="text-xs text-accent-ink/80 mt-2">
                      Các thay đổi sẽ được áp dụng cho kỳ tính phí từ ngày này trở đi.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex gap-4 justify-end pt-6 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    if (currentConfig) {
                      setFormData({
                        management_fee_per_sqm: currentConfig.management_fee_per_sqm,
                        internet_fee: currentConfig.internet_fee,
                        cable_tv_fee: currentConfig.cable_tv_fee,
                        security_fee: currentConfig.security_fee,
                        cleaning_fee: currentConfig.cleaning_fee,
                        parking_car_fee: currentConfig.parking_car_fee,
                        parking_motorbike_fee: currentConfig.parking_motorbike_fee,
                        effective_from: currentConfig.effective_from.split('T')[0],
                        enabled_fees: {
                          management: currentConfig.enabled_fees?.management ?? true,
                          internet: currentConfig.enabled_fees?.internet ?? true,
                          cable_tv: currentConfig.enabled_fees?.cable_tv ?? true,
                          parking_car: currentConfig.enabled_fees?.parking_car ?? true,
                          parking_motorbike: currentConfig.enabled_fees?.parking_motorbike ?? true,
                          security: currentConfig.enabled_fees?.security ?? true,
                          cleaning: currentConfig.enabled_fees?.cleaning ?? true,
                        },
                      });
                    }
                  }}
                  className="px-6 py-2.5 bg-surface text-ink border border-brand-border rounded-xl hover:bg-surface-alt text-sm font-bold transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl shadow-md text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2 transform active:scale-95" aria-label="Đóng">
                  {loading ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-5 h-5" />
                      <span>Lưu thay đổi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            // Display Current Config
            <div>
              {currentConfig ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
                  <StatCard
            className="motion-safe:animate-fade-in-1 [animation-fill-mode:both]"

                    label="Phí Quản Lý"
                    subValue="Theo diện tích"
                    value={formatCurrency(currentConfig.management_fee_per_sqm)}
                    unit="đ/m²"
                    icon={BriefcaseIcon}
                    iconBg="bg-accent-soft"
                    iconColor="text-accent-ink"
                  />

                  <StatCard
            className="motion-safe:animate-fade-in-2 [animation-fill-mode:both]"

                    label="Internet"
                    subValue="Gói cơ bản"
                    value={formatCurrency(currentConfig.internet_fee)}
                    unit="đ/tháng"
                    icon={WifiIcon}
                    iconBg="bg-brand-teal-soft"
                    iconColor="text-brand-teal"
                  />

                  <StatCard
            className="motion-safe:animate-fade-in-3 [animation-fill-mode:both]"

                    label="Truyền Hình"
                    subValue="Gói tiêu chuẩn"
                    value={formatCurrency(currentConfig.cable_tv_fee)}
                    unit="đ/tháng"
                    icon={TvIcon}
                    iconBg="bg-brand-warning-soft"
                    iconColor="text-brand-warning"
                  />

                  <StatCard
            className="motion-safe:animate-fade-in-4 [animation-fill-mode:both]"

                    label="Gửi Xe Ô tô"
                    subValue="Vé tháng"
                    value={formatCurrency(currentConfig.parking_car_fee)}
                    unit="đ/xe"
                    icon={TruckIcon}
                    iconBg="bg-accent-soft"
                    iconColor="text-accent-ink"
                  />

                  <StatCard
            className="motion-safe:animate-fade-in-5 [animation-fill-mode:both]"

                    label="Gửi Xe Máy"
                    subValue="Vé tháng"
                    value={formatCurrency(currentConfig.parking_motorbike_fee)}
                    unit="đ/xe"
                    icon={TruckIcon}
                    iconBg="bg-brand-teal-soft"
                    iconColor="text-brand-teal"
                  />

                  <StatCard
            className="motion-safe:animate-fade-in-6 [animation-fill-mode:both]"

                    label="Bảo Vệ"
                    subValue="An ninh 24/7"
                    value={formatCurrency(currentConfig.security_fee)}
                    unit="đ/tháng"
                    icon={ShieldCheckIcon}
                    iconBg="bg-brand-warning-soft"
                    iconColor="text-brand-warning"
                  />

                  <StatCard
            className="motion-safe:animate-fade-in-1 [animation-fill-mode:both]"

                    label="Vệ Sinh"
                    subValue="Cảnh quan"
                    value={formatCurrency(currentConfig.cleaning_fee)}
                    unit="đ/tháng"
                    icon={SparklesIcon}
                    iconBg="bg-accent-soft"
                    iconColor="text-accent-ink"
                  />

                  {/* Effective Date */}
                  <div className="p-6 bg-surface-alt rounded-2xl border border-dashed border-brand-border flex flex-col justify-center items-center text-center transition-colors">
                    <p className="text-xs font-bold text-ink-soft uppercase tracking-widest mb-2">
                      Ngày hiệu lực
                    </p>
                    <div className="flex items-center gap-2 text-ink mb-1">
                      <CalendarIcon className="w-5 h-5 text-accent" />
                      <p className="text-xl font-bold">
                        {formatDate(currentConfig.effective_from)}
                      </p>
                    </div>
                    <p className="text-xs text-ink-soft">Đang áp dụng</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 bg-surface-alt rounded-2xl border border-dashed border-brand-border">
                  <CurrencyDollarIcon className="w-16 h-16 text-ink-faint mx-auto mb-4" />
                  <p className="text-ink-soft font-medium">
                    Chưa có cấu hình phí nào được thiết lập.
                  </p>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="mt-4 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Thiết lập ngay
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Configuration History */}
      <div className="bg-surface rounded-2xl shadow-sm border border-brand-border overflow-hidden">
        <div className="px-6 py-5 border-b border-brand-border bg-surface-alt/50 flex items-center gap-3">
          <ClockIcon className="w-5 h-5 text-ink-soft" />
          <h2 className="font-bold text-ink">Lịch Sử Thay Đổi</h2>
        </div>
        <div className="overflow-x-auto overflow-y-auto max-h-[50vh] relative">
          <table className="min-w-full divide-y divide-brand-border relative">
            <thead className="bg-surface-alt sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-ink-soft uppercase tracking-wider">
                  Ngày Áp Dụng
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-ink-soft uppercase tracking-wider">
                  Phí QL (m²)
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-ink-soft uppercase tracking-wider">
                  Internet
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-ink-soft uppercase tracking-wider">
                  Truyền Hình
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-ink-soft uppercase tracking-wider">
                  Xe Ô tô
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-ink-soft uppercase tracking-wider">
                  Xe Máy
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-ink-soft uppercase tracking-wider pl-8">
                  Người Tạo
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-brand-border">
              {configHistory.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-ink-soft"
                  >
                    Chưa có lịch sử thay đổi nào
                  </td>
                </tr>
              ) : (
                configHistory.map((config) => (
                  <tr
                    key={config.id}
                    className="hover:bg-surface-alt/60 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-accent">
                      {formatDate(config.effective_from)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-ink text-right font-mono tabular-nums">
                      {formatCurrency(config.management_fee_per_sqm)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-ink text-right font-mono tabular-nums">
                      {formatCurrency(config.internet_fee)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-ink text-right font-mono tabular-nums">
                      {formatCurrency(config.cable_tv_fee)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-ink text-right font-mono tabular-nums">
                      {formatCurrency(config.parking_car_fee)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-ink text-right font-mono tabular-nums">
                      {formatCurrency(config.parking_motorbike_fee)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-soft pl-8">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-surface-alt text-ink-soft border border-brand-border flex items-center justify-center text-xs font-bold">
                          {(config.created_by_username || 'S').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">
                          {config.created_by_username || 'System'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
