import React, { useState, useEffect, useCallback } from 'react';
import type { PricingConfig, User, PricingHistory, FeeConfig } from '../types';
import { api } from '../services/api';
import { useConfirm } from '../components/ui';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SwatchIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  QrCodeIcon,
  ArrowPathIcon,
  TicketIcon,
  BanknotesIcon,
  CalculatorIcon,
  CpuChipIcon,
  DocumentChartBarIcon,
} from '../components/icons';
import EmailConfigTab from './config/EmailConfigTab';
import TemplateConfigTab from './config/TemplateConfigTab';
import QRConfigTab from './config/QRConfigTab';
import AmenityConfigTab, { type AmenityLimitsConfig } from './config/AmenityConfigTab';
import AIConfigTab from './config/AIConfigTab';
import PricingConfigTab from './config/PricingConfigTab';
import SePayConfigTab, { type SePayConfigData } from './config/SePayConfigTab';
import VnptInvoiceConfigTab, { type VnptInvoiceConfigData } from './config/VnptInvoiceConfigTab';
import HandbookConfigTab from './config/HandbookConfigTab';

interface ConfigurationPageProps {
  onBack: () => void;
  currentUser: User | null;
}

type ConfigTabKey =
  | 'pricing'
  | 'email'
  | 'templates'
  | 'qr'
  | 'sepay'
  | 'vnpt'
  | 'amenities'
  | 'ai'
  | 'handbook';

const TABS: { id: ConfigTabKey; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'pricing', label: 'Bảng giá & Phí', Icon: CalculatorIcon },
  { id: 'email', label: 'Email & Hệ thống', Icon: EnvelopeIcon },
  { id: 'templates', label: 'Mẫu Email', Icon: SwatchIcon },
  { id: 'qr', label: 'QR Thanh toán', Icon: QrCodeIcon },
  { id: 'sepay', label: 'Webhook SePay', Icon: BanknotesIcon },
  { id: 'vnpt', label: 'HĐĐT VNPT', Icon: DocumentTextIcon },
  { id: 'amenities', label: 'Tiện ích', Icon: TicketIcon },
  { id: 'ai', label: 'AI Phân tích', Icon: CpuChipIcon },
  { id: 'handbook', label: 'Sổ Tay Cư Dân', Icon: DocumentChartBarIcon },
];

