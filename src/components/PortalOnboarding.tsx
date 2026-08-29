import React, { useState, useEffect } from 'react';
import {
  BuildingOfficeIcon,
  BoltIcon,
  DocumentChartBarIcon,
  NewspaperIcon,
  XMarkIcon,
} from './icons';

const STORAGE_KEY = 'portal_onboarding_done';

interface Step {
  icon: React.FC<{ className?: string }>;
  title: string;
  desc: string;
}

const STEPS: Step[] = [
  {
    icon: BuildingOfficeIcon,
    title: 'Chọn căn hộ',
    desc: 'Xác định căn hộ của bạn để xem hóa đơn, tiện ích và phản ánh đúng chủ sở hữu.',
  },
  {
    icon: BoltIcon,
    title: 'Điện nước',
    desc: 'Theo dõi chỉ số và hình ảnh hoá đơn điện nước hàng tháng của căn hộ.',
  },
  {
    icon: DocumentChartBarIcon,
    title: 'Hóa đơn tổng hợp',
    desc: 'Xem và thanh toán các khoản phí quản lý, dịch vụ trong một màn hình.',
  },
  {
    icon: NewspaperIcon,
    title: 'Tin tức & phản ánh',
    desc: 'Cập nhật thông báo từ Ban Quản Lý và gửi phản ánh trực tiếp khi cần.',
  },
];

interface PortalOnboardingProps {
  apartmentCode: string;
  residentName: string;
}

export const PortalOnboarding: React.FC<PortalOnboardingProps> = ({
  apartmentCode,
  residentName,
}) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setOpen(true);
      }
    } catch {
      /* localStorage unavailable — skip onboarding silently */
    }
  }, []);

  const finish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const skip = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm motion-safe:animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Hướng dẫn sử dụng cổng thông tin cư dân"
    >
      <div className="w-full max-w-md bg-surface rounded-2xl border border-brand-border shadow-elevation-overlay overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 pb-0">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-accent">
              Chào mừng
            </p>
            <h2 className="mt-1 font-serif text-xl font-semibold text-ink truncate">
              Xin chào {residentName}
            </h2>
            <p className="text-xs text-ink-soft mt-0.5">
              Căn hộ <span className="font-mono font-semibold text-accent">{apartmentCode}</span> — 4 bước để bắt đầu
            </p>
          </div>
          <button
            onClick={skip}
            aria-label="Bỏ qua hướng dẫn"
            className="p-1.5 rounded-xl text-ink-faint hover:bg-surface-alt transition-colors cursor-pointer flex-shrink-0"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Step body */}
        <div className="px-5 py-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="p-3 rounded-xl bg-accent-soft text-accent flex-shrink-0">
              <Icon className="w-7 h-7" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-ink-faint font-mono">
                Bước {step + 1} / {STEPS.length}
              </p>
              <h3 className="font-semibold text-ink text-base">{current.title}</h3>
            </div>
          </div>
          <p className="text-sm text-ink-soft leading-relaxed">{current.desc}</p>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 mt-5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === step ? 'w-6 bg-accent' : i < step ? 'w-1.5 bg-accent/40' : 'w-1.5 bg-brand-border'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 px-5 pb-5">
          <button
            onClick={skip}
            className="px-4 h-tap inline-flex items-center justify-center text-sm font-medium text-ink-soft hover:text-ink transition-colors cursor-pointer"
          >
            Bỏ qua
          </button>
          <button
            onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
            className="px-5 h-tap inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            {isLast ? 'Bắt đầu' : 'Tiếp theo'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PortalOnboarding;
