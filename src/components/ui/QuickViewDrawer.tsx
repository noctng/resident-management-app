import React, { useRef, useEffect } from 'react';
import { XMarkIcon } from '../icons';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface QuickViewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  width?: 'md' | 'lg' | 'xl';
}

const widthClasses = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export const QuickViewDrawer: React.FC<QuickViewDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  action,
  children,
  width = 'lg',
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(drawerRef, isOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in flex justify-end"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={drawerRef}
        className={[
          'w-full bg-surface h-full shadow-elevation-overlay border-l border-brand-border flex flex-col',
          'animate-slide-up',
          widthClasses[width],
        ].join(' ')}
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-brand-border bg-surface-alt/40 flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-4">
            <h3 className="font-serif text-lg font-bold text-ink truncate">{title}</h3>
            {subtitle && <div className="text-xs text-ink-soft mt-0.5">{subtitle}</div>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {action}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-ink-soft hover:text-ink hover:bg-surface-alt rounded-lg transition-colors cursor-pointer"
              aria-label="Đóng"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

export default QuickViewDrawer;
