import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-ink-soft mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-faint">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`block w-full rounded-[8px] border text-sm transition-all duration-150
              ${icon ? 'pl-9' : 'pl-3'} pr-3 py-2 bg-surface-alt text-ink placeholder-ink-faint
              ${
                error
                  ? 'border-brand-danger text-brand-danger focus:ring-brand-danger'
                  : 'border-brand-border focus:ring-2 focus:ring-accent focus:border-accent'
              }
              outline-none disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-brand-danger mt-1">{error}</p>}
        {helperText && !error && <p className="text-xs text-ink-soft mt-1">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
