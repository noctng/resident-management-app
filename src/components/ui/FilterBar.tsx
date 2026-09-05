import React from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '../icons';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterSelectConfig {
  key: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

interface FilterBarProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  filters?: FilterSelectConfig[];
  onResetAll?: () => void;
  activeCount?: number;
  className?: string;
  children?: React.ReactNode;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm...',
  filters = [],
  onResetAll,
  activeCount = 0,
  className = '',
  children,
}) => {
  const hasActive = activeCount > 0 || (searchQuery && searchQuery.trim().length > 0);

  return (
    <div
      className={`bg-surface border border-brand-border rounded-xl p-3 shadow-elevation-surface flex flex-wrap items-center justify-between gap-3 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[240px]">
        {/* Search Input */}
        {onSearchChange !== undefined && (
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <MagnifyingGlassIcon className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-8 py-1.5 bg-surface-alt/60 border border-brand-border rounded-lg text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink p-0.5 rounded cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Filter Dropdowns */}
        {filters.map((filter) => (
          <div key={filter.key} className="flex items-center gap-1.5">
            <select
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className="bg-surface-alt/60 border border-brand-border rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors cursor-pointer"
            >
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {children}
      </div>

      {/* Reset Button */}
      {hasActive && onResetAll && (
        <button
          type="button"
          onClick={onResetAll}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-accent hover:text-accent-hover bg-accent-soft/40 hover:bg-accent-soft rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <XMarkIcon className="w-3.5 h-3.5" />
          <span>Đặt lại lọc</span>
        </button>
      )}
    </div>
  );
};

export default FilterBar;
