import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  breadcrumb,
  className = '',
}) => (
  <div
    className={`flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between ${className}`}
  >
    <div className="min-w-0">
      {breadcrumb && <div className="mb-1">{breadcrumb}</div>}
      <h1 className="text-xl font-bold text-ink leading-tight truncate">
        {title}
      </h1>
      {subtitle && <p className="text-sm text-ink-soft mt-0.5">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 flex-shrink-0 mt-3 sm:mt-0">{actions}</div>}
  </div>
);

export default PageHeader;
