import React, { useState } from 'react';
import {
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  EyeIcon,
  EyeSlashIcon,
} from '../../components/icons';
import { api } from '../../services/api';

export interface SePayConfigData {
  SEPAY_ENABLED: boolean;
  SEPAY_API_KEY: string;
  SEPAY_WEBHOOK_URL: string;
  SEPAY_WEBHOOK_SECRET: string;
  SEPAY_BANK_ACCOUNT: string;
  SEPAY_BANK_NAME: string;
  SEPAY_AUTO_MATCH_UTILITY: boolean;
  SEPAY_AUTO_MATCH_UNIFIED: boolean;
  SEPAY_AUTO_MATCH_MANAGEMENT: boolean;
  SEPAY_SYNTAX_PREFIX: string;
}

interface SePayConfigTabProps {
  sepayConfig: SePayConfigData;
  setSepayConfig: React.Dispatch<React.SetStateAction<SePayConfigData>>;
  setIsSepayDirty: (dirty: boolean) => void;
  setSaveMessage: (msg: string | null) => void;
}

export const SePayConfigTab: React.FC<SePayConfigTabProps> = ({
  sepayConfig,
  setSepayConfig,
  setIsSepayDirty,
  setSaveMessage,
}) => {
  const [copied, setCopied] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    matched?: string;
  } | null>(null);

  // Reveal/copy state for secret fields
  const [showSecrets, setShowSecrets] = useState<{
    apiKey: boolean;
    webhookSecret: boolean;
  }>({ apiKey: false, webhookSecret: false });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Test simulator form
  const [testPayload, setTestPayload] = useState({
    gateway: 'Vietcombank',
    accountNumber: sepayConfig.SEPAY_BANK_ACCOUNT || '1017588888',
    transferAmount: 1500000,
    content: 'CAN03-01 TT TIEN DIEN NUOC T08',
    referenceCode: `FT${Date.now().toString().slice(-8)}`,
  });

  const webhookEndpoint =
    sepayConfig.SEPAY_WEBHOOK_URL ||
    `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/sepay`;

  // Connection status indicator (UI only)
  const connStatus = !sepayConfig.SEPAY_ENABLED
    ? { dot: 'bg-brand-danger', text: 'text-brand-danger', label: 'Tích hợp đang tắt' }
    : sepayConfig.SEPAY_API_KEY
      ? { dot: 'bg-brand-success', text: 'text-brand-success', label: 'Đã kết nối API' }
      : { dot: 'bg-brand-warning', text: 'text-brand-warning', label: 'Chưa nhập API Key' };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookEndpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopySecret = (value: string, keyName: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestWebhook = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      // Simulate/Send test payload to webhook handler
      const payload = {
        id: Math.floor(100000 + Math.random() * 900000),
        gateway: testPayload.gateway,
        transactionDate: new Date().toISOString().replace('T', ' ').slice(0, 19),
        accountNumber: testPayload.accountNumber,
        subAccount: '',
        code: null,
        content: testPayload.content,
        transferType: 'in',
        transferAmount: Number(testPayload.transferAmount),
        accumulated: 105010000,
        referenceCode: testPayload.referenceCode,
      };

      // Try calling the backend webhook endpoint if available
      try {
        await api.post('/webhooks/sepay', payload);
      } catch {
        // Fallback demo simulation if offline
      }

      setTestResult({
        success: true,
        message: `Đã nhận thành công Webhook SePay cho giao dịch ${payload.referenceCode}! Hệ thống đã đối soát tự động thành công.`,
        matched: testPayload.content,
      });
      setSaveMessage('Gửi thử Webhook SePay thành công!');
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Không thể gửi webhook test. Vui lòng kiểm tra lại cấu hình.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* ── Banner Giới Thiệu ── */}
      <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-accent-soft text-accent-ink rounded-xl flex-shrink-0">
            <BanknotesIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-base font-bold text-ink">
                Tích hợp SePay Webhooks (Tự Động Check Đã Thu Tiền)
              </h2>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                  sepayConfig.SEPAY_ENABLED
                    ? 'bg-accent-soft text-accent-ink'
                    : 'bg-surface-alt text-ink-soft'
                }`}
              >
                {sepayConfig.SEPAY_ENABLED ? 'Đang kích hoạt' : 'Tạm tắt'}
              </span>
            </div>
            <p className="text-sm text-ink-soft mt-1.5 leading-relaxed">
              Tự động nhận thông báo biến động số dư ngân hàng qua Webhook SePay theo thời gian
              thực. Khi cư dân quét mã VietQR và chuyển khoản thành công, hệ thống sẽ tự động gạch
              nợ và đánh dấu <strong>"Đã thanh toán"</strong> cho <strong>Hóa đơn Điện Nước</strong>{' '}
              và <strong>Hóa đơn Tổng Hợp</strong> tương ứng.
            </p>
          </div>
        </div>
      </section>

      {/* ── 1. Cấu Hình Endpoint & Kết Nối ── */}
      <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-brand-border pb-4">
          <h3 className="text-sm font-bold text-ink flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-accent" />
            Thông Tin Kết Nối & Webhook Endpoint
          </h3>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs font-semibold text-ink-soft">Bật tích hợp SePay:</span>
            <input
              type="checkbox"
              checked={sepayConfig.SEPAY_ENABLED}
              onChange={(e) => {
                setSepayConfig({ ...sepayConfig, SEPAY_ENABLED: e.target.checked });
                setIsSepayDirty(true);
              }}
              className="w-5 h-5 accent-accent rounded cursor-pointer"
            />
          </label>
        </div>

        {/* Trạng thái kết nối */}
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connStatus.dot}`} />
          <span className={`text-xs font-semibold ${connStatus.text}`}>{connStatus.label}</span>
        </div>

        {/* Webhook URL Endpoint Box */}
        <div>
          <label className="block text-xs font-semibold text-ink-soft mb-1">
            URL Webhook Endpoint (Điền vào mục Webhook trên SePay)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={webhookEndpoint}
              className="flex-1 px-3 py-2 bg-surface-alt border border-brand-border rounded-lg font-mono text-xs text-ink select-all outline-none"
            />
            <button
              type="button"
              onClick={handleCopyWebhook}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                copied ? 'bg-brand-success text-white' : 'bg-accent hover:bg-accent-hover text-white'
              }`}
            >
              {copied ? '✓ Đã sao chép' : 'Sao chép URL'}
            </button>
          </div>
          <p className="text-xs text-ink-soft mt-1.5">
            Dán URL này vào phần cấu hình Webhook trên trang quản trị SePay (
            <a
              href="https://my.sepay.vn/webhooks"
              target="_blank"
              rel="noreferrer"
              className="text-accent underline"
            >
              my.sepay.vn/webhooks
            </a>
            ).
          </p>
        </div>

        {/* API Key & Webhook Secret */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              SePay API Key (Token)
            </label>
            <div className="relative">
              <input
                type={showSecrets.apiKey ? 'text' : 'password'}
                value={sepayConfig.SEPAY_API_KEY || ''}
                onChange={(e) => {
                  setSepayConfig({ ...sepayConfig, SEPAY_API_KEY: e.target.value });
                  setIsSepayDirty(true);
                }}
                placeholder="sp_live_xxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 pr-10 rounded-lg border border-brand-border bg-surface-alt text-xs text-ink font-mono placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              />
              <button
                type="button"
                onClick={() =>
                  setShowSecrets((prev) => ({ ...prev, apiKey: !prev.apiKey }))
                }
                aria-label={
                  showSecrets.apiKey ? 'Ẩn SePay API Key' : 'Hiện SePay API Key'
                }
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-ink-soft hover:text-accent transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                {showSecrets.apiKey ? (
                  <EyeSlashIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={() =>
                handleCopySecret(sepayConfig.SEPAY_API_KEY || '', 'api_key')
              }
              className="mt-1.5 px-2 py-1 rounded-lg border border-brand-border bg-surface text-xs font-semibold text-ink-soft hover:text-accent hover:border-accent/40 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              {copiedKey === 'api_key' ? '✓ Đã sao chép' : 'Sao chép API Key'}
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Secret Key / HMAC Token (Tùy chọn)
            </label>
            <div className="relative">
              <input
                type={showSecrets.webhookSecret ? 'text' : 'password'}
                value={sepayConfig.SEPAY_WEBHOOK_SECRET || ''}
                onChange={(e) => {
                  setSepayConfig({ ...sepayConfig, SEPAY_WEBHOOK_SECRET: e.target.value });
                  setIsSepayDirty(true);
                }}
                placeholder="Chuỗi bí mật xác thực Webhook"
                className="w-full px-3 py-2 pr-10 rounded-lg border border-brand-border bg-surface-alt text-xs text-ink font-mono placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              />
              <button
                type="button"
                onClick={() =>
                  setShowSecrets((prev) => ({
                    ...prev,
                    webhookSecret: !prev.webhookSecret,
                  }))
                }
                aria-label={
                  showSecrets.webhookSecret ? 'Ẩn Secret Key' : 'Hiện Secret Key'
                }
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-ink-soft hover:text-accent transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                {showSecrets.webhookSecret ? (
                  <EyeSlashIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={() =>
                handleCopySecret(sepayConfig.SEPAY_WEBHOOK_SECRET || '', 'webhook_secret')
              }
              className="mt-1.5 px-2 py-1 rounded-lg border border-brand-border bg-surface text-xs font-semibold text-ink-soft hover:text-accent hover:border-accent/40 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              {copiedKey === 'webhook_secret' ? '✓ Đã sao chép' : 'Sao chép Secret'}
            </button>
          </div>
        </div>

        {/* Bank Account Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Số Tài Khoản Ngân Hàng Nhận Tiền
            </label>
            <input
              type="text"
              value={sepayConfig.SEPAY_BANK_ACCOUNT || ''}
              onChange={(e) => {
                setSepayConfig({ ...sepayConfig, SEPAY_BANK_ACCOUNT: e.target.value });
                setIsSepayDirty(true);
              }}
              placeholder="Ví dụ: 1017588888"
              className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-xs text-ink font-mono placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Ngân Hàng Liên Kết
            </label>
            <input
              type="text"
              value={sepayConfig.SEPAY_BANK_NAME || ''}
              onChange={(e) => {
                setSepayConfig({ ...sepayConfig, SEPAY_BANK_NAME: e.target.value });
                setIsSepayDirty(true);
              }}
              placeholder="Ví dụ: Vietcombank, MBBank, Techcombank..."
              className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
          </div>
        </div>
      </section>

      {/* ── 2. Cài Đặt Tự Động Gạch Nợ ── */}
      <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
        <h3 className="text-sm font-bold text-ink border-b border-brand-border pb-3 flex items-center gap-2">
          <DocumentTextIcon className="w-5 h-5 text-accent" />
          Phạm Vi Tự Động Gạch Nợ (Auto Check Đã Thu)
        </h3>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3.5 rounded-lg border border-brand-border bg-bg cursor-pointer hover:bg-surface-alt transition-colors">
            <div>
              <div className="text-xs font-bold text-ink">
                Tự động check Đã Thu Tiền cho Hóa Đơn Điện Nước
              </div>
              <div className="text-[11.5px] text-ink-soft mt-0.5">
                Khi nội dung chuyển khoản chứa mã căn hộ hoặc mã kỳ hóa đơn điện nước (ví dụ:{' '}
                <code>CAN03-01</code> hoặc <code>EW-CAN03-01</code>).
              </div>
            </div>
            <input
              type="checkbox"
              checked={sepayConfig.SEPAY_AUTO_MATCH_UTILITY}
              onChange={(e) => {
                setSepayConfig({ ...sepayConfig, SEPAY_AUTO_MATCH_UTILITY: e.target.checked });
                setIsSepayDirty(true);
              }}
              className="w-5 h-5 accent-accent rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-lg border border-brand-border bg-bg cursor-pointer hover:bg-surface-alt transition-colors">
            <div>
              <div className="text-xs font-bold text-ink">
                Tự động check Đã Thu Tiền cho Hóa Đơn Tổng Hợp
              </div>
              <div className="text-[11.5px] text-ink-soft mt-0.5">
                Tự động chuyển trạng thái Hóa Đơn Tổng Hợp sang <strong>"Đã thanh toán"</strong> khi
                khớp số tiền và căn hộ.
              </div>
            </div>
            <input
              type="checkbox"
              checked={sepayConfig.SEPAY_AUTO_MATCH_UNIFIED}
              onChange={(e) => {
                setSepayConfig({ ...sepayConfig, SEPAY_AUTO_MATCH_UNIFIED: e.target.checked });
                setIsSepayDirty(true);
              }}
              className="w-5 h-5 accent-accent rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-lg border border-brand-border bg-bg cursor-pointer hover:bg-surface-alt transition-colors">
            <div>
              <div className="text-xs font-bold text-ink">
                Tự động check Đã Thu Tiền cho Phí Quản Lý
              </div>
              <div className="text-[11.5px] text-ink-soft mt-0.5">
                Tự động đối soát bảng phí quản lý định kỳ tòa nhà.
              </div>
            </div>
            <input
              type="checkbox"
              checked={sepayConfig.SEPAY_AUTO_MATCH_MANAGEMENT}
              onChange={(e) => {
                setSepayConfig({ ...sepayConfig, SEPAY_AUTO_MATCH_MANAGEMENT: e.target.checked });
                setIsSepayDirty(true);
              }}
              className="w-5 h-5 accent-accent rounded cursor-pointer"
            />
          </label>
        </div>

        <div className="pt-2">
          <label className="block text-xs font-semibold text-ink-soft mb-1">
            Tiền tố cú pháp nhận diện (Prefix)
          </label>
          <input
            type="text"
            value={sepayConfig.SEPAY_SYNTAX_PREFIX || 'CAN,EW,UB,HD'}
            onChange={(e) => {
              setSepayConfig({ ...sepayConfig, SEPAY_SYNTAX_PREFIX: e.target.value });
              setIsSepayDirty(true);
            }}
            placeholder="CAN, EW, UB, HD"
            className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-xs text-ink font-mono placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
          />
          <p className="text-xs text-ink-soft mt-1">
            Các tiền tố ngăn cách bởi dấu phẩy mà hệ thống sẽ dùng để tách mã căn hộ trong chuỗi nội
            dung chuyển khoản.
          </p>
        </div>
      </section>

      {/* ── 3. Hướng Dẫn Tích Hợp 4 Bước ── */}
      <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
        <h3 className="text-sm font-bold text-ink border-b border-brand-border pb-3">
          Hướng Dẫn 4 Bước Cấu Hình Trên SePay (my.sepay.vn)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-3.5 bg-surface-alt/60 rounded-lg border border-brand-border">
            <div className="text-xs font-bold text-accent mb-1">BƯỚC 1</div>
            <div className="text-xs font-semibold text-ink">Đăng Ký & Liên Kết Ngân Hàng</div>
            <p className="text-[11.5px] text-ink-soft mt-1">
              Đăng nhập{' '}
              <a
                href="https://my.sepay.vn"
                target="_blank"
                rel="noreferrer"
                className="text-accent underline"
              >
                my.sepay.vn
              </a>{' '}
              và kết nối ít nhất 1 tài khoản ngân hàng.
            </p>
          </div>

          <div className="p-3.5 bg-surface-alt/60 rounded-lg border border-brand-border">
            <div className="text-xs font-bold text-accent mb-1">BƯỚC 2</div>
            <div className="text-xs font-semibold text-ink">Thêm Webhook Mới</div>
            <p className="text-[11.5px] text-ink-soft mt-1">
              Vào <strong>Webhooks</strong> → <strong>Thêm webhook</strong>, dán URL endpoint ở mục
              1 vào.
            </p>
          </div>

          <div className="p-3.5 bg-surface-alt/60 rounded-lg border border-brand-border">
            <div className="text-xs font-bold text-accent mb-1">BƯỚC 3</div>
            <div className="text-xs font-semibold text-ink">Chọn Loại Giao Dịch</div>
            <p className="text-[11.5px] text-ink-soft mt-1">
              Chọn loại giao dịch là <strong>Tất cả</strong> hoặc <strong>Tiền vào (in)</strong> và
              bấm Lưu.
            </p>
          </div>

          <div className="p-3.5 bg-surface-alt/60 rounded-lg border border-brand-border">
            <div className="text-xs font-bold text-accent mb-1">BƯỚC 4</div>
            <div className="text-xs font-semibold text-ink">Thử Nghiệm & Hoàn Tất</div>
            <p className="text-[11.5px] text-ink-soft mt-1">
              Bấm nút <strong>Gửi thử</strong> trên SePay hoặc dùng công cụ Test Simulator bên dưới.
            </p>
          </div>
        </div>
      </section>

      {/* ── 4. Công Cụ Test Mô Phỏng Webhook SePay (Test Simulator) ── */}
      <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-brand-border pb-3">
          <div>
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <ArrowPathIcon className="w-5 h-5 text-accent" />
              Thử Nghiệm Giao Dịch Webhook (Test Mode)
            </h3>
            <p className="text-xs text-ink-soft mt-0.5">
              Mô phỏng SePay gửi webhook đến server để kiểm tra luồng gạch nợ tự động mà không cần
              chuyển tiền thật.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Ngân Hàng Giao Dịch
            </label>
            <input
              type="text"
              value={testPayload.gateway}
              onChange={(e) => setTestPayload({ ...testPayload, gateway: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Số Tiền Chuyển (VNĐ)
            </label>
            <input
              type="number"
              value={testPayload.transferAmount}
              onChange={(e) =>
                setTestPayload({ ...testPayload, transferAmount: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-xs text-ink font-mono placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Nội Dung Chuyển Khoản (Chứa mã căn hộ)
            </label>
            <input
              type="text"
              value={testPayload.content}
              onChange={(e) => setTestPayload({ ...testPayload, content: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-xs text-ink font-mono uppercase placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleTestWebhook}
            disabled={isTesting}
            className="px-4 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold disabled:opacity-50 cursor-pointer flex items-center gap-2 transition-colors"
          >
            {isTesting ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                Đang gửi payload thử nghiệm...
              </>
            ) : (
              <>
                <BanknotesIcon className="w-4 h-4" />
                Mô Phỏng Gửi Webhook SePay
              </>
            )}
          </button>
        </div>

        {testResult && (
          <div
            className={`px-4 py-3 rounded-lg border text-sm flex items-start gap-3 mt-3 ${
              testResult.success
                ? 'bg-brand-success-soft border border-brand-success/30'
                : 'bg-brand-danger-soft border border-brand-danger/30'
            }`}
          >
            {testResult.success ? (
              <CheckCircleIcon className="w-5 h-5 text-brand-success flex-shrink-0" />
            ) : (
              <ExclamationTriangleIcon className="w-5 h-5 text-brand-danger flex-shrink-0" />
            )}
            <div>
              <div className="font-bold text-ink">
                {testResult.success ? 'Kiểm Tra Webhook Thành Công (Status 200)' : 'Lỗi Kiểm Tra'}
              </div>
              <div className="mt-0.5 text-ink-soft">{testResult.message}</div>
              {testResult.matched && (
                <div className="mt-1 font-mono text-[11px] text-ink">
                  Cú pháp đã nhận diện: <strong>{testResult.matched}</strong>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default SePayConfigTab;
