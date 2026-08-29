import React, { useState, useEffect } from 'react';
import { bankApps, findBankAppsByCode, type BankApp } from '../data/bankApps';
import { XMarkIcon, QrCodeIcon, Squares2x2Icon, CheckCircleIcon } from './icons';
import type { UtilityRecord } from '../types';

interface QRConfig {
  QR_BANK_CODE?: string;
  QR_BANK_ACCOUNT?: string;
  QR_ACCOUNT_NAME?: string;
  /** SePay Virtual Account number — when set, QR routes through SePay for auto-reconciliation */
  QR_SEPAY_VA?: string;
  /** SePay bank code — overrides QR_BANK_CODE when SePay VA is used */
  QR_SEPAY_BANK_CODE?: string;
}

interface PaymentQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  type?: 'utility' | 'unified';
  amount: number;
  transferContent: string;
  apartmentCode: string;
  apartmentId?: string;
  month: number;
  year: number;
  qrConfig: QRConfig | null;
  onPaymentSuccess?: () => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

/**
 * Generate VietQR image URL
 * Uses img.vietqr.io API (same as backend vietQRService.js)
 */
const generateVietQRUrl = (
  bankCode: string,
  accountNumber: string,
  amount: number,
  transferContent: string,
  accountName?: string
): string => {
  const template = 'compact2';
  const baseUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-${template}.png`;
  const params = new URLSearchParams();
  if (amount > 0) params.append('amount', amount.toString());
  if (transferContent) params.append('addInfo', transferContent);
  if (accountName) params.append('accountName', accountName);
  const qs = params.toString();
  return qs ? `${baseUrl}?${qs}` : baseUrl;
};

/** Bank color palette for app icons */
const bankColors: Record<string, string> = {
  VCB: '#0066b3',
  MB: '#e31937',
  TCB: '#f58220',
  BIDV: '#0066b3',
  ACB: '#00a651',
  VPB: '#003d7a',
  TPB: '#ed1c24',
  ICB: '#005ba6',
  VIB: '#003d7a',
  OCB: '#0066b3',
  SHB: '#c8102e',
  MSB: '#005ba6',
  HDB: '#ed1c24',
  SCB: '#0066b3',
  LPB: '#0066b3',
  SEAB: '#00a651',
  CAKE: '#6c5ce7',
  TIMO: '#00b894',
};

/** Get initials from bank app name */
function getBankInitials(appName: string): string {
  return appName
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Small bank app button — uses location.href for iOS universal link support */
const BankAppButton: React.FC<{ app: BankApp; isConfigured: boolean }> = ({
  app,
  isConfigured,
}) => {
  const color = bankColors[app.bankCode] || '#6b7280';

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const deeplink = `https://dl.vietqr.io/pay?app=${app.appId}`;
    window.location.href = deeplink;
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-shadow duration-200 hover:shadow-md w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
        isConfigured
          ? 'border-brand-success/40 bg-brand-success-soft/50 hover:bg-brand-success-soft'
          : 'border-brand-border bg-surface hover:border-accent/60 hover:bg-surface-alt'
      }`}
    >
      {/* Bank icon circle */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
        style={{ backgroundColor: color }}
      >
        {getBankInitials(app.appName)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-ink truncate">
          {app.appName}
        </div>
        <div className="text-xs text-ink-soft truncate">{app.bankName}</div>
      </div>
      {isConfigured && (
        <span className="text-xs bg-brand-success text-white px-2 py-0.5 rounded-full shrink-0">
          Cấu hình
        </span>
      )}
      <svg
        className="w-4 h-4 text-ink-soft shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
};

const PaymentQRModal: React.FC<PaymentQRModalProps> = ({
  isOpen,
  onClose,
  title = 'Thanh Toán Điện Nước',
  type = 'utility',
  amount,
  transferContent,
  apartmentCode,
  apartmentId,
  month,
  year,
  qrConfig,
  onPaymentSuccess,
}) => {
  const [showAllApps, setShowAllApps] = useState(false);
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [qrNotice, setQrNotice] = useState<string | null>(null);

  // Reset states on open
  useEffect(() => {
    if (isOpen) {
      setIsPaidSuccess(false);
      setDownloading(false);
      setCopying(false);
      setQrNotice(null);
    }
  }, [isOpen]);


  // Real-time payment verification polling
  useEffect(() => {
    if (!isOpen || isPaidSuccess) return;

    let timer: any = null;
    let isCancelled = false;

    const checkPayment = async () => {
      try {
        if (type === 'unified' && apartmentId) {
          const res = await fetch(`/api/unified-billing/history/${apartmentId}`, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            const rec = data.data?.find((r: any) => r.month === month && r.year === year);
            if (rec && rec.status === 'PAID') {
              triggerSuccess();
              return;
            }
          }
        } else {
          // Utility payment check
          const res = await fetch('/api/utility-records', { credentials: 'include' });
          if (res.ok) {
            const records: UtilityRecord[] = await res.json();
            const rec = records.find(
              (r) =>
                (!apartmentId || r.apartmentId === apartmentId) &&
                r.month === month &&
                r.year === year
            );
            if (rec && rec.paymentStatus === 'PAID') {
              triggerSuccess();
              return;
            }
          }
        }
      } catch (e) {
        // Silently ignore network hiccup during polling
      }

      if (!isCancelled && !isPaidSuccess) {
        timer = setTimeout(checkPayment, 3000);
      }
    };

    const triggerSuccess = () => {
      setIsPaidSuccess(true);

      // Trigger native browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('🎉 Thanh toán thành công!', {
            body: `Căn hộ ${apartmentCode} đã thanh toán thành công hóa đơn ${
              type === 'unified' ? 'Hóa Đơn Tổng Hợp' : 'Điện Nước'
            } Tháng ${month}/${year} (${formatCurrency(amount)}).`,
            icon: '/logo.svg',
            tag: `payment-success-${month}-${year}`,
          });
        } catch (e) {
          console.warn('Native notification error:', e);
        }
      }

      // Play soft success chime
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, ctx.currentTime);
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.5);
        }
      } catch (e) {}

      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
    };

    timer = setTimeout(checkPayment, 2500);

    return () => {
      isCancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isOpen, isPaidSuccess, apartmentId, apartmentCode, month, year, type, amount, onPaymentSuccess]);

  if (!isOpen) return null;

  // Render Celebratory Success View
  if (isPaidSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border p-6 max-w-sm w-full text-center space-y-4 animate-scale-up">
          <div className="w-20 h-20 bg-brand-success-soft text-brand-success rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce">
            <CheckCircleIcon className="w-10 h-10" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-xl font-black text-ink">
              🎉 Thanh Toán Thành Công!
            </h3>
            <p className="text-xs text-ink-soft">
              Hệ thống đã nhận được tiền chuyển khoản và tự động gạch nợ thành công cho căn hộ{' '}
              <strong className="text-brand-success font-mono">{apartmentCode}</strong>.
            </p>
          </div>

          <div className="bg-surface-alt p-3.5 rounded-xl text-xs space-y-1.5 text-left border border-brand-border">
            <div className="flex justify-between">
              <span className="text-ink-soft">Loại hóa đơn:</span>
              <span className="font-bold text-ink">
                {type === 'unified' ? 'Hóa Đơn Tổng Hợp' : 'Điện Nước'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Kỳ thanh toán:</span>
              <span className="font-bold text-ink">Tháng {month}/{year}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Số tiền:</span>
              <span className="font-bold text-brand-success text-sm font-mono tabular-nums">
                {formatCurrency(amount)}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-brand-border">
              <span className="text-ink-soft">Trạng thái:</span>
              <span className="font-bold text-brand-success bg-brand-success-soft px-2 py-0.5 rounded-full">
                ✓ ĐÃ THANH TOÁN
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsPaidSuccess(false);
              onClose();
            }}
            className="w-full py-3 bg-accent hover:bg-accent-hover text-white rounded-lg font-bold text-sm transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            Hoàn tất & Đóng
          </button>
        </div>
      </div>
    );
  }

  const bankCode = qrConfig?.QR_BANK_CODE || '';
  const bankAccount = qrConfig?.QR_BANK_ACCOUNT || '';
  const accountName = qrConfig?.QR_ACCOUNT_NAME || '';
  const sepayVA = qrConfig?.QR_SEPAY_VA || '';
  const sepayBankCode = qrConfig?.QR_SEPAY_BANK_CODE || '';

  // When SePay VA is configured, use it as the account number so SePay
  // can intercept and identify the transaction for auto-reconciliation
  const effectiveAccount = sepayVA || bankAccount;
  const effectiveBankCode = sepayVA ? (sepayBankCode || bankCode) : bankCode;

  const hasQRConfig = effectiveBankCode && effectiveAccount;

  const qrImageUrl = hasQRConfig
    ? generateVietQRUrl(effectiveBankCode, effectiveAccount, amount, transferContent, accountName)
    : null;

  // Find matching bank apps for the configured bank code
  const configuredApps = hasQRConfig ? findBankAppsByCode(effectiveBankCode) : [];
  // Other apps (not matching configured bank)
  const otherApps = bankApps.filter((app) => !configuredApps.some((c) => c.appId === app.appId));
  // Show configured first, then popular others
  const displayApps = showAllApps
    ? [...configuredApps, ...otherApps]
    : [...configuredApps, ...otherApps.slice(0, 6)];

  // Helper to fetch QR image as Blob safely
  const fetchQRBlob = async (url: string): Promise<Blob> => {
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error('Fetch failed');
      return await res.blob();
    } catch {
      // Fallback: draw on canvas via Image element with CORS
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || 600;
            canvas.height = img.naturalHeight || 600;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas context unavailable');
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Canvas blob failed'));
            }, 'image/png');
          } catch (canvasErr) {
            reject(canvasErr);
          }
        };
        img.onerror = () => reject(new Error('Image failed to load on canvas'));
        img.src = url;
      });
    }
  };

  // Download / Save QR directly to mobile photo gallery / computer without opening a new tab
  const handleDownloadQR = async () => {
    if (!qrImageUrl) return;
    setDownloading(true);
    setQrNotice(null);
    try {
      const blob = await fetchQRBlob(qrImageUrl);
      const filename = `QR_${apartmentCode || 'CanHo'}_T${month}_${year}.png`;
      const file = new File([blob], filename, { type: 'image/png' });

      // Mobile share sheet if supported (allows saving to Photos/Gallery directly on iOS & Android)
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Mã QR Thanh Toán',
            text: `Mã QR thanh toán căn hộ ${apartmentCode}`,
          });
          setQrNotice('✅ Đã lưu/chia sẻ mã QR thành công!');
          setTimeout(() => setQrNotice(null), 3500);
          setDownloading(false);
          return;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') {
            setDownloading(false);
            return;
          }
        }
      }

      // Direct Blob download fallback
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);

      setQrNotice('✅ Đã tải mã QR về thiết bị thành công!');
      setTimeout(() => setQrNotice(null), 3500);
    } catch {
      setQrNotice('❌ Lỗi khi tải mã QR, vui lòng thử lại.');
      setTimeout(() => setQrNotice(null), 3500);
    } finally {
      setDownloading(false);
    }
  };

  // Copy QR Image to Clipboard so user can paste in Banking QR Scanner
  const handleCopyQR = async () => {
    if (!qrImageUrl) return;
    setCopying(true);
    setQrNotice(null);
    try {
      const blob = await fetchQRBlob(qrImageUrl);

      // Modern Clipboard API for image/png
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          setQrNotice('📋 Đã sao chép ảnh mã QR! Bạn có thể dán vào màn hình quét mã của app ngân hàng.');
          setTimeout(() => setQrNotice(null), 4000);
          setCopying(false);
          return;
        } catch (clipErr) {
          console.warn('Clipboard image write failed:', clipErr);
        }
      }

      // Fallback: Copy transfer text and notify user
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(transferContent);
        setQrNotice('📋 Đã sao chép nội dung chuyển khoản vào bộ nhớ tạm!');
        setTimeout(() => setQrNotice(null), 3500);
      }
    } catch {
      setQrNotice('❌ Không thể sao chép mã QR.');
      setTimeout(() => setQrNotice(null), 3500);
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface rounded-t-2xl sm:rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-sm overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-brand-border bg-surface-alt/50 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <QrCodeIcon className="w-5 h-5 text-accent" />
              <span>{title}</span>
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] text-accent-ink bg-accent-soft px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping"></span>
                <span>Tự động nhận diện thanh toán</span>
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-surface-alt transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4 custom-scrollbar">
          {/* Bill info */}
          <div className="bg-surface-alt rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-ink-soft">Căn hộ:</span>
              <span className="font-semibold text-ink font-mono">
                {apartmentCode}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-soft">Kỳ:</span>
              <span className="font-semibold text-ink">
                Tháng {month}/{year}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t border-brand-border pt-1.5">
              <span className="text-ink-soft">Số tiền:</span>
              <span className="font-bold text-brand-success text-base font-mono tabular-nums">
                {formatCurrency(amount)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-soft">Nội dung CK:</span>
              <span className="font-mono font-bold text-ink text-xs text-right max-w-[60%] break-all bg-surface px-1.5 py-0.5 rounded">
                {transferContent}
              </span>
            </div>
          </div>

          {/* QR Code */}
          {hasQRConfig && qrImageUrl && (
            <div className="flex flex-col items-center">
              <div className="bg-surface p-3 rounded-xl shadow-sm border border-brand-border">
                <img
                  src={qrImageUrl}
                  alt="QR Code thanh toán"
                  className="w-52 h-52 object-contain rounded-lg border border-brand-border bg-surface-alt"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>

              {/* Action Buttons: Lưu / Tải mã QR & Sao chép mã QR */}
              <div className="mt-3 flex items-center justify-center gap-2 w-full max-w-[280px]">
                <button
                  type="button"
                  onClick={handleDownloadQR}
                  disabled={downloading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-ink bg-surface border border-brand-border px-3 py-2 rounded-lg hover:bg-surface-alt transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50"
                  title="Tải ảnh mã QR trực tiếp về thiết bị"
                >
                  <svg className="w-4 h-4 text-ink-soft shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span>{downloading ? 'Đang lưu...' : 'Lưu mã QR'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyQR}
                  disabled={copying}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-ink bg-surface border border-brand-border px-3 py-2 rounded-lg hover:bg-surface-alt transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50"
                  title="Sao chép ảnh mã QR vào bộ nhớ tạm"
                >
                  <svg className="w-4 h-4 text-ink-soft shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                    />
                  </svg>
                  <span>{copying ? 'Đang chép...' : 'Sao chép QR'}</span>
                </button>
              </div>

              {/* Toast Notice Banner */}
              {qrNotice && (
                <div className="mt-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-center bg-ink text-white shadow-md animate-fade-in">
                  {qrNotice}
                </div>
              )}

              <p className="text-[11px] text-brand-success mt-2 text-center font-medium">
                ⏳ Đang lắng nghe giao dịch chuyển khoản...
              </p>
            </div>
          )}

          {!hasQRConfig && (
            <div className="bg-brand-warning-soft border border-brand-border rounded-xl p-3 text-center">
              <p className="text-sm text-brand-warning">
                ⚠️ Chưa cấu hình thông tin ngân hàng. Vui lòng liên hệ ban quản lý.
              </p>
            </div>
          )}


          {/* Bank App Buttons */}
          <div>
            <h4 className="text-sm font-semibold text-ink-soft mb-2 flex items-center gap-1.5">
              <Squares2x2Icon className="w-4 h-4" />
              Mở app ngân hàng
            </h4>
            <div className="space-y-2">
              {displayApps.map((app) => (
                <BankAppButton
                  key={app.appId}
                  app={app}
                  isConfigured={configuredApps.some((c) => c.appId === app.appId)}
                />
              ))}
            </div>
            {!showAllApps && otherApps.length > 6 && (
              <button
                onClick={() => setShowAllApps(true)}
                className="w-full mt-2 text-sm text-accent hover:text-accent-hover font-medium py-2 rounded-lg hover:bg-accent-soft/60 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                Xem thêm {otherApps.length - 6} app khác ▼
              </button>
            )}
            {showAllApps && (
              <button
                onClick={() => setShowAllApps(false)}
                className="w-full mt-2 text-sm text-ink-soft hover:text-ink font-medium py-2 rounded-lg hover:bg-surface-alt transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                Thu gọn ▲
              </button>
            )}
          </div>

          {/* Note */}
          <div className="bg-surface-alt rounded-xl p-3">
            <p className="text-xs text-ink-soft leading-relaxed">
              💡 <strong>Hướng dẫn thanh toán:</strong>
            </p>
            <ol className="text-xs text-ink-soft leading-relaxed mt-1.5 space-y-1 list-decimal list-inside">
              <li>
                <strong>Tải mã QR</strong> về điện thoại (nhấn nút ở trên)
              </li>
              <li>
                <strong>Nhấn app ngân hàng</strong> bên dưới để mở app
              </li>
              <li>
                Trong app ngân hàng, chọn <strong>"Quét QR" → "Chọn từ thư viện"</strong> và quét mã QR vừa tải
              </li>
              <li>
                Sau khi chuyển khoản thành công, màn hình sẽ <strong>tự động báo thành công</strong> ngay lập tức!
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentQRModal;
