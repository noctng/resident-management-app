import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:opacity-90 shadow-sm font-semibold',
  secondary:
    'bg-surface-alt text-ink border border-brand-border hover:bg-surface-alt/80 font-semibold',
  danger: 'bg-brand-danger text-white hover:opacity-90 shadow-sm font-semibold',
  ghost: 'text-ink-soft hover:bg-surface-alt hover:text-ink font-semibold',
  outline:
    'border border-accent text-accent hover:bg-accent-soft/30 font-semibold',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1 text-xs gap-1',
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-3.5 py-2 text-[13px] gap-2',
  lg: 'px-5 py-2.5 text-sm gap-2',
};

const Spinner = ({ size }: { size: ButtonSize }) => {
  const s = size === 'xs' || size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <svg className={`${s} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      disabled,
      children,
      className = '',
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          'inline-flex items-center justify-center rounded-[8px]',
          'transition-all duration-150 cursor-pointer select-none',
          'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(' ')}
        {...rest}
      >
        {loading && iconPosition === 'left' && <Spinner size={size} />}
        {!loading && icon && iconPosition === 'left' && icon}
        {children}
        {!loading && icon && iconPosition === 'right' && icon}
        {loading && iconPosition === 'right' && <Spinner size={size} />}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
