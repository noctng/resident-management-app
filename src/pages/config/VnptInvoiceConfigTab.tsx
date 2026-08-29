import React, { useState } from 'react';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  BoltIcon,
  MagnifyingGlassIcon,
  DocumentChartBarIcon,
  ViewfinderCircleIcon,
  EyeIcon,
  EyeSlashIcon,
} from '../../components/icons';
import { api } from '../../services/api';

export interface VnptInvoiceConfigData {
  VNPT_SERVICE_URL: string;
  VNPT_SERVICE_USERNAME: string;
  VNPT_SERVICE_PASSWORD: string;
  VNPT_ADMIN_ACCOUNT: string;
  VNPT_ADMIN_PASSWORD: string;
  VNPT_PATTERN: string;
  VNPT_SERIAL: string;
  VNPT_CONVERT: number;
  VNPT_AUTO_ISSUE_ENABLED: boolean;
  VNPT_AUTO_ISSUE_UTILITY: boolean;
  VNPT_AUTO_ISSUE_UNIFIED: boolean;
  VNPT_AUTO_ISSUE_MANAGEMENT: boolean;
  VNPT_AUTO_CONFIRM_PAYMENT: boolean;
  VNPT_SELLER_NAME: string;
  VNPT_SELLER_TAX_CODE: string;
  VNPT_SELLER_ADDRESS: string;
  VNPT_SELLER_PHONE: string;
  VNPT_SELLER_EMAIL: string;
  VNPT_SELLER_BANK_ACCOUNT: string;
  VNPT_SELLER_BANK_NAME: string;
}

interface VnptInvoiceConfigTabProps {
  vnptConfig: VnptInvoiceConfigData;
  setVnptConfig: React.Dispatch<React.SetStateAction<VnptInvoiceConfigData>>;
  setIsVnptDirty: (dirty: boolean) => void;
  setSaveMessage: (msg: string | null) => void;
}

