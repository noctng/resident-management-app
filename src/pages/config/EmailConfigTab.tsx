import React, { useState } from 'react';
import {
  EnvelopeIcon,
  CpuChipIcon,
  EyeIcon,
  EyeSlashIcon,
} from '../../components/icons';

interface EmailConfigTabProps {
  emailConfig: any;
  setEmailConfig: React.Dispatch<React.SetStateAction<any>>;
  setIsEmailDirty: (dirty: boolean) => void;
  n8nWebhookUrl: string;
  onN8nWebhookChange: (url: string) => void;
}

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors';

export const EmailConfigTab: React.FC<EmailConfigTabProps> = ({
  emailConfig,
  setEmailConfig,
  setIsEmailDirty,
  n8nWebhookUrl,
  onN8nWebhookChange,
}) => {
  const [showSmtpPass, setShowSmtpPass] = useState(false);

  if (!emailConfig) return null;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* SMTP Configuration */}
      <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
        <h2 className="text-sm font-bold text-ink flex items-center gap-2">
          <EnvelopeIcon className="w-5 h-5 text-brand-teal" />
          Cấu hình SMTP (Email)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              SMTP Host
            </label>
            <input
              type="text"
              value={emailConfig.SMTP_HOST || ''}
              onChange={(e) => {
                setEmailConfig({ ...emailConfig, SMTP_HOST: e.target.value });
                setIsEmailDirty(true);
              }}
              className={inputCls}
              placeholder="smtp.gmail.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              SMTP Port
            </label>
            <input
              type="text"
              value={emailConfig.SMTP_PORT || ''}
              onChange={(e) => {
                setEmailConfig({ ...emailConfig, SMTP_PORT: e.target.value });
                setIsEmailDirty(true);
              }}
              className={inputCls}
              placeholder="587"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              SMTP User
            </label>
            <input
              type="text"
              value={emailConfig.SMTP_USER || ''}
              onChange={(e) => {
                setEmailConfig({ ...emailConfig, SMTP_USER: e.target.value });
                setIsEmailDirty(true);
              }}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              SMTP Password
            </label>
            <div className="relative">
              <input
                type={showSmtpPass ? 'text' : 'password'}
                value={emailConfig.SMTP_PASS || ''}
                onChange={(e) => {
                  setEmailConfig({ ...emailConfig, SMTP_PASS: e.target.value });
                  setIsEmailDirty(true);
                }}
                className={`${inputCls} pr-10`}
                placeholder="********"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowSmtpPass((v) => !v)}
                aria-label={showSmtpPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                title={showSmtpPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-ink-soft hover:text-accent transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                {showSmtpPass ? (
                  <EyeSlashIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Email From (Sender Name)
            </label>
            <input
              type="text"
              value={emailConfig.SMTP_FROM || ''}
              onChange={(e) => {
                setEmailConfig({ ...emailConfig, SMTP_FROM: e.target.value });
                setIsEmailDirty(true);
              }}
              className={inputCls}
              placeholder='"Thanh Pho Ca Phe" <no-reply@thanhphocaphe.vn>'
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="secure"
              checked={emailConfig.SMTP_SECURE === 'true' || emailConfig.SMTP_SECURE === true}
              onChange={(e) => {
                setEmailConfig({ ...emailConfig, SMTP_SECURE: e.target.checked });
                setIsEmailDirty(true);
              }}
              className="w-4 h-4 accent-accent border-brand-border rounded cursor-pointer focus:ring-2 focus:ring-accent/30 focus:outline-none"
            />
            <label
              htmlFor="secure"
              className="text-sm font-medium text-ink cursor-pointer"
            >
              Secure Protocol (SSL/TLS)
            </label>
          </div>
        </div>
      </section>

      {/* n8n Webhook Configuration */}
      <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
        <h2 className="text-sm font-bold text-ink flex items-center gap-2">
          <CpuChipIcon className="w-5 h-5 text-brand-teal" />
          Tích hợp Chatbot AI (n8n)
        </h2>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="n8n-webhook"
              className="block text-xs font-semibold text-ink-soft mb-1"
            >
              Webhook URL
            </label>
            <input
              id="n8n-webhook"
              type="text"
              value={n8nWebhookUrl || ''}
              onChange={(e) => onN8nWebhookChange(e.target.value)}
              placeholder="https://your-n8n-instance.com/webhook/..."
              className={`${inputCls} font-mono`}
            />
            <p className="mt-2 text-xs text-ink-soft">
              URL này kết nối khung chat của cư dân với workflow n8n để xử lý phản hồi tự động.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default EmailConfigTab;
