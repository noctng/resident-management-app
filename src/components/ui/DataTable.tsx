import React, { useMemo, useState } from 'react';
import EmptyState from './EmptyState';

export type SortDirection = 'asc' | 'desc';
export type Density = 'comfortable' | 'compact';

export interface DataTableColumn<T> {
  /** Stable column id (used for sort state). */
  key: string;
  /** Header content (string or node). */
  header: React.ReactNode;
  /** Cell alignment. */
  align?: 'left' | 'right' | 'center';
  /** Enable sorting on this column (requires `sortValue`). */
  sortable?: boolean;
  /** Value used for sorting; required when `sortable` is true. */
  sortValue?: (row: T) => string | number;
  /** Cell renderer. */
  render: (row: T) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  /** Optional fixed width (e.g. '120px' / '12%'). */
  width?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string | number;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  /** Number of skeleton rows shown while loading (default 6). */
  loadingRows?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.FC<{ className?: string }>;
  /** Rows per page (0 = disable pagination). */
  pageSize?: number;
  initialDensity?: Density;
  stickyHeader?: boolean;
  className?: string;
  /** Optional toolbar rendered above the table (search, actions...). */
  toolbar?: React.ReactNode;
}

const alignClass: Record<NonNullable<DataTableColumn<unknown>['align']>, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

const cellPad: Record<Density, string> = {
  comfortable: 'px-4 py-3',
  compact: 'px-3 py-2',
};
const headPad: Record<Density, string> = {
  comfortable: 'px-4 py-2.5',
  compact: 'px-3 py-2',
};

export function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  isLoading = false,
  loadingRows = 6,
  emptyTitle = 'Không có dữ liệu',
  emptyDescription,
  emptyIcon,
  pageSize = 10,
  initialDensity = 'comfortable',
  stickyHeader = false,
  className = '',
  toolbar,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [density, setDensity] = useState<Density>(initialDensity);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return data;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv), 'vi') * dir;
    });
  }, [data, columns, sortKey, sortDir]);

  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const safePage = Math.min(page, totalPages - 1);
  const pageRows =
    pageSize > 0 ? sorted.slice(safePage * pageSize, safePage * pageSize + pageSize) : sorted;

  const toggleSort = (col: DataTableColumn<T>) => {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
    setPage(0);
  };

  const isEmpty = !isLoading && sorted.length === 0;

  return (
    <div className={`bg-surface border border-brand-border rounded-[10px] shadow-elevation-surface ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 border-b border-brand-border">
          <div className="flex-1 min-w-[200px]">{toolbar}</div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-soft whitespace-nowrap">
              {sorted.length} kết quả
            </span>
            <button
              type="button"
              onClick={() => setDensity((d) => (d === 'comfortable' ? 'compact' : 'comfortable'))}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-xs text-ink-soft border border-brand-border hover:bg-surface-alt transition-colors cursor-pointer"
              title="Chuyển đổi mật độ hiển thị"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h12M4 10h12M4 14h12" />
              </svg>
              {density === 'comfortable' ? 'Thưa' : 'Dày'}
            </button>
          </div>
        </div>

      <div
        className={`w-full overflow-x-auto ${stickyHeader ? 'overflow-y-auto max-h-[70vh]' : ''}`}
      >
        <table className="w-full text-left text-[13px] text-ink border-collapse">
          <thead
            className={`bg-surface-alt text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-soft select-none ${
              stickyHeader ? 'sticky top-0 z-10' : ''
            }`}
          >
            <tr className="divide-x divide-brand-border">
              {columns.map((col) => {
                const active = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    style={col.width ? { width: col.width } : undefined}
                    className={`${headPad[density]} whitespace-nowrap align-middle ${alignClass[col.align ?? 'left']} ${
                      col.sortable ? 'cursor-pointer hover:text-ink transition-colors' : ''
                    } ${col.headerClassName ?? ''}`}
                    onClick={() => toggleSort(col)}
                  >
                    <span className={`inline-flex items-center gap-1 ${col.align === 'right' ? 'flex-row-reverse' : ''}`}>
                      {col.header}
                      {col.sortable && (
                        <svg
                          className={`w-3.5 h-3.5 transition-transform ${active ? 'text-accent' : 'text-ink-faint'} ${
                            active && sortDir === 'asc' ? 'rotate-180' : ''
                          }`}
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14V6M6 10l4 4 4-4" />
                        </svg>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>

          {isLoading ? (
            <tbody className="divide-y divide-brand-border bg-surface">
              {Array.from({ length: loadingRows }).map((_, i) => (
                <tr key={`sk-${i}`}>
                  {columns.map((col) => (
                    <td key={col.key} className={`${cellPad[density]} align-middle ${col.cellClassName ?? ''}`}>
                      <div className="h-3.5 rounded bg-surface-alt animate-pulse" style={{ width: '70%' }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ) : isEmpty ? (
            <tbody>
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody className="divide-y divide-brand-border bg-surface">
              {pageRows.map((row, idx) => (
                <tr
                  key={rowKey(row, idx)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`transition-colors duration-150 hover:bg-accent/5 ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`${cellPad[density]} align-middle ${alignClass[col.align ?? 'left']} ${
                        col.cellClassName ?? ''
                      }`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>

      {pageSize > 0 && !isEmpty && !isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-brand-border">
          <span className="text-xs text-ink-soft">
            Trang {safePage + 1} / {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-3 py-1.5 rounded-[8px] text-xs border border-brand-border text-ink-soft hover:bg-surface-alt transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="px-3 py-1.5 rounded-[8px] text-xs border border-brand-border text-ink-soft hover:bg-surface-alt transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
