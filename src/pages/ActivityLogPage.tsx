import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ActivityLog } from '../types';
import { api } from '../services/api';
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  CalendarIcon,
  UserIcon,
  ArrowDownTrayIcon,
  ShieldCheckIcon,
} from '../components/icons';
import { formatDate } from '../utils/formatters';

interface ActivityLogPageProps {
  logs?: ActivityLog[];
  onBack: () => void;
  initialUserId?: string;
}

type DateFilter = 'all' | 'today' | '7days' | '30days' | 'custom';

interface FilterOptions {
  users: { id: string; username: string; role: number }[];
  actions: string[];
  targetTypes: string[];
}

const ACTION_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  CREATE: { label: 'Thêm mới', color: 'text-brand-success', bg: 'bg-brand-success-soft border-brand-success' },
  CREATE_RESIDENT: { label: 'Thêm cư dân', color: 'text-brand-success', bg: 'bg-brand-success-soft border-brand-success' },
  CREATE_USER: { label: 'Tạo tài khoản', color: 'text-brand-success', bg: 'bg-brand-success-soft border-brand-success' },
  CREATE_CONTRACT: { label: 'Tạo hợp đồng', color: 'text-brand-success', bg: 'bg-brand-success-soft border-brand-success' },
  CREATE_BOOKING: { label: 'Tạo giữ chỗ', color: 'text-brand-success', bg: 'bg-brand-success-soft border-brand-success' },
  CREATE_DEPOSIT: { label: 'Tạo đặt cọc', color: 'text-brand-success', bg: 'bg-brand-success-soft border-brand-success' },
  CREATE_TRANSFER: { label: 'Tạo chuyển nhượng', color: 'text-brand-success', bg: 'bg-brand-success-soft border-brand-success' },
  CREATE_FEEDBACK: { label: 'Gửi phản ánh', color: 'text-brand-teal', bg: 'bg-brand-teal-soft border-brand-teal' },

  UPDATE: { label: 'Cập nhật', color: 'text-brand-warning', bg: 'bg-brand-warning-soft border-brand-warning' },
  UPDATE_RESIDENT: { label: 'Sửa cư dân', color: 'text-brand-warning', bg: 'bg-brand-warning-soft border-brand-warning' },
  UPDATE_RESIDENT_STATUS: { label: 'Đổi trạng thái cư dân', color: 'text-brand-warning', bg: 'bg-brand-warning-soft border-brand-warning' },
  UPDATE_USER_PERMISSION: { label: 'Phân quyền NV', color: 'text-accent', bg: 'bg-accent-soft border-accent' },
  UPDATE_CONTRACT: { label: 'Sửa hợp đồng', color: 'text-brand-warning', bg: 'bg-brand-warning-soft border-brand-warning' },
  UPDATE_AMENITY_ACCESS: { label: 'Quyền tiện ích', color: 'text-brand-warning', bg: 'bg-brand-warning-soft border-brand-warning' },

  DELETE: { label: 'Xóa', color: 'text-accent', bg: 'bg-accent-soft border-accent' },
  DELETE_RESIDENT: { label: 'Xóa cư dân', color: 'text-accent', bg: 'bg-accent-soft border-accent' },
  DELETE_USER: { label: 'Xóa nhân viên', color: 'text-accent', bg: 'bg-accent-soft border-accent' },

  USER_LOGIN: { label: 'Đăng nhập Admin', color: 'text-brand-teal', bg: 'bg-brand-teal-soft border-brand-teal' },
  RESIDENT_LOGIN: { label: 'Đăng nhập Portal', color: 'text-brand-teal', bg: 'bg-brand-teal-soft border-brand-teal' },
  LOGIN_FAILED: { label: 'Đăng nhập thất bại', color: 'text-brand-danger', bg: 'bg-brand-danger-soft border-brand-danger' },
  USER_LOGOUT: { label: 'Đăng xuất', color: 'text-ink-soft', bg: 'bg-surface-alt border-brand-border' },

  CHANGE_PASSWORD: { label: 'Đổi mật khẩu', color: 'text-accent', bg: 'bg-accent-soft border-accent' },
  RESET_PASSWORD: { label: 'Reset mật khẩu', color: 'text-accent', bg: 'bg-accent-soft border-accent' },
  RESET_RESIDENT_PASSWORD: { label: 'Reset MK cư dân', color: 'text-accent', bg: 'bg-accent-soft border-accent' },
  SYNC_RESIDENT_ACCOUNTS: { label: 'Đồng bộ tài khoản', color: 'text-brand-teal', bg: 'bg-brand-teal-soft border-brand-teal' },

  RESOLVE: { label: 'Xử lý', color: 'text-accent', bg: 'bg-accent-soft border-accent' },
  RESOLVE_FEEDBACK: { label: 'Xử lý phản ánh', color: 'text-accent', bg: 'bg-accent-soft border-accent' },
  HANDOVER_APARTMENT: { label: 'Bàn giao căn hộ', color: 'text-brand-success', bg: 'bg-brand-success-soft border-brand-success' },
  IMPORT_RESIDENTS: { label: 'Import Excel', color: 'text-brand-teal', bg: 'bg-brand-teal-soft border-brand-teal' },
};

