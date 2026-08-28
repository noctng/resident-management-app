import React, { useState } from 'react';
import {
  QrCodeIcon,
  KeyIcon,
  PencilIcon,
  SparklesIcon,
  CheckCircleIcon,
  DocumentTextIcon,
} from '../../components/icons';

interface QRConfigTabProps {
  qrConfig: any;
  setQrConfig: React.Dispatch<React.SetStateAction<any>>;
  setIsQRDirty: (dirty: boolean) => void;
}

const BANK_CODES = [
  { code: 'BIDV', name: 'BIDV - Đầu tư & Phát triển VN' },
  { code: 'VCB', name: 'Vietcombank' },
  { code: 'MB', name: 'MBBank' },
  { code: 'TCB', name: 'Techcombank' },
  { code: 'ACB', name: 'ACB' },
  { code: 'VPB', name: 'VPBank' },
  { code: 'TPB', name: 'TPBank' },
  { code: 'VIB', name: 'VIB' },
  { code: 'OCB', name: 'OCB' },
  { code: 'SHB', name: 'SHB' },
  { code: 'MSB', name: 'MSB' },
  { code: 'HDB', name: 'HDBank' },
  { code: 'LPB', name: 'LienVietPostBank' },
  { code: 'SEAB', name: 'SeABank' },
  { code: 'NAB', name: 'Nam A Bank' },
  { code: 'ABB', name: 'ABBank' },
  { code: 'VCCB', name: 'BVBank' },
  { code: 'VTB', name: 'VietinBank (CTG)' },
  { code: 'ICB', name: 'VietinBank' },
  { code: 'DAB', name: 'DongA Bank' },
];

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors';

const copyBtnCls =
  'absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-ink-soft hover:text-accent transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40';

