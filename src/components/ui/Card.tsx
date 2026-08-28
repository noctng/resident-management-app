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
      'bg-white rounded-[10px] border border-brand-border shadow-[0_1px_2px_rgba(20,30,25,0.04),0_6px_20px_-8px_rgba(20,30,25,0.12)]',
      hover ? 'hover:border-accent/40 hover:shadow-md transition-all duration-150' : '',
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
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  onClick,
  trend,
  deltaClass = 'up',
}) => (
  <div
    onClick={onClick}
    className={[
      'bg-white border border-brand-border rounded-[10px] p-4 shadow-[0_1px_2px_rgba(20,30,25,0.04),0_6px_20px_-8px_rgba(20,30,25,0.12)]',
      onClick ? 'cursor-pointer hover:border-accent/40 transition-all' : '',
    ].join(' ')}
  >
    <div className="text-xs text-ink-soft flex items-center justify-between font-medium">
      <span>{label}</span>
      {trend && <span>{trend}</span>}
    </div>
    <div className="font-serif text-[28px] font-bold text-ink mt-1.5 leading-none">
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

export default Card;
