import React from 'react';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  padding?: CardPadding;
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
  hover?: boolean;
}

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3.5',
  md: 'p-5',
  lg: 'p-6',
};

export const Card: React.FC<CardProps> = ({
  padding = 'md',
  className = '',
  onClick,
  hover = false,
  children,
}) => (
  <div
    onClick={onClick}
    className={[
      'bg-surface rounded-[10px] border border-brand-border shadow-elevation-surface',
      hover ? 'hover:border-accent/40 hover:shadow-elevation-raised transition-all duration-150' : '',
      onClick ? 'cursor-pointer' : '',
      paddingClasses[padding],
      className,
    ].join(' ')}
  >
    {children}
  </div>
);

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  className = '',
}) => (
  <div
    className={`flex items-center justify-between gap-3 border-b border-brand-border pb-3 mb-4 ${className}`}
  >
    <div className="min-w-0">
      <h3 className="font-serif text-[16px] font-semibold text-ink truncate">{title}</h3>
      {subtitle && <p className="text-xs text-ink-soft mt-0.5">{subtitle}</p>}
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

type StatCardVariant = 'default' | 'hero';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  subValue?: string;
  icon?: React.FC<{ className?: string }>;
  iconBg?: string;
  iconColor?: string;
  onClick?: () => void;
  trend?: React.ReactNode;
  deltaClass?: 'up' | 'down';
  variant?: StatCardVariant;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  icon: Icon,
  iconBg,
  iconColor,
  onClick,
  trend,
  deltaClass = 'up',
  variant = 'default',
}) => {
  const isHero = variant === 'hero';
  return (
    <div
      onClick={onClick}
      className={[
        isHero
          ? 'bg-accent-soft/40 border-accent/30 shadow-elevation-raised'
          : 'bg-surface border-brand-border shadow-elevation-surface',
        'rounded-[10px] p-4 transition-all duration-150',
        onClick ? 'cursor-pointer hover:border-accent/40 hover:shadow-elevation-raised' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={
            isHero
              ? 'text-sm font-semibold text-accent-ink'
              : 'text-xs text-ink-soft font-medium'
          }
        >
          {label}
        </div>
        {Icon && (
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
              iconBg || 'bg-brand-teal-soft'
            } ${iconColor || 'text-brand-teal'}`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
        {!Icon && trend && <div className="flex-shrink-0">{trend}</div>}
      </div>

      <div
        className={
          isHero
            ? 'font-serif text-[40px] font-bold text-ink leading-none mt-2'
            : 'font-serif text-[28px] font-bold text-ink mt-1.5 leading-none'
        }
      >
        {value}
      </div>

      {subValue && (
        <div
          className={`text-[11.5px] mt-2 font-mono font-medium ${
            deltaClass === 'down' ? 'text-brand-danger' : 'text-brand-success'
          }`}
        >
          {subValue}
        </div>
      )}
    </div>
  );
};

export default Card;
