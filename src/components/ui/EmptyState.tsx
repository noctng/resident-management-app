import React from 'react';

interface EmptyStateProps {
  icon?: React.FC<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
    {Icon && (
      <div className="w-16 h-16 rounded-2xl bg-surface-alt flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-ink-faint" />
      </div>
    )}
    <h3 className="text-base font-semibold text-ink mb-1">{title}</h3>
    {description && (
      <p className="text-sm text-ink-soft max-w-sm">{description}</p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default EmptyState;
