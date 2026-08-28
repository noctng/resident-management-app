import React from 'react';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  className?: string;
  label?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className = '',
  label,
}) => (
  <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
    <svg
      className={`animate-spin text-accent${sizeClasses[size]}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
    {label && <p className="text-sm text-ink-soft">{label}</p>}
  </div>
);

/** Full-page centered loading screen */
export const PageLoader: React.FC<{ label?: string }> = ({ label = 'Đang tải...' }) => (
  <div className="flex items-center justify-center min-h-[400px]">
    <LoadingSpinner size="lg" label={label} />
  </div>
);

/** Full-screen loading for initial app load */
export const FullscreenLoader: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex items-center justify-center h-screen bg-bg">
    <LoadingSpinner size="lg" label={label} />
  </div>
);

export default LoadingSpinner;