export const VnptInvoiceConfigTab: React.FC<VnptInvoiceConfigTabProps> = ({
  vnptConfig,
  setVnptConfig,
  setIsVnptDirty,
  setSaveMessage,
}) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    rawResult?: string;
  } | null>(null);

  const [activeXmlPreviewTab, setActiveXmlPreviewTab] = useState<'invoice' | 'customer'>('invoice');
  const [previewType, setPreviewType] = useState<'utility' | 'unified'>('utility');
  const [previewXmlData, setPreviewXmlData] = useState<{
    customerXml: string;
    invoiceXml: string;
    fkey: string;
    grandTotal: number;
    amountInWords: string;
  } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Reveal state for credential password fields
  const [showSecrets, setShowSecrets] = useState<{
    servicePassword: boolean;
    adminPassword: boolean;
  }>({ servicePassword: false, adminPassword: false });

  const update = (key: keyof VnptInvoiceConfigData, value: any) => {
    setVnptConfig((prev) => ({ ...prev, [key]: value }));
    setIsVnptDirty(true);
  };

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res: any = await api.post('/vnpt-invoice/test-connection', {});
      if (res && res.success) {
        setTestResult({
          success: true,
          message: res.message || 'Kết nối thành công tới máy chủ VNPT WebService!',
          rawResult: res.rawResult,
        });
        setSaveMessage('Kết nối WebService VNPT thành công!');
      } else {
        setTestResult({
          success: false,
          message: res?.message || 'Không thể kết nối đến WebService VNPT.',
          rawResult: res?.rawResult,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Lỗi gửi yêu cầu kiểm tra kết nối tới VNPT.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleLoadXmlPreview = async () => {
    setIsLoadingPreview(true);
    try {
      const res: any = await api.post('/vnpt-invoice/preview-xml', {
        type: previewType,
        apartmentCode: 'CAN03-01',
        month: 8,
        year: 2026,
      });
      if (res && res.success) {
        setPreviewXmlData(res);
      }
    } catch (err: any) {
      console.error('Failed to preview XML', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Top Banner / Integration Toggle */}
      <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-2 bg-accent-soft text-accent-ink rounded-lg">
                <DocumentTextIcon className="w-5 h-5" />
              </span>
              <h2 className="text-base font-bold text-ink">Hóa Đơn Điện Tử VNPT (VNPT-Invoice)</h2>
              <span className="text-xs bg-accent-soft text-accent-ink px-2.5 py-0.5 rounded-full font-semibold">
                Chuẩn Thông tư 78 / NĐ 123
              </span>
            </div>
            <p className="text-ink-soft text-sm max-w-2xl">
              Tự động phát hành HĐĐT qua WebService của VNPT ngay khi khách hàng quét VietQR hoặc thanh toán
              tiền điện nước, hóa đơn tổng hợp và phí dịch vụ.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-surface-alt p-2.5 rounded-xl border border-brand-border self-start md:self-auto">
            <label htmlFor="vnpt-auto-toggle" className="text-sm font-medium text-ink cursor-pointer select-none">
              {vnptConfig.VNPT_AUTO_ISSUE_ENABLED ? 'Đang Bật Tích Hợp' : 'Đang Tắt Tích Hợp'}
            </label>
            <input
              id="vnpt-auto-toggle"
              type="checkbox"
              checked={vnptConfig.VNPT_AUTO_ISSUE_ENABLED}
              onChange={(e) => update('VNPT_AUTO_ISSUE_ENABLED', e.target.checked)}
              className="w-5 h-5 accent-accent rounded cursor-pointer"
            />
          </div>
        </div>
      </section>

      {/* 1. Thông tin kết nối WebService VNPT */}
      <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-accent" />
            Thông Tin Tài Khoản WebService VNPT
          </h2>
          <span className="text-sm text-ink-soft bg-surface-alt px-2.5 py-1 rounded-lg">
            Do VNPT cấp phát
          </span>
        </div>
        <p className="text-sm text-ink-soft">
          Các tham số này VNPT sẽ cung cấp ngay khi hoàn thành portal cho khách hàng.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          {/* Service URL */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Đường dẫn WebService (Service URL / Endpoint) <span className="text-brand-danger">*</span>
            </label>
            <input
              type="text"
              value={vnptConfig.VNPT_SERVICE_URL || ''}
              onChange={(e) => update('VNPT_SERVICE_URL', e.target.value)}
              placeholder="https://tenkhachhang-tt78.vnpt-invoice.com.vn/BusinessService.asmx"
              className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink font-mono placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
            <p className="mt-1 text-sm text-ink-soft">
              Ví dụ: <code className="text-accent">https://tenmien-tt78.vnpt-invoice.com.vn/BusinessService.asmx</code> hoặc <code className="text-accent">PublishService.asmx</code>
            </p>
          </div>

          {/* Service Username */}
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Tài Khoản Dịch Vụ (username) <span className="text-brand-danger">*</span>
            </label>
            <input
              type="text"
              value={vnptConfig.VNPT_SERVICE_USERNAME || ''}
              onChange={(e) => update('VNPT_SERVICE_USERNAME', e.target.value)}
              placeholder="ws_thanhphocaphe"
              className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink font-mono placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
            <p className="mt-1 text-sm text-ink-soft">
              Tài khoản được cấp phát để gọi service webservice
            </p>
          </div>

          {/* Service Password */}
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Mật Khẩu Dịch Vụ (pass) <span className="text-brand-danger">*</span>
            </label>
            <div className="relative">
              <input
                type={showSecrets.servicePassword ? 'text' : 'password'}
                value={vnptConfig.VNPT_SERVICE_PASSWORD || ''}
                onChange={(e) => update('VNPT_SERVICE_PASSWORD', e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 pr-10 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink font-mono placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              />
              <button
                type="button"
                onClick={() =>
                  setShowSecrets((prev) => ({
                    ...prev,
                    servicePassword: !prev.servicePassword,
                  }))
                }
                aria-label={
                  showSecrets.servicePassword ? 'Ẩn mật khẩu dịch vụ' : 'Hiện mật khẩu dịch vụ'
                }
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-ink-soft hover:text-accent transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                {showSecrets.servicePassword ? (
                  <EyeSlashIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="mt-1 text-sm text-ink-soft">
              Mật khẩu gọi service (được mã hóa bảo mật)
            </p>
          </div>

          {/* Admin Account */}
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Tài Khoản Nhân Viên Phát Hành (Account) <span className="text-brand-danger">*</span>
            </label>
            <input
              type="text"
              value={vnptConfig.VNPT_ADMIN_ACCOUNT || ''}
              onChange={(e) => update('VNPT_ADMIN_ACCOUNT', e.target.value)}
              placeholder="admin_thanhphocaphe"
              className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink font-mono placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
            <p className="mt-1 text-sm text-ink-soft">
              Tài khoản nhân viên được cấp quyền gọi lệnh phát hành / điều chỉnh / hủy hóa đơn
            </p>
          </div>

          {/* Admin ACPass */}
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Mật Khẩu Nhân Viên (ACPass) <span className="text-brand-danger">*</span>
            </label>
            <div className="relative">
              <input
                type={showSecrets.adminPassword ? 'text' : 'password'}
                value={vnptConfig.VNPT_ADMIN_PASSWORD || ''}
                onChange={(e) => update('VNPT_ADMIN_PASSWORD', e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 pr-10 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink font-mono placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              />
              <button
                type="button"
                onClick={() =>
                  setShowSecrets((prev) => ({
                    ...prev,
                    adminPassword: !prev.adminPassword,
                  }))
                }
                aria-label={
                  showSecrets.adminPassword ? 'Ẩn mật khẩu nhân viên' : 'Hiện mật khẩu nhân viên'
                }
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-ink-soft hover:text-accent transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                {showSecrets.adminPassword ? (
                  <EyeSlashIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="mt-1 text-sm text-ink-soft">
              Mật khẩu ACPass dùng cho hàm ImportAndPublishInv, adjustInv, cancelInv
            </p>
          </div>
        </div>

        {/* Test Connection Button & Result */}
        <div className="pt-3 border-t border-brand-border flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting || !vnptConfig.VNPT_SERVICE_URL}
            className="flex items-center gap-2 px-4 py-2 bg-surface border border-brand-border hover:bg-surface-alt text-ink rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            {isTesting ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheckIcon className="w-4 h-4" />
            )}
            {isTesting ? 'Đang kiểm tra...' : 'Kiểm Tra Kết Nối WebService'}
          </button>
          <span className="text-sm text-ink-soft">
            Gửi yêu cầu ping kiểm tra tới máy chủ VNPT để xác thực đường truyền & tài khoản
          </span>
        </div>

        {testResult && (
          <div
            className={`px-4 py-3 rounded-lg border text-sm flex items-start gap-3 animate-fade-in ${
              testResult.success
                ? 'bg-brand-success-soft border border-brand-success/30'
                : 'bg-brand-danger-soft border border-brand-danger/30'
            }`}
          >
            {testResult.success ? (
              <CheckCircleIcon className="w-5 h-5 shrink-0 text-brand-success mt-0.5" />
            ) : (
              <ExclamationTriangleIcon className="w-5 h-5 shrink-0 text-brand-danger mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-semibold text-ink">{testResult.message}</div>
              {testResult.rawResult && (
                <div className="text-xs font-mono bg-black/10 p-2 rounded max-h-24 overflow-y-auto text-ink">
                  Phản hồi từ VNPT: {testResult.rawResult}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 2. Mẫu số & Ký hiệu Hóa đơn (Pattern & Serial) */}
      <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
        <h2 className="text-sm font-bold text-ink flex items-center gap-2">
          <DocumentTextIcon className="w-5 h-5 text-accent" />
          Mẫu Số (Pattern) & Ký Hiệu (Serial) Hóa Đơn
        </h2>
        <p className="text-sm text-ink-soft">
          Mẫu số và ký hiệu hóa đơn đã đăng ký với Cục Thuế thông qua VNPT.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Mẫu Số Hóa Đơn (Pattern) <span className="text-brand-danger">*</span>
            </label>
            <input
              type="text"
              value={vnptConfig.VNPT_PATTERN || ''}
              onChange={(e) => update('VNPT_PATTERN', e.target.value)}
              placeholder="1/001 hoặc 01GTKT0/001"
              className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink font-mono placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
            <p className="mt-1 text-sm text-ink-soft">
              Ví dụ: <code className="text-accent font-semibold">1/001</code>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Ký Hiệu Hóa Đơn (Serial) <span className="text-brand-danger">*</span>
            </label>
            <input
              type="text"
              value={vnptConfig.VNPT_SERIAL || ''}
              onChange={(e) => update('VNPT_SERIAL', e.target.value.toUpperCase())}
              placeholder="C26TAA hoặc AA/26E"
              className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink font-mono uppercase placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
            <p className="mt-1 text-sm text-ink-soft">
              Ví dụ: <code className="text-accent font-semibold">C26TAA</code>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Chuyển Đổi Mã Ký Tự (convert)
            </label>
            <select
              value={vnptConfig.VNPT_CONVERT ?? 0}
              onChange={(e) => update('VNPT_CONVERT', parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            >
              <option value={0}>0 — Chuẩn Unicode (Mặc định)</option>
              <option value={1}>1 — Chuyển đổi từ TCVN3 sang Unicode</option>
            </select>
            <p className="mt-1 text-sm text-ink-soft">
              Hệ thống hiện đại nên để mặc định 0
            </p>
          </div>
        </div>
      </section>

      {/* 3. Tùy Chọn Tự Động Phát Hành HĐĐT */}
      <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
        <h2 className="text-sm font-bold text-ink flex items-center gap-2">
          <BoltIcon className="w-5 h-5 text-accent" />
          Tùy Chọn Tự Động Xuất Hóa Đơn Khi Thanh Toán
        </h2>
        <p className="text-sm text-ink-soft">
          Hệ thống sẽ tự động gọi hàm <code className="text-accent font-mono">ImportAndPublishInv</code> tới VNPT ngay khi ghi nhận trạng thái đã thanh toán.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="p-4 rounded-lg border border-brand-border bg-bg flex items-start gap-3">
            <input
              id="auto-utility"
              type="checkbox"
              checked={vnptConfig.VNPT_AUTO_ISSUE_UTILITY}
              onChange={(e) => update('VNPT_AUTO_ISSUE_UTILITY', e.target.checked)}
              className="w-5 h-5 accent-accent rounded mt-0.5 cursor-pointer"
            />
            <div>
              <label htmlFor="auto-utility" className="text-sm font-semibold text-ink cursor-pointer">
                Tự động xuất HĐĐT Tiền Điện Nước
              </label>
              <p className="text-sm text-ink-soft mt-0.5">
                Khi hóa đơn điện nước chuyển sang trạng thái <strong>Đã thanh toán (PAID)</strong> (qua SePay hoặc thủ công).
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-brand-border bg-bg flex items-start gap-3">
            <input
              id="auto-unified"
              type="checkbox"
              checked={vnptConfig.VNPT_AUTO_ISSUE_UNIFIED}
              onChange={(e) => update('VNPT_AUTO_ISSUE_UNIFIED', e.target.checked)}
              className="w-5 h-5 accent-accent rounded mt-0.5 cursor-pointer"
            />
            <div>
              <label htmlFor="auto-unified" className="text-sm font-semibold text-ink cursor-pointer">
                Tự động xuất HĐĐT Hóa Đơn Tổng Hợp
              </label>
              <p className="text-sm text-ink-soft mt-0.5">
                Khi thanh toán trọn gói toàn bộ chi phí căn hộ trong kỳ.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-brand-border bg-bg flex items-start gap-3">
            <input
              id="auto-mgmt"
              type="checkbox"
              checked={vnptConfig.VNPT_AUTO_ISSUE_MANAGEMENT}
              onChange={(e) => update('VNPT_AUTO_ISSUE_MANAGEMENT', e.target.checked)}
              className="w-5 h-5 accent-accent rounded mt-0.5 cursor-pointer"
            />
            <div>
              <label htmlFor="auto-mgmt" className="text-sm font-semibold text-ink cursor-pointer">
                Tự động xuất HĐĐT Phí Quản Lý Vận Hành
              </label>
              <p className="text-sm text-ink-soft mt-0.5">
                Áp dụng cho các kỳ thu phí quản lý độc lập.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-brand-border bg-bg flex items-start gap-3">
            <input
              id="auto-confirm"
              type="checkbox"
              checked={vnptConfig.VNPT_AUTO_CONFIRM_PAYMENT}
              onChange={(e) => update('VNPT_AUTO_CONFIRM_PAYMENT', e.target.checked)}
              className="w-5 h-5 accent-accent rounded mt-0.5 cursor-pointer"
            />
            <div>
              <label htmlFor="auto-confirm" className="text-sm font-semibold text-ink cursor-pointer">
                Tự động Gạch Nợ trên Portal VNPT (confirmPaymentFkey)
              </label>
              <p className="text-sm text-ink-soft mt-0.5">
                Đánh dấu trạng thái hóa đơn là <strong>Đã gạch nợ</strong> trên hệ thống VNPT ngay sau khi phát hành.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Thông Tin Đơn Vị Phát Hành (Người Bán / Seller) */}
      <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
        <h2 className="text-sm font-bold text-ink flex items-center gap-2">
          <BuildingOfficeIcon className="w-5 h-5 text-accent" />
          Thông Tin Đơn Vị Phát Hành (Bên Bán)
        </h2>
        <p className="text-sm text-ink-soft">
          Thông tin hiển thị trên tiêu đề Hóa Đơn Điện Tử.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Tên Đơn Vị Bán
            </label>
            <input
              type="text"
              value={vnptConfig.VNPT_SELLER_NAME || ''}
              onChange={(e) => update('VNPT_SELLER_NAME', e.target.value)}
              placeholder="BAN QUẢN LÝ KHU ĐÔ THỊ THÀNH PHỐ CÀ PHÊ"
              className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink font-medium uppercase placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Mã Số Thuế (MST)
            </label>
            <input
              type="text"
              value={vnptConfig.VNPT_SELLER_TAX_CODE || ''}
              onChange={(e) => update('VNPT_SELLER_TAX_CODE', e.target.value)}
              placeholder="6001234567"
              className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink font-mono placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Số Điện Thoại Liên Hệ
            </label>
            <input
              type="text"
              value={vnptConfig.VNPT_SELLER_PHONE || ''}
              onChange={(e) => update('VNPT_SELLER_PHONE', e.target.value)}
              placeholder="0262 3999 888"
              className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Địa Chỉ Đơn Vị
            </label>
            <input
              type="text"
              value={vnptConfig.VNPT_SELLER_ADDRESS || ''}
              onChange={(e) => update('VNPT_SELLER_ADDRESS', e.target.value)}
              placeholder="Đường Nguyễn Đình Chiểu, P. Tân Lợi, TP. Buôn Ma Thuột, Tỉnh Đắk Lắk"
              className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
          </div>
        </div>
      </section>

      {/* 5. Xem Trước Cấu Trúc XML Hóa Đơn & Khách Hàng (Interactive XML Preview) */}
      <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-ink flex items-center gap-2">
              <MagnifyingGlassIcon className="w-5 h-5 text-accent" />
              Trình Xem Trước & Kiểm Thử Cấu Trúc XML VNPT
            </h2>
            <p className="text-sm text-ink-soft">
              Kiểm tra định dạng thẻ XML được sinh tự động theo đặc tả kỹ thuật của VNPT.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={previewType}
              onChange={(e) => setPreviewType(e.target.value as any)}
              className="px-3 py-1.5 bg-surface-alt border border-brand-border rounded-lg text-xs font-semibold text-ink cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            >
              <option value="utility">Mẫu: Hóa Đơn Điện Nước</option>
              <option value="unified">Mẫu: Hóa Đơn Tổng Hợp</option>
            </select>

            <button
              type="button"
              onClick={handleLoadXmlPreview}
              disabled={isLoadingPreview}
              className="px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              {isLoadingPreview ? (
                <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ViewfinderCircleIcon className="w-3.5 h-3.5" />
              )}
              Tạo XML Mẫu
            </button>
          </div>
        </div>

        {/* Tab selection for XML preview */}
        <div className="flex gap-2 border-b border-brand-border pb-2">
          <button
            type="button"
            onClick={() => setActiveXmlPreviewTab('invoice')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40 ${
              activeXmlPreviewTab === 'invoice'
                ? 'bg-accent text-white'
                : 'text-ink-soft hover:bg-surface-alt'
            }`}
          >
            XML Dữ Liệu Hóa Đơn (ImportAndPublishInv)
          </button>
          <button
            type="button"
            onClick={() => setActiveXmlPreviewTab('customer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40 ${
              activeXmlPreviewTab === 'customer'
                ? 'bg-accent text-white'
                : 'text-ink-soft hover:bg-surface-alt'
            }`}
          >
            XML Khách Hàng (UpdateCus)
          </button>
        </div>

        {/* XML Viewer Codeblock */}
        <div className="relative">
          <pre className="bg-surface-alt border border-brand-border rounded-xl p-4 font-mono text-xs text-ink overflow-x-auto max-h-96 leading-relaxed">
            {previewXmlData
              ? activeXmlPreviewTab === 'invoice'
                ? previewXmlData.invoiceXml
                : previewXmlData.customerXml
              : `<!-- Nhấn nút "Tạo XML Mẫu" ở trên để xem trước chuỗi XML hoàn chỉnh được gửi tới VNPT -->`}
          </pre>

          {previewXmlData && (
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  activeXmlPreviewTab === 'invoice'
                    ? previewXmlData.invoiceXml
                    : previewXmlData.customerXml,
                  'xml_code'
                )
              }
              className="absolute top-3 right-3 px-2.5 py-1 rounded-lg border border-brand-border bg-surface text-xs font-semibold text-ink-soft hover:text-accent hover:border-accent/40 backdrop-blur-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              {copiedKey === 'xml_code' ? '✓ Đã sao chép' : 'Sao chép XML'}
            </button>
          )}
        </div>

        {previewXmlData && (
          <div className="flex flex-wrap items-center gap-4 text-sm text-ink-soft bg-surface-alt p-3 rounded-lg">
            <div>
              <strong>Khóa Fkey:</strong> <code className="text-accent">{previewXmlData.fkey}</code>
            </div>
            <div>
              <strong>Tổng tiền:</strong>{' '}
              <span className="font-mono tabular-nums">
                {previewXmlData.grandTotal.toLocaleString('vi-VN')} đ
              </span>
            </div>
            <div>
              <strong>Bằng chữ:</strong> <em>{previewXmlData.amountInWords}</em>
            </div>
          </div>
        )}
      </section>

      {/* 6. Bảng Tra Cứu Mã Phản Hồi & Mã Lỗi VNPT (Reference) */}
      <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
        <h2 className="text-sm font-bold text-ink flex items-center gap-2">
          <DocumentChartBarIcon className="w-5 h-5 text-accent" />
          Bảng Tra Cứu Mã Lỗi WebService VNPT
        </h2>
        <p className="text-sm text-ink-soft">
          Ý nghĩa các mã trả về từ hệ thống HĐĐT VNPT khi gọi các hàm nghiệp vụ:
        </p>

        <div className="overflow-x-auto rounded-xl border border-brand-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-alt text-ink-soft uppercase font-semibold">
              <tr>
                <th className="p-3">Mã Kết Quả</th>
                <th className="p-3">Mô Tả Nghiệp Vụ</th>
                <th className="p-3">Ghi Chú & Cách Xử Lý</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border text-ink-soft">
              <tr className="bg-brand-success-soft/50">
                <td className="p-3 font-mono font-bold text-brand-success">OK:...</td>
                <td className="p-3 font-medium text-ink">
                  Phát hành / thao tác hóa đơn thành công
                </td>
                <td className="p-3">Trả về mẫu số, ký hiệu và dãy số hóa đơn đã xuất</td>
              </tr>
              <tr>
                <td className="p-3 font-mono font-bold text-brand-danger">ERR:1</td>
                <td className="p-3">Tài khoản đăng nhập sai hoặc không có quyền</td>
                <td className="p-3">Kiểm tra lại <code>username/pass</code> hoặc <code>Account/ACPass</code></td>
              </tr>
              <tr>
                <td className="p-3 font-mono font-bold text-brand-danger">ERR:20</td>
                <td className="p-3">Pattern và Serial không phù hợp hoặc chưa đăng ký</td>
                <td className="p-3">Kiểm tra lại Mẫu số (Pattern) và Ký hiệu (Serial) với VNPT</td>
              </tr>
              <tr>
                <td className="p-3 font-mono font-bold text-brand-danger">ERR:6</td>
                <td className="p-3">Không đủ số hóa đơn cho lô phát hành</td>
                <td className="p-3">Dải số hóa đơn đã hết, cần liên hệ VNPT mua thêm dải hóa đơn</td>
              </tr>
              <tr>
                <td className="p-3 font-mono font-bold text-brand-danger">ERR:7</td>
                <td className="p-3">Username không phù hợp, không tìm thấy công ty</td>
                <td className="p-3">Tài khoản không thuộc công ty/đơn vị tương ứng trên VNPT portal</td>
              </tr>
              <tr>
                <td className="p-3 font-mono font-bold text-brand-danger">ERR:5</td>
                <td className="p-3">Không phát hành được hóa đơn (Rollback DB)</td>
                <td className="p-3">Lỗi CSDL trên máy chủ VNPT, hệ thống đã tự động rollback an toàn</td>
              </tr>
              <tr>
                <td className="p-3 font-mono font-bold text-brand-teal">N (Số nguyên &gt; 0)</td>
                <td className="p-3">Hàm UpdateCus cập nhật khách hàng thành công</td>
                <td className="p-3">N là số lượng khách hàng đã được import/cập nhật vào hệ thống</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default VnptInvoiceConfigTab;
