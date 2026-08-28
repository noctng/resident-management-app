import React from 'react';

// ── Table Container ─────────────────────────────────────────────────────────

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  className?: string;
  wrapperClassName?: string;
}

export const Table: React.FC<TableProps> = ({
  className = '',
  wrapperClassName = '',
  children,
  ...rest
}) => {
  return (
    <div
      className={`w-full overflow-x-auto rounded-[10px] border border-brand-border bg-white shadow-[0_1px_2px_rgba(20,30,25,0.04),0_6px_20px_-8px_rgba(20,30,25,0.12)] ${wrapperClassName}`}
    >
      <table
        className={`w-full text-left text-[13px] text-ink border-collapse ${className}`}
        {...rest}
      >
        {children}
      </table>
    </div>
  );
};

// ── Table Head ──────────────────────────────────────────────────────────────

export const TableHead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  children,
  ...rest
}) => {
  return (
    <thead
      className={`bg-surface-alt text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-soft border-b border-brand-border select-none ${className}`}
      {...rest}
    >
      {children}
    </thead>
  );
};

// ── Table Body ──────────────────────────────────────────────────────────────

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  children,
  ...rest
}) => {
  return (
    <tbody className={`divide-y divide-brand-border bg-white ${className}`} {...rest}>
      {children}
    </tbody>
  );
};

// ── Table Row ───────────────────────────────────────────────────────────────

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  isClickable?: boolean;
}

export const TableRow: React.FC<TableRowProps> = ({
  className = '',
  isClickable = false,
  children,
  ...rest
}) => {
  return (
    <tr
      className={`transition-colors duration-100 ${
        isClickable ? 'cursor-pointer hover:bg-[#F4E9DA]/40' : 'hover:bg-surface'
      } ${className}`}
      {...rest}
    >
      {children}
    </tr>
  );
};

// ── Table Header Cell ───────────────────────────────────────────────────────

export const TableHeaderCell: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className = '',
  children,
  ...rest
}) => {
  return (
    <th className={`px-4 py-2.5 whitespace-nowrap align-middle ${className}`} {...rest}>
      {children}
    </th>
  );
};

// ── Table Cell ──────────────────────────────────────────────────────────────

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className = '',
  children,
  ...rest
}) => {
  return (
    <td className={`px-4 py-3 align-middle ${className}`} {...rest}>
      {children}
    </td>
  );
};

// ── Table Toolbar ───────────────────────────────────────────────────────────

interface TableToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  count?: number;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const TableToolbar: React.FC<TableToolbarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm...',
  count,
  actions,
  children,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white border border-brand-border rounded-[10px] shadow-[0_1px_2px_rgba(20,30,25,0.04),0_6px_20px_-8px_rgba(20,30,25,0.12)] ${className}`}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-[240px] max-w-md">
        <div className="relative w-full">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-alt border border-brand-border rounded-[8px] text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
          />
          <svg
            className="w-4 h-4 text-ink-faint absolute left-2.5 top-2 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
        </div>
        {children}
      </div>

      <div className="flex items-center gap-3">
        {count !== undefined && (
          <span className="text-xs text-ink-soft whitespace-nowrap">{count} kết quả</span>
        )}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
};

export default Table;