const ConfigurationPage: React.FC<ConfigurationPageProps> = ({ onBack, currentUser }) => {
  const [originalConfig, setOriginalConfig] = useState<PricingConfig | null>(null);
  const [editableConfig, setEditableConfig] = useState<PricingConfig | null>(null);
  const [history, setHistory] = useState<PricingHistory[]>([]);
  const [, setViewingHistoryItem] = useState<PricingHistory | null>(null);

  const [emailConfig, setEmailConfig] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<ConfigTabKey>('pricing');

  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  const [qrConfig, setQrConfig] = useState<any>(null);
  const [feeConfig, setFeeConfig] = useState<FeeConfig | null>(null);
  const [amenityLimits, setAmenityLimits] = useState<AmenityLimitsConfig | null>(null);
  const [aiConfig, setAiConfig] = useState<{
    AI_BASE_URL: string;
    AI_API_KEY: string;
    AI_MODEL: string;
    AI_HAS_KEY?: boolean;
  }>({
    AI_BASE_URL: '',
    AI_API_KEY: '',
    AI_MODEL: 'gpt-4o',
  });

  const [sepayConfig, setSepayConfig] = useState<SePayConfigData>({
    SEPAY_ENABLED: true,
    SEPAY_API_KEY: '',
    SEPAY_WEBHOOK_URL: '',
    SEPAY_WEBHOOK_SECRET: '',
    SEPAY_BANK_ACCOUNT: '',
    SEPAY_BANK_NAME: '',
    SEPAY_AUTO_MATCH_UTILITY: true,
    SEPAY_AUTO_MATCH_UNIFIED: true,
    SEPAY_AUTO_MATCH_MANAGEMENT: true,
    SEPAY_SYNTAX_PREFIX: 'CAN,EW,UB,HD',
  });

  const [vnptConfig, setVnptConfig] = useState<VnptInvoiceConfigData>({
    VNPT_SERVICE_URL: 'https://demo-tt78.vnpt-invoice.com.vn/BusinessService.asmx',
    VNPT_SERVICE_USERNAME: '',
    VNPT_SERVICE_PASSWORD: '',
    VNPT_ADMIN_ACCOUNT: '',
    VNPT_ADMIN_PASSWORD: '',
    VNPT_PATTERN: '1/001',
    VNPT_SERIAL: 'C26TAA',
    VNPT_CONVERT: 0,
    VNPT_AUTO_ISSUE_ENABLED: false,
    VNPT_AUTO_ISSUE_UTILITY: true,
    VNPT_AUTO_ISSUE_UNIFIED: true,
    VNPT_AUTO_ISSUE_MANAGEMENT: true,
    VNPT_AUTO_CONFIRM_PAYMENT: true,
    VNPT_SELLER_NAME: 'BAN QUẢN LÝ KHU ĐÔ THỊ THÀNH PHỐ CÀ PHÊ',
    VNPT_SELLER_TAX_CODE: '',
    VNPT_SELLER_ADDRESS: 'Đường Nguyễn Đình Chiểu, P. Tân Lợi, TP. Buôn Ma Thuột, Đắk Lắk',
    VNPT_SELLER_PHONE: '0262 3999 888',
    VNPT_SELLER_EMAIL: 'info@thanhphocaphe.vn',
    VNPT_SELLER_BANK_ACCOUNT: '',
    VNPT_SELLER_BANK_NAME: '',
  });

  const [isDirty, setIsDirty] = useState(false);
  const [isEmailDirty, setIsEmailDirty] = useState(false);
  const [isQRDirty, setIsQRDirty] = useState(false);
  const [isFeeConfigDirty, setIsFeeConfigDirty] = useState(false);
  const [isAmenityDirty, setIsAmenityDirty] = useState(false);
  const [isAIDirty, setIsAIDirty] = useState(false);
  const [isSepayDirty, setIsSepayDirty] = useState(false);
  const [isVnptDirty, setIsVnptDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { confirm } = useConfirm();
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fetchEmailConfig = useCallback(async () => {
    try {
      const data = await api.get<any>('/config/email');
      if (data) setEmailConfig(data);
    } catch (e) {
      console.error('Failed to load email config', e);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await api.get<any[]>('/config/templates');
      if (data) setTemplates(data);
    } catch (e) {
      console.error('Failed to load email templates', e);
    }
  }, []);

  const fetchQRConfig = useCallback(async () => {
    try {
      const data = await api.get<any>('/config/qr');
      if (data) setQrConfig(data);
    } catch (e) {
      console.error('Failed to load QR config', e);
    }
  }, []);

  const fetchFeeConfig = useCallback(async () => {
    try {
      const data = await api.get<FeeConfig>('/fee-config/current');
      if (data) setFeeConfig(data);
    } catch (e) {
      console.error('Failed to load fee config', e);
    }
  }, []);

  const fetchAmenityLimits = useCallback(async () => {
    try {
      const data = await api.get<AmenityLimitsConfig>('/config/amenity-limits');
      if (data) setAmenityLimits(data);
    } catch (e) {
      console.error('Failed to load amenity limits', e);
    }
  }, []);

  const fetchAIConfig = useCallback(async () => {
    try {
      const data = await api.get<any>('/config/ai');
      if (data) {
        setAiConfig({
          AI_BASE_URL: data.AI_BASE_URL || '',
          AI_API_KEY: data.AI_HAS_KEY ? '********' : '',
          AI_MODEL: data.AI_MODEL || 'gpt-4o',
          AI_HAS_KEY: data.AI_HAS_KEY,
        });
      }
    } catch (e) {
      console.error('Failed to load AI config', e);
    }
  }, []);

  const fetchSepayConfig = useCallback(async () => {
    try {
      const data = await api.get<any>('/config/sepay');
      if (data) {
        setSepayConfig((prev) => ({ ...prev, ...data }));
      }
    } catch (e) {
      // Load from local storage fallback
      try {
        const saved = localStorage.getItem('sepay_config');
        if (saved) setSepayConfig(JSON.parse(saved));
      } catch {}
      console.error('Failed to load SePay config', e);
    }
  }, []);

  const fetchVnptConfig = useCallback(async () => {
    try {
      const data = await api.get<any>('/vnpt-invoice/config');
      if (data) {
        setVnptConfig((prev) => ({ ...prev, ...data }));
      }
    } catch (e) {
      console.error('Failed to load VNPT config', e);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await Promise.all([
        fetchEmailConfig(),
        fetchTemplates(),
        fetchQRConfig(),
        fetchFeeConfig(),
        fetchAmenityLimits(),
        fetchAIConfig(),
        fetchSepayConfig(),
        fetchVnptConfig(),
      ]);
      const data = await api.get<PricingConfig>('/config/pricing');
      setOriginalConfig(data);
      setEditableConfig(JSON.parse(JSON.stringify(data)));
    } catch (err: any) {
      setError(err?.message || 'Không thể tải dữ liệu cấu hình.');
    } finally {
      setIsLoading(false);
    }
  }, [
    fetchEmailConfig,
    fetchQRConfig,
    fetchFeeConfig,
    fetchTemplates,
    fetchAmenityLimits,
    fetchAIConfig,
    fetchSepayConfig,
    fetchVnptConfig,
  ]);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await api.get<PricingHistory[]>('/config/pricing/history');
      if (data) setHistory(data);
    } catch (err) {
      console.error('Error fetching pricing history:', err);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchHistory();
  }, [fetchConfig, fetchHistory]);

  const handleInputChange = (path: (string | number)[], value: string | number) => {
    setEditableConfig((prevConfig) => {
      if (!prevConfig) return null;
      const newConfig = JSON.parse(JSON.stringify(prevConfig));
      let current: any = newConfig;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      setIsDirty(true);
      setSaveMessage(null);
      return newConfig;
    });
  };

  const handleReset = () => {
    setEditableConfig(JSON.parse(JSON.stringify(originalConfig)));
    setIsDirty(false);
    setIsEmailDirty(false);
    setIsQRDirty(false);
    setIsFeeConfigDirty(false);
    setIsAmenityDirty(false);
    setIsAIDirty(false);
    setIsSepayDirty(false);
    setIsVnptDirty(false);
    setSaveMessage(null);
    setError(null);
    fetchAmenityLimits();
    fetchSepayConfig();
    fetchVnptConfig();
  };

  const handleSaveEmail = async () => {
    setIsSaving(true);
    try {
      await api.post('/config/email', emailConfig);
      setSaveMessage('Đã lưu cấu hình email.');
      setIsEmailDirty(false);
    } catch (e: any) {
      setError(e.message || 'Lưu cấu hình email thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;
    setIsSaving(true);
    try {
      await api.put(`/config/templates/${selectedTemplate.code}`, {
        subject: selectedTemplate.subject,
        body: selectedTemplate.body,
      });
      setSaveMessage('Đã cập nhật mẫu email.');
      await fetchTemplates();
    } catch (e: any) {
      setError(e.message || 'Cập nhật mẫu email thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveQR = async () => {
    setIsSaving(true);
    try {
      await api.post('/config/qr', qrConfig);
      setSaveMessage('Đã lưu cấu hình QR Code thanh toán.');
      setIsQRDirty(false);
    } catch (e: any) {
      setError(e.message || 'Lưu cấu hình QR thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAmenityLimits = async () => {
    if (!amenityLimits) return;
    setIsSaving(true);
    try {
      await api.put('/config/amenity-limits', amenityLimits);
      setSaveMessage('Đã lưu cấu hình lượt sử dụng tiện ích.');
      setIsAmenityDirty(false);
    } catch (e: any) {
      setError(e.message || 'Lưu cấu hình tiện ích thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAI = async () => {
    setIsSaving(true);
    try {
      await api.put('/config/ai', aiConfig);
      setSaveMessage('Đã lưu cấu hình AI phân tích đồng hồ.');
      setIsAIDirty(false);
      await fetchAIConfig();
    } catch (e: any) {
      setError(e.message || 'Lưu cấu hình AI thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSepay = async () => {
    setIsSaving(true);
    try {
      await api.post('/config/sepay', sepayConfig);
      setSaveMessage('Đã lưu cấu hình SePay Webhooks thành công.');
      setIsSepayDirty(false);
    } catch {
      try {
        localStorage.setItem('sepay_config', JSON.stringify(sepayConfig));
      } catch {}
      setSaveMessage('Đã lưu cấu hình SePay.');
      setIsSepayDirty(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveVnpt = async () => {
    setIsSaving(true);
    try {
      await api.post('/vnpt-invoice/config', vnptConfig);
      setSaveMessage('Đã lưu cấu hình Hóa đơn điện tử VNPT.');
      setIsVnptDirty(false);
    } catch (e: any) {
      setError(e.message || 'Lưu cấu hình VNPT thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (activeTab === 'email') {
      await handleSaveEmail();
      return;
    }
    if (activeTab === 'templates') {
      await handleSaveTemplate();
      return;
    }
    if (activeTab === 'qr') {
      await handleSaveQR();
      return;
    }
    if (activeTab === 'sepay') {
      await handleSaveSepay();
      return;
    }
    if (activeTab === 'vnpt') {
      await handleSaveVnpt();
      return;
    }
    if (activeTab === 'amenities') {
      await handleSaveAmenityLimits();
      return;
    }
    if (activeTab === 'ai') {
      await handleSaveAI();
      return;
    }

    if (activeTab === 'pricing') {
      if (!editableConfig || !currentUser) return;

      if (isDirty) {
        if (
          !(await confirm({
            title: 'Xác nhận lưu thay đổi đơn giá',
            description:
              'Thay đổi chỉ áp dụng cho các kỳ tính tiền MỚI từ tháng này trở đi. Các kỳ cũ đã tính tiền sẽ KHÔNG bị ảnh hưởng.',
            variant: 'primary',
            confirmLabel: 'Lưu',
          }))
        )
          return;
      }

      setIsSaving(true);
      setError(null);
      setSaveMessage(null);

      try {
        if (isDirty) {
          await api.put('/config/pricing', { config: editableConfig, userId: currentUser.id });
        }

        if (isFeeConfigDirty && feeConfig) {
          await api.post('/fee-config', feeConfig);
        }

        if (isDirty || isFeeConfigDirty) {
          setSaveMessage('Đã lưu các thay đổi thành công.');
          setIsDirty(false);
          setIsFeeConfigDirty(false);
          await fetchConfig();
        } else {
          setSaveMessage('Không có thay đổi nào để lưu.');
        }
      } catch (e: any) {
        setError(e?.message || 'Có lỗi xảy ra khi lưu cấu hình');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const inputStyle =
    'w-full px-3 py-2 text-right bg-surface-alt border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent font-mono transition-shadow';

  const isSaveDisabled =
    (!isDirty &&
      !isEmailDirty &&
      !isQRDirty &&
      !isFeeConfigDirty &&
      !isAmenityDirty &&
      !isAIDirty &&
      !isSepayDirty &&
      !isVnptDirty) ||
    isSaving;

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 bg-surface rounded-xl hover:bg-surface-alt text-ink-soft hover:text-accent transition-colors shadow-sm border border-brand-border cursor-pointer"
            aria-label="Quay lại"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-ink">Cấu hình hệ thống</h1>
            <p className="text-xs text-ink-soft mt-0.5">
              Quản lý định mức phí, email, tài khoản QR, SePay Webhooks, HĐĐT VNPT và kết nối AI
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={isSaveDisabled}
            className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl hover:bg-surface-alt disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm font-medium transition-colors cursor-pointer"
          >
            Hoàn tác
          </button>
          <button
            onClick={handleSave}
            disabled={isSaveDisabled}
            className="flex items-center gap-2 px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm font-medium transition-colors cursor-pointer" aria-label="Đóng">
            {isSaving ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircleIcon className="w-4 h-4" />
            )}
            {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
          </button>
        </div>
      </div>

      {/* Horizontal Tabs Bar (Dạng ngang theo hình mẫu) */}
      <div className="bg-surface rounded-2xl border border-brand-border shadow-xs overflow-hidden">
        <div className="flex items-center gap-1 px-3 pt-2 overflow-x-auto border-b border-brand-border scrollbar-none bg-surface">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer border-b-2 -mb-[1px] ${
                  isActive
                    ? 'border-accent text-accent bg-accent-soft/30 rounded-t-lg'
                    : 'border-transparent text-ink-soft hover:text-ink hover:border-brand-border/60 hover:bg-surface-alt/40 rounded-t-lg'
                }`}
              >
                <tab.Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-accent' : 'text-ink-soft'
                  }`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="p-4 bg-brand-danger-soft border border-brand-danger/20 rounded-xl flex items-center gap-3 text-brand-danger animate-fade-in text-sm">
          <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
          <span>{error}</span>
          </div>
        )}
        {saveMessage && (
          <div className="p-4 bg-brand-success-soft border border-brand-success/20 rounded-xl flex items-center gap-3 text-brand-success animate-fade-in text-sm">
            <CheckCircleIcon className="w-5 h-5 shrink-0" />
            <span>{saveMessage}</span>
          </div>
        )}

        {/* Main Grid */}
        <main className="grid grid-cols-1 xl:grid-cols-4 gap-6 pb-8">
          <div className="xl:col-span-3 space-y-6 min-w-0">
            {isLoading && (
              <div className="flex flex-col items-center justify-center p-12 bg-surface rounded-xl shadow-sm border border-brand-border">
                <ArrowPathIcon className="w-8 h-8 text-accent animate-spin mb-3" />
                <p className="text-ink-soft text-sm">Đang tải cấu hình...</p>
              </div>
            )}

            {!isLoading && (
              <div className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-6 space-y-6">
                {activeTab === 'pricing' && editableConfig && (
                  <PricingConfigTab
                    feeConfig={feeConfig}
                    setFeeConfig={setFeeConfig}
                    setIsFeeConfigDirty={setIsFeeConfigDirty}
                    editableConfig={editableConfig}
                    handleInputChange={handleInputChange}
                    inputStyle={inputStyle}
                  />
                )}

                {activeTab === 'email' && emailConfig && (
                  <EmailConfigTab
                    emailConfig={emailConfig}
                    setEmailConfig={setEmailConfig}
                    setIsEmailDirty={setIsEmailDirty}
                    n8nWebhookUrl={editableConfig?.n8nWebhookUrl || ''}
                    onN8nWebhookChange={(url) => handleInputChange(['n8nWebhookUrl'], url)}
                  />
                )}

                {activeTab === 'templates' && (
                  <TemplateConfigTab
                    templates={templates}
                    selectedTemplate={selectedTemplate}
                    setSelectedTemplate={setSelectedTemplate}
                    setIsDirty={setIsDirty}
                    setError={setError}
                    setSaveMessage={setSaveMessage}
                  />
                )}

                {activeTab === 'qr' && qrConfig && (
                  <QRConfigTab
                    qrConfig={qrConfig}
                    setQrConfig={setQrConfig}
                    setIsQRDirty={setIsQRDirty}
                  />
                )}

                {activeTab === 'sepay' && (
                  <SePayConfigTab
                    sepayConfig={sepayConfig}
                    setSepayConfig={setSepayConfig}
                    setIsSepayDirty={setIsSepayDirty}
                    setSaveMessage={setSaveMessage}
                  />
                )}

                {activeTab === 'vnpt' && (
                  <VnptInvoiceConfigTab
                    vnptConfig={vnptConfig}
                    setVnptConfig={setVnptConfig}
                    setIsVnptDirty={setIsVnptDirty}
                    setSaveMessage={setSaveMessage}
                  />
                )}

                {activeTab === 'amenities' && amenityLimits && (
                  <AmenityConfigTab
                    amenityLimits={amenityLimits}
                    setAmenityLimits={setAmenityLimits}
                    setIsAmenityDirty={setIsAmenityDirty}
                    setSaveMessage={setSaveMessage}
                  />
                )}

                {activeTab === 'ai' && (
                  <AIConfigTab
                    aiConfig={aiConfig}
                    setAiConfig={setAiConfig}
                    setIsAIDirty={setIsAIDirty}
                    setSaveMessage={setSaveMessage}
                  />
                )}

                {activeTab === 'handbook' && <HandbookConfigTab />}
              </div>
            )}
          </div>

          {/* History Sidebar — rail hẹp */}
          <aside className="space-y-4">
            <div className="bg-surface rounded-xl shadow-sm border border-brand-border p-4">
              <h2 className="text-sm font-bold text-ink mb-3">Lịch sử Thay đổi</h2>
              {history.length === 0 ? (
                <div className="text-center py-8 bg-surface-alt rounded-xl">
                  <p className="text-xs text-ink-soft">Chưa có lịch sử thay đổi nào.</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-brand-border"></div>
                  <ul className="space-y-4 relative">
                    {history.slice(0, 5).map((item) => (
                      <li key={item.id} className="pl-6 relative">
                        <div className="absolute left-0 top-1 w-2.5 h-2.5 rounded-full bg-accent-soft border-2 border-accent z-10"></div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-ink whitespace-nowrap">
                            {new Date(item.changed_at).toLocaleDateString('vi-VN')}
                            <span className="text-ink-soft font-normal mx-1">•</span>
                            {new Date(item.changed_at).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <p className="text-[11px] text-ink-soft mt-0.5 truncate">
                            Bởi:{' '}
                            <span className="font-medium text-ink">
                              {item.changed_by_username || 'Admin'}
                            </span>
                          </p>
                          <button
                            onClick={() => setViewingHistoryItem(item)}
                            className="mt-1 text-[11px] font-medium text-accent hover:text-accent-hover transition-colors cursor-pointer"
                          >
                            Xem chi tiết
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {history.length > 5 && (
                    <button className="w-full text-center text-[11px] text-ink-soft mt-3 hover:text-accent transition-colors cursor-pointer">
                      Xem tất cả ({history.length})
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="bg-surface rounded-xl shadow-sm border border-brand-border p-4">
              <h3 className="font-bold text-sm mb-1.5 text-ink">Ghi chú Quản trị</h3>
              <p className="text-[11px] text-ink-soft mb-3 leading-relaxed">
                Các thay đổi về giá sẽ được áp dụng cho kỳ tính toán tiếp theo. Vui lòng kiểm tra kỹ
                trước khi lưu.
              </p>
              <div className="bg-accent-soft text-accent-ink rounded-lg p-2 text-[11px] font-mono">
                Phiên bản: <b>v2.5.0</b>
              </div>
            </div>
          </aside>
        </main>
    </div>
  );
};

export default ConfigurationPage;