const ActivityLogPage: React.FC<ActivityLogPageProps> = ({ onBack, initialUserId }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 30;

  // Extract userId from URL if provided (e.g. #/admin/logs?userId=user_123)
  const getInitialUserId = () => {
    if (initialUserId) return initialUserId;
    try {
      const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
      if (hashQuery) {
        const p = new URLSearchParams(hashQuery).get('userId');
        if (p) return p;
      }
      const p = new URLSearchParams(window.location.search).get('userId');
      if (p) return p;
    } catch (e) {
      // ignore
    }
    return 'ALL';
  };

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>(getInitialUserId());
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [selectedTargetType, setSelectedTargetType] = useState<string>('ALL');

  // Filter metadata options from server
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    users: [],
    actions: [],
    targetTypes: [],
  });

  const observerTarget = useRef<HTMLDivElement>(null);

  // Fetch filter options on mount
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const data = await api.get<FilterOptions>('/activity-logs/filters');
        if (data) {
          setFilterOptions(data);
        }
      } catch (err) {
        console.error('Failed to fetch log filter options:', err);
      }
    };
    fetchFilterOptions();
  }, []);

  const fetchLogs = useCallback(
    async (reset = false) => {
      if (loading) return;
      setLoading(true);

      try {
        const currentOffset = reset ? 0 : offset;
        const params: any = {
          limit,
          offset: currentOffset,
        };

        if (dateFilter === 'today') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          params.startDate = today.toISOString();
        } else if (dateFilter === '7days') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          params.startDate = sevenDaysAgo.toISOString();
        } else if (dateFilter === '30days') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          params.startDate = thirtyDaysAgo.toISOString();
        } else if (dateFilter === 'custom' && startDate) {
          params.startDate = new Date(startDate).toISOString();
          if (endDate) {
            params.endDate = new Date(endDate).toISOString();
          }
        }

        if (selectedUserId && selectedUserId !== 'ALL') {
          params.userId = selectedUserId;
        }

        if (selectedAction && selectedAction !== 'ALL') {
          params.action = selectedAction;
        }

        if (selectedTargetType && selectedTargetType !== 'ALL') {
          params.targetType = selectedTargetType;
        }

        if (searchTerm.trim()) {
          params.search = searchTerm.trim();
        }

        const queryString = new URLSearchParams(params).toString();
        const response = await api.get<{
          logs: ActivityLog[];
          hasMore: boolean;
          totalCount: number;
        }>(`/activity-logs?${queryString}`);

        if (reset) {
          setLogs(response.logs || []);
          setOffset(limit);
        } else {
          setLogs((prev) => [...prev, ...(response.logs || [])]);
          setOffset((prev) => prev + limit);
        }

        setHasMore(response.hasMore);
        setTotalCount(response.totalCount || 0);
      } catch (error) {
        console.error('Failed to fetch logs:', error);
      } finally {
        setLoading(false);
      }
    },
    [
      loading,
      offset,
      dateFilter,
      startDate,
      endDate,
      selectedUserId,
      selectedAction,
      selectedTargetType,
      searchTerm,
    ]
  );

  // Trigger search / reset when filters change
  useEffect(() => {
    fetchLogs(true);
  }, [
    dateFilter,
    startDate,
    endDate,
    selectedUserId,
    selectedAction,
    selectedTargetType,
    searchTerm,
  ]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchLogs(false);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loading, fetchLogs]);

  const toggleExpand = (id: string) => {
    setExpandedLogId((prev) => (prev === id ? null : id));
  };

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['Thời gian', 'Người thực hiện', 'Hành động', 'Đối tượng', 'Mã ĐT', 'Tên ĐT', 'Chi tiết', 'IP', 'HTTP Method', 'Trạng thái'];
    const rows = logs.map((log) => [
      formatDate(log.timestamp),
      log.username || 'System',
      log.action,
      log.targetType || '',
      log.targetId || '',
      log.targetName || '',
      `"${(log.details || '').replace(/"/g, '""')}"`,
      log.ipAddress || '',
      log.httpMethod || '',
      log.statusCode || '',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `AuditLog_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderActionBadge = (action: string) => {
    const info = ACTION_LABELS[action] || {
      label: action,
      color: 'text-ink',
      bg: 'bg-surface-alt border-brand-border',
    };
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${info.bg} ${info.color}`}
      >
        {info.label}
      </span>
    );
  };

  const renderMethodBadge = (method?: string) => {
    if (!method) return null;
    const colors: Record<string, string> = {
      GET: 'bg-brand-teal-soft text-brand-teal',
      POST: 'bg-brand-success-soft text-brand-success',
      PUT: 'bg-brand-warning-soft text-brand-warning',
      PATCH: 'bg-accent-soft text-accent',
      DELETE: 'bg-accent-soft text-accent',
    };
    return (
      <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${colors[method] || 'bg-surface-alt text-ink'}`}>
        {method}
      </span>
    );
  };

  return (
    <div className="bg-surface rounded-xl shadow-sm border border-brand-border h-full flex flex-col animate-fade-in overflow-hidden">
      {/* Header */}
      <header className="px-6 py-5 border-b border-brand-border bg-surface-alt/50 flex items-center justify-between shrink-0 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg border border-brand-border text-ink-soft hover:text-ink hover:border-accent/40 hover:bg-surface-alt transition-colors duration-200 cursor-pointer"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-ink flex items-center gap-2">
              <span className="p-1.5 bg-accent-soft rounded-lg shadow-sm">
                <ShieldCheckIcon className="w-5 h-5 text-accent-ink" />
              </span>
              Lịch Sử Hệ Thống & Audit Trail
            </h1>
            <p className="text-sm text-ink-soft">
              Theo dõi và kiểm soát toàn bộ thao tác, đăng nhập và phân quyền trong ứng dụng
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-2.5 py-1 bg-surface border border-brand-border rounded-lg text-ink-soft">
            Tổng cộng: <strong className="text-ink font-bold">{totalCount}</strong> thao tác
          </span>
          <button
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ink bg-surface border border-brand-border rounded-lg hover:bg-surface-alt hover:border-accent/40 transition disabled:opacity-50 cursor-pointer"
            title="Xuất file CSV"
          >
            <ArrowDownTrayIcon className="w-4 h-4 text-accent" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </header>

      {/* Filter Toolbar */}
      <div className="p-4 border-b border-brand-border bg-surface flex flex-col gap-3">
        {/* Row 1: Search & Date Presets */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              placeholder="Tìm kiếm theo nội dung, IP, người thực hiện, tên đối tượng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-surface-alt border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </div>

          {/* Date Filter Buttons */}
          <div className="flex items-center gap-1 bg-surface-alt p-1 rounded-lg border border-brand-border shrink-0 overflow-x-auto">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                dateFilter === 'all'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                dateFilter === 'today'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              Hôm nay
            </button>
            <button
              onClick={() => setDateFilter('7days')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                dateFilter === '7days'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              7 ngày
            </button>
            <button
              onClick={() => setDateFilter('30days')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                dateFilter === '30days'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              30 ngày
            </button>
            <button
              onClick={() => setDateFilter('custom')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                dateFilter === 'custom'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              Tùy chỉnh
            </button>
          </div>
        </div>

        {/* Row 2: Advanced Select Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* User Select */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-ink-soft shrink-0">Người dùng:</span>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="flex-1 px-2.5 py-1.5 text-xs bg-surface-alt border border-brand-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="ALL">Tất cả người dùng</option>
              {filterOptions.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username} ({u.role === 0 ? 'Admin' : 'Staff'})
                </option>
              ))}
            </select>
          </div>

          {/* Action Select */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-ink-soft shrink-0">Hành động:</span>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="flex-1 px-2.5 py-1.5 text-xs bg-surface-alt border border-brand-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="ALL">Tất cả hành động</option>
              {filterOptions.actions.map((act) => (
                <option key={act} value={act}>
                  {ACTION_LABELS[act]?.label || act}
                </option>
              ))}
            </select>
          </div>

          {/* Target Type Select */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-ink-soft shrink-0">Đối tượng:</span>
            <select
              value={selectedTargetType}
              onChange={(e) => setSelectedTargetType(e.target.value)}
              className="flex-1 px-2.5 py-1.5 text-xs bg-surface-alt border border-brand-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="ALL">Tất cả đối tượng</option>
              {filterOptions.targetTypes.map((tgt) => (
                <option key={tgt} value={tgt}>
                  {tgt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom date range inputs */}
        {dateFilter === 'custom' && (
          <div className="flex items-center gap-3 pt-2 border-t border-brand-border animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-ink-soft">Từ ngày:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs bg-surface-alt border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-ink-soft">Đến ngày:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs bg-surface-alt border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>
        )}
      </div>

      {/* Log List View */}
      <div className="flex-1 overflow-y-auto divide-y divide-brand-border">
        {logs.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-surface-alt border border-brand-border flex items-center justify-center text-ink-soft mb-3">
              <ClockIcon className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-ink">Không có dữ liệu log</p>
            <p className="text-sm text-ink-soft mt-1">
              Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm để xem các thao tác khác
            </p>
          </div>
        ) : (
          logs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            return (
              <div
                key={log.id}
                onClick={() => toggleExpand(log.id)}
                className={`p-4 hover:bg-surface-alt/40 transition-colors cursor-pointer ${
                  isExpanded ? 'bg-surface-alt/60' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {renderActionBadge(log.action)}
                      {renderMethodBadge(log.httpMethod)}

                      {log.targetType && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-surface border border-brand-border text-ink-soft">
                          {log.targetType}
                        </span>
                      )}

                      {log.targetName && (
                        <span className="text-xs font-bold text-ink truncate max-w-[200px]">
                          {log.targetName}
                        </span>
                      )}

                      {log.ipAddress && (
                        <span className="text-[11px] font-mono text-ink-soft bg-surface-alt px-1.5 py-0.2 rounded border border-brand-border" title="Địa chỉ IP">
                          🌐 {log.ipAddress}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-ink break-words leading-relaxed font-medium">
                      {log.details || 'Không có mô tả chi tiết'}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-ink-soft flex-wrap">
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3.5 h-3.5 text-accent" />
                        <strong className="text-ink">{log.username || 'System'}</strong>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        {formatDate(log.timestamp)}
                      </span>
                      {log.httpPath && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-[10px] text-ink-faint truncate max-w-[250px]">
                            {log.httpPath}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: Status badge & expand button */}
                  <div className="flex items-center gap-2 shrink-0">
                    {log.statusCode && (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          log.statusCode < 300
                            ? 'bg-brand-success-soft text-brand-success border border-brand-success'
                            : 'bg-accent-soft text-accent border border-accent'
                        }`}
                      >
                        {log.statusCode}
                      </span>
                    )}
                    <span className="text-xs text-accent font-semibold hover:underline">
                      {isExpanded ? 'Thu gọn ▲' : 'Chi tiết ▼'}
                    </span>
                  </div>
                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-brand-border bg-surface p-3 rounded-lg text-xs space-y-2 animate-fade-in font-mono">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-ink-soft">
                      <div><strong className="text-ink">Log ID:</strong> {log.id}</div>
                      <div><strong className="text-ink">User ID:</strong> {log.userId || 'N/A'}</div>
                      <div><strong className="text-ink">IP Address:</strong> {log.ipAddress || 'N/A'}</div>
                      <div><strong className="text-ink">Target ID:</strong> {log.targetId || 'N/A'}</div>
                      {log.userAgent && (
                        <div className="sm:col-span-2 break-all">
                          <strong className="text-ink">User-Agent:</strong> {log.userAgent}
                        </div>
                      )}
                    </div>

                    {(log.oldValue || log.newValue) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-brand-border">
                        {log.oldValue && (
                          <div>
                            <span className="text-accent font-bold block mb-1">Giá trị cũ (Before):</span>
                            <pre className="p-2 bg-surface-alt rounded text-[11px] overflow-x-auto max-h-40">
                              {JSON.stringify(log.oldValue, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.newValue && (
                          <div>
                            <span className="text-brand-success font-bold block mb-1">Giá trị mới (After):</span>
                            <pre className="p-2 bg-surface-alt rounded text-[11px] overflow-x-auto max-h-40">
                              {JSON.stringify(log.newValue, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Loading / End observer target */}
        <div ref={observerTarget} className="py-4 text-center">
          {loading && (
            <div className="inline-flex items-center gap-2 text-sm text-ink-soft">
              <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
              <span>Đang tải thêm logs...</span>
            </div>
          )}
          {!hasMore && logs.length > 0 && (
            <p className="text-sm text-ink-soft">Đã hiển thị toàn bộ {totalCount} bản ghi log</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityLogPage;
