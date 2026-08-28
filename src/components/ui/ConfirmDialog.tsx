import React, { createContext, useCallback, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setPending({ options, resolve });
    });
  }, []);

  const handleResponse = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => handleResponse(false)}
            />
            <div
              className="relative bg-surface rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4 border border-brand-border"
              onClick={(e) => e.stopPropagation()}
            >
              {pending.options.variant === 'danger' && (
                <div className="w-12 h-12 rounded-full bg-brand-danger-soft flex items-center justify-center mx-auto">
                  <svg
                    className="w-6 h-6 text-brand-danger"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                    />
                  </svg>
                </div>
              )}
              <div className="text-center">
                <h3 className="text-lg font-semibold text-ink">
                  {pending.options.title}
                </h3>
                {pending.options.description && (
                  <p className="text-sm text-ink-soft mt-1.5">
                    {pending.options.description}
                  </p>
                )}
              </div>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="secondary"
                  onClick={() => handleResponse(false)}
                  className="flex-1"
                >
                  {pending.options.cancelLabel ?? 'Hủy'}
                </Button>
                <Button
                  variant={pending.options.variant ?? 'primary'}
                  onClick={() => handleResponse(true)}
                  className="flex-1"
                >
                  {pending.options.confirmLabel ?? 'Xác nhận'}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </ConfirmContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
}