export const QRConfigTab: React.FC<QRConfigTabProps> = ({
  qrConfig,
  setQrConfig,
  setIsQRDirty,
}) => {
  const [previewContent, setPreviewContent] = useState('EW-CAN03-01-082026');
  const [previewAmount, setPreviewAmount] = useState(450000);
  const [copied, setCopied] = useState<string | null>(null);

  if (!qrConfig) return null;

  const update = (key: string, value: string) => {
    setQrConfig((prev: any) => ({ ...prev, [key]: value }));
    setIsQRDirty(true);
  };

  const bankCode = qrConfig.QR_BANK_CODE || '';
  const bankAccount = qrConfig.QR_BANK_ACCOUNT || '';
  const accountName = qrConfig.QR_ACCOUNT_NAME || '';
  const sepayVA = qrConfig.QR_SEPAY_VA || '';

  // When SePay VA is configured, use it for QR (routes through SePay system)
  const effectiveAccount = sepayVA || bankAccount;
  const effectiveBankCode = sepayVA ? (qrConfig.QR_SEPAY_BANK_CODE || bankCode) : bankCode;

  const hasQRConfig = effectiveBankCode && effectiveAccount;

  const qrPreviewUrl = hasQRConfig
    ? `https://img.vietqr.io/image/${effectiveBankCode}-${effectiveAccount}-compact2.png?amount=${previewAmount}&addInfo=${encodeURIComponent(previewContent)}&accountName=${encodeURIComponent(accountName)}`
    : null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Thông tin tài khoản ngân hàng */}
      <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <QrCodeIcon className="w-5 h-5 text-brand-teal" />
            Tài Khoản Ngân Hàng Nhận Tiền
          </h2>
          <p className="text-xs text-ink-soft mt-1">
            Thông tin tài khoản dùng để tạo mã QR VietQR trên hóa đơn thanh toán.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Mã Ngân Hàng (Bank Code) <span className="text-brand-danger">*</span>
            </label>
            <select
              value={bankCode}
              onChange={(e) => update('QR_BANK_CODE', e.target.value)}
              className={`${inputCls} cursor-pointer`}
            >
              <option value="">-- Chọn ngân hàng --</option>
              {BANK_CODES.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-ink-soft">
              Ngân hàng liên kết với SePay của bạn
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Số Tài Khoản (STK) <span className="text-brand-danger">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => update('QR_BANK_ACCOUNT', e.target.value)}
                className={`${inputCls} pr-10 font-mono tracking-wider`}
                placeholder="0123456789"
              />
              {bankAccount && (
                <button
                  type="button"
                  onClick={() => handleCopy(bankAccount, 'stk')}
                  aria-label={copied === 'stk' ? 'Đã sao chép' : 'Sao chép số tài khoản'}
                  className={copyBtnCls}
                >
                  {copied === 'stk' ? (
                    <CheckCircleIcon className="w-4 h-4 text-brand-success" />
                  ) : (
                    <DocumentTextIcon className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Tên Chủ Tài Khoản
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => update('QR_ACCOUNT_NAME', e.target.value)}
              className={`${inputCls} uppercase tracking-wide`}
              placeholder="NGUYEN VAN A"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Nhập thủ công mã ngân hàng
            </label>
            <input
              type="text"
              value={bankCode}
              onChange={(e) => update('QR_BANK_CODE', e.target.value.toUpperCase())}
              className={`${inputCls} font-mono`}
              placeholder="VCB, MB, BIDV..."
            />
            <p className="mt-1.5 text-xs text-ink-soft">
              Nếu không có trong danh sách trên
            </p>
          </div>
        </div>
      </section>

      {/* SePay Virtual Account - KEY SECTION */}
      <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between">
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <KeyIcon className="w-5 h-5 text-brand-teal" />
            Kết Nối SePay (Tài Khoản Ảo)
          </h2>
          <span className="text-xs bg-accent-soft text-accent-ink px-2.5 py-1 rounded-full font-semibold">
            Quan trọng
          </span>
        </div>
        <p className="text-xs text-ink-soft">
          Để SePay tự động nhận diện và gạch nợ hóa đơn khi cư dân quét QR chuyển khoản, bạn cần
          cấu hình tài khoản ảo (Virtual Account) từ SePay.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Tài Khoản Ảo SePay (subAccount)
            </label>
            <div className="relative">
              <input
                type="text"
                value={sepayVA}
                onChange={(e) => update('QR_SEPAY_VA', e.target.value)}
                className={`${inputCls} pr-10 font-mono`}
                placeholder="SBSEPAYPZW5LM83SUQE"
              />
              {sepayVA && (
                <button
                  type="button"
                  onClick={() => handleCopy(sepayVA, 'va')}
                  aria-label={copied === 'va' ? 'Đã sao chép' : 'Sao chép tài khoản ảo'}
                  className={copyBtnCls}
                >
                  {copied === 'va' ? (
                    <CheckCircleIcon className="w-4 h-4 text-brand-success" />
                  ) : (
                    <DocumentTextIcon className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
            <p className="mt-1.5 text-xs text-ink-soft">
              Lấy từ{' '}
              <a
                href="https://my.sepay.vn"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline hover:text-accent-hover"
              >
                my.sepay.vn
              </a>{' '}
              → Tài khoản ngân hàng → Tài khoản ảo (VA)
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1">
              Mã ngân hàng SePay (nếu khác)
            </label>
            <input
              type="text"
              value={qrConfig.QR_SEPAY_BANK_CODE || ''}
              onChange={(e) => update('QR_SEPAY_BANK_CODE', e.target.value.toUpperCase())}
              className={`${inputCls} font-mono`}
              placeholder={bankCode || 'BIDV'}
            />
            <p className="mt-1.5 text-xs text-ink-soft">
              Để trống nếu dùng cùng mã ngân hàng ở trên
            </p>
          </div>
        </div>

        {/* How SePay VA works */}
        <div className="bg-surface-alt/60 border border-brand-border rounded-xl p-4 text-xs text-ink-soft leading-relaxed">
          <p className="text-sm font-semibold text-ink mb-2">
            Cách lấy Tài Khoản Ảo SePay:
          </p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>
              Đăng nhập{' '}
              <a
                href="https://my.sepay.vn"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline font-medium hover:text-accent-hover"
              >
                my.sepay.vn
              </a>{' '}
              → mục <strong>Tài khoản ngân hàng</strong>
            </li>
            <li>
              Nhấn vào tài khoản ngân hàng đã liên kết (ví dụ: BIDV{' '}
              <code className="bg-surface border border-brand-border px-1 rounded text-[11px] font-mono">
                0000000001
              </code>
              )
            </li>
            <li>
              Chuyển sang tab <strong>"Tài khoản ảo (VA)"</strong> — sao chép chuỗi{' '}
              <code className="bg-surface border border-brand-border px-1 rounded text-[11px] font-mono">
                SBSEPAY...
              </code>
            </li>
            <li>
              Dán vào ô <strong>"Tài Khoản Ảo SePay"</strong> ở trên và nhấn Lưu
            </li>
          </ol>
        </div>

        {sepayVA && (
          <div className="flex items-start gap-2 rounded-lg px-3 py-2 text-sm bg-brand-success-soft border border-brand-success/20 text-brand-success">
            <CheckCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              <strong>Đã cấu hình tài khoản ảo SePay.</strong> Mã QR sẽ được tạo qua tài khoản ảo{' '}
              <code className="font-mono bg-surface px-1 rounded text-xs">
                {sepayVA}
              </code>{' '}
              để SePay tự động nhận diện.
            </p>
          </div>
        )}
      </section>

      {/* Transfer content syntax */}
      <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <PencilIcon className="w-5 h-5 text-brand-teal" />
            Cú Pháp Nội Dung Chuyển Khoản
          </h2>
          <p className="text-xs text-ink-soft mt-1">
            Hệ thống tự động tạo nội dung chuyển khoản theo cú pháp chuẩn để Webhook SePay nhận diện
            căn hộ và gạch nợ tự động.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              prefix: 'EW',
              label: 'Điện Nước',
              example: 'EW-CAN03-01-082026',
              cls: 'bg-brand-teal-soft border-brand-teal/20 text-brand-teal',
            },
            {
              prefix: 'UB',
              label: 'Hóa Đơn Tổng Hợp',
              example: 'UB-CAN03-01-082026',
              cls: 'bg-accent-soft border-accent/20 text-accent-ink',
            },
            {
              prefix: 'CAN',
              label: 'Căn hộ (chung)',
              example: 'CAN03-01',
              cls: 'bg-brand-success-soft border-brand-success/20 text-brand-success',
            },
          ].map((item) => (
            <div key={item.prefix} className={`p-3 rounded-xl border ${item.cls}`}>
              <div className="text-xs font-bold mb-1">
                {item.prefix} — {item.label}
              </div>
              <code className="text-sm font-mono">{item.example}</code>
            </div>
          ))}
        </div>

        <p className="text-xs text-ink-soft">
          Ví dụ cư dân <strong>CAN03-01</strong> thanh toán điện nước tháng 8/2026 → nội dung
          chuyển khoản:{' '}
          <code className="bg-surface-alt border border-brand-border px-1.5 py-0.5 rounded font-mono text-ink">
            EW-CAN03-01-082026
          </code>
        </p>
      </section>

      {/* QR Preview */}
      {hasQRConfig && (
        <section className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <QrCodeIcon className="w-5 h-5 text-brand-teal" />
            Xem Trước Mã QR Thanh Toán
          </h2>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Preview controls */}
            <div className="flex-1 w-full space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Nội dung chuyển khoản mẫu
                </label>
                <input
                  type="text"
                  value={previewContent}
                  onChange={(e) => setPreviewContent(e.target.value)}
                  className={`${inputCls} font-mono`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Số tiền mẫu (VND)
                </label>
                <input
                  type="number"
                  value={previewAmount}
                  onChange={(e) => setPreviewAmount(Number(e.target.value))}
                  className={inputCls}
                />
              </div>
              <div className="bg-surface-alt/60 border border-brand-border rounded-xl p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-soft">Tài khoản:</span>
                  <span className="font-mono text-ink">{effectiveAccount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-soft">Ngân hàng:</span>
                  <span className="font-mono text-ink">{effectiveBankCode}</span>
                </div>
                {sepayVA && (
                  <div className="flex justify-between">
                    <span className="text-ink-soft">Qua SePay VA:</span>
                    <span className="flex items-center gap-1 text-xs text-brand-success font-mono">
                      <CheckCircleIcon className="w-3.5 h-3.5" /> Đã kết nối
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-ink-soft">Nội dung:</span>
                  <span className="font-mono text-ink text-xs">{previewContent}</span>
                </div>
              </div>
              <p className="text-xs text-ink-soft flex items-start gap-1.5">
                <SparklesIcon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-accent" />
                Thay đổi nội dung mẫu để xem QR tương ứng từng loại hóa đơn
              </p>
            </div>

            {/* QR image */}
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-2 rounded-lg border border-brand-border">
                {qrPreviewUrl && (
                  <img
                    src={qrPreviewUrl}
                    alt="QR Code Preview"
                    className="w-56 h-56 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://via.placeholder.com/250x250?text=QR+Error';
                    }}
                  />
                )}
              </div>
              <p className="text-xs text-ink-soft text-center max-w-[224px]">
                Đây là mã QR mẫu — mã thật sẽ được tạo tự động trên từng hóa đơn
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default QRConfigTab;
