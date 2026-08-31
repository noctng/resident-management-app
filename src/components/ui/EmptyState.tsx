import React from 'react';

type EmptyTone = 'neutral' | 'accent' | 'teal';
type EmptySize = 'sm' | 'md' | 'lg';

interface EmptyStateProps {
  icon?: React.FC<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  tone?: EmptyTone;
  size?: EmptySize;
  className?: string;
}

const toneMap: Record<EmptyTone, string> = {
  neutral: 'bg-surface-alt text-ink-faint',
  accent: 'bg-accent-soft text-accent-ink',
  teal: 'bg-brand-teal-soft text-brand-teal',
};

const sizeMap: Record<EmptySize, { box: string; icon: string; title: string }> = {
  sm: { box: 'w-12 h-12 rounded-xl', icon: 'w-6 h-6', title: 'text-sm' },
  md: { box: 'w-16 h-16 rounded-2xl', icon: 'w-8 h-8', title: 'text-base' },
  lg: { box: 'w-20 h-20 rounded-3xl', icon: 'w-10 h-10', title: 'text-lg' },
};

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  tone = 'neutral',
  size = 'md',
  className = '',
}) => {
  const s = sizeMap[size];
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      {Icon && (
        <div className={`${s.box} ${toneMap[tone]} flex items-center justify-center mb-4`}>
          <Icon className={s.icon} />
        </div>
      )}
      <h3 className={`${s.title} font-semibold text-ink mb-1`}>{title}</h3>
      {description && (
        <p className="text-sm text-ink-soft max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export default EmptyState;
