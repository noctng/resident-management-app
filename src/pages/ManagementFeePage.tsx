import React, { useState, useEffect } from 'react';
import { ManagementFee, ManagementFeeSummary } from '../types';
import MonthlyInvoiceModal from '../components/MonthlyInvoiceModal';
import BulkGenerateModal from '../components/BulkGenerateModal';
import { api } from '../services/api';
import {
  PlusIcon,
  ChartBarIcon,
  DocumentTextIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '../components/icons';

export default function ManagementFeePage() {
  const [fees, setFees] = useState<ManagementFee[]>([]);
  const [summary, setSummary] = useState<ManagementFeeSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [apartmentCodeFilter, setApartmentCodeFilter] = useState('');

  // Modals
  const [selectedFee, setSelectedFee] = useState<ManagementFee | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showBulkGenerateModal, setShowBulkGenerateModal] = useState(false);

  useEffect(() => {
    fetchFees();
    fetchSummary();
  }, [selectedMonth, selectedYear, statusFilter, apartmentCodeFilter]);

  const fetchFees = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
        ...(statusFilter && { status: statusFilter }),
        ...(apartmentCodeFilter && { apartment_code: apartmentCodeFilter }),
        limit: '500',
      });

      const data = await api.get<{ data: ManagementFee[] }>(`/management-fees?${params}`);
      setFees(data.data || []);
    } catch (err) {
      console.error('Error fetching fees:', err);
      setError('Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
      });

      const data = await api.get<ManagementFeeSummary>(`/management-fees/summary?${params}`);
      setSummary(data);
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  };

  const handleViewInvoice = (fee: ManagementFee) => {
    setSelectedFee(fee);
    setShowInvoiceModal(true);
  };

  const handleInvoiceUpdated = () => {
    fetchFees();
    fetchSummary();
    setShowInvoiceModal(false);
  };

  const handleBulkGenerateSuccess = () => {
    fetchFees();
    fetchSummary();
    setShowBulkGenerateModal(false);
  };

  const exportToExcel = async () => {
    try {
      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
        ...(statusFilter && { status: statusFilter }),
      });

      window.open(`/api/management-fees/export?${params}`, '_blank');
    } catch (err) {
      console.error('Error exporting:', err);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      PENDING: 'bg-brand-warning-soft text-brand-warning',
      PAID: 'bg-brand-success-soft text-brand-success',
      OVERDUE: 'bg-brand-danger-soft text-brand-danger',
      CANCELLED: 'bg-surface-alt text-ink-soft',
    };
    const dots: Record<string, string> = {
      PENDING: 'bg-brand-warning',
      PAID: 'bg-brand-success',
      OVERDUE: 'bg-brand-danger',
      CANCELLED: 'bg-ink-soft',
    };
    const labels: Record<string, string> = {
      PENDING: 'Chưa thanh toán',
      PAID: 'Đã thanh toán',
      OVERDUE: 'Quá hạn',
      CANCELLED: 'Đã hủy',
    };
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-full ${
          badges[status] || 'bg-surface-alt text-ink-soft'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dots[status] || 'bg-ink-soft'}`}></span>
        {labels[status] || status}
      </span>
    );
  };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  const selectClass =
    'w-full px-3 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors cursor-pointer';
  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors';
  const labelClass = 'block text-xs font-semibold text-ink-soft mb-1';
  const moneyCellClass = 'px-4 py-3 text-sm text-right font-mono tabular-nums text-ink';
  const moneyHeadClass =
    'px-4 py-3 text-right text-xs font-medium text-ink-soft uppercase whitespace-nowrap';

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Quản Lý Phí Quản Lý & Dịch Vụ</h1>
        <p className="text-ink-soft mt-1">Tạo và quản lý hóa đơn phí quản lý hàng tháng</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-brand-danger-soft border border-brand-danger/20 text-brand-danger rounded-xl">
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface border border-brand-border rounded-xl p-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-ink-soft">Tổng Hóa Đơn</p>
              <p className="font-mono text-2xl tabular-nums text-ink">{summary.total_invoices}</p>
            </div>
            <div className="p-2 bg-surface-alt text-ink-soft rounded-lg shrink-0">
              <DocumentTextIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-surface border border-brand-border rounded-xl p-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-ink-soft">Tổng Tiền</p>
              <p className="font-mono text-2xl tabular-nums text-ink">
                {formatCurrency(Number(summary.total_amount))}
              </p>
            </div>
            <div className="p-2 bg-accent-soft text-accent-ink rounded-lg shrink-0">
              <BanknotesIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-surface border border-brand-border rounded-xl p-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-ink-soft">Đã Thu</p>
              <p className="font-mono text-2xl tabular-nums text-brand-success">
                {formatCurrency(Number(summary.paid_amount))}
              </p>
            </div>
            <div className="p-2 bg-brand-success-soft text-brand-success rounded-lg shrink-0">
              <CheckCircleIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-surface border border-brand-border rounded-xl p-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-ink-soft">Còn Nợ</p>
              <p className="font-mono text-2xl tabular-nums text-brand-danger">
                {formatCurrency(Number(summary.debt_amount))}
              </p>
            </div>
            <div className="p-2 bg-brand-danger-soft text-brand-danger rounded-lg shrink-0">
              <ExclamationTriangleIcon className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="bg-surface border border-brand-border rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Month Selector */}
          <div>
            <label className={labelClass}>Tháng</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className={selectClass}
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div>
            <label className={labelClass}>Năm</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className={selectClass}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className={labelClass}>Trạng Thái</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={selectClass}
            >
              <option value="">Tất cả</option>
              <option value="PENDING">Chưa thanh toán</option>
              <option value="PAID">Đã thanh toán</option>
              <option value="OVERDUE">Quá hạn</option>
            </select>
          </div>

          {/* Apartment Code Search */}
          <div>
            <label className={labelClass}>Mã Căn Hộ</label>
            <input
              type="text"
              value={apartmentCodeFilter}
              onChange={(e) => setApartmentCodeFilter(e.target.value)}
              placeholder="Tìm kiếm..."
              className={inputClass}
            />
          </div>

          {/* Actions */}
          <div className="md:col-span-2 flex items-end gap-2">
            <button
              onClick={() => setShowBulkGenerateModal(true)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition flex-1 cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Tạo Hàng Loạt</span>
            </button>
            <button
              onClick={exportToExcel}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-surface text-ink border border-brand-border rounded-lg hover:bg-surface-alt transition-colors font-semibold min-h-[44px] cursor-pointer"
              aria-label="Xuất Excel"
            >
              <ChartBarIcon className="w-4 h-4" />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fees Table */}
      <div className="bg-surface border border-brand-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[60vh] relative">
          <table className="min-w-full divide-y divide-brand-border relative">
            <thead className="bg-surface-alt sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-soft uppercase whitespace-nowrap">
                  Mã Căn Hộ
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-soft uppercase">
                  Tòa
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-soft uppercase">
                  Tầng
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-soft uppercase">
                  Diện Tích
                </th>
                <th className={moneyHeadClass}>Phí QL</th>
                <th className={moneyHeadClass}>Dịch Vụ</th>
                <th className={moneyHeadClass}>Gửi Xe</th>
                <th className={moneyHeadClass}>Tổng Tiền</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-soft uppercase whitespace-nowrap">
                  Trạng Thái
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-soft uppercase whitespace-nowrap">
                  Thao Tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-brand-border">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                    <p className="mt-2 text-ink-soft">Đang tải...</p>
                  </td>
                </tr>
              ) : fees.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-ink-soft">
                    Chưa có hóa đơn cho tháng {selectedMonth}/{selectedYear}
                  </td>
                </tr>
              ) : (
                fees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-surface-alt/60 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-semibold text-ink">
                      {fee.apartment_code}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink">{fee.house_type}</td>
                    <td className="px-4 py-3 text-sm text-ink">{fee.floor}</td>
                    <td className="px-4 py-3 text-sm text-ink">{fee.area} m²</td>
                    <td className={moneyCellClass}>
                      {formatCurrency(Number(fee.management_fee))}
                    </td>
                    <td className={moneyCellClass}>
                      {formatCurrency(Number(fee.internet_fee) + Number(fee.cable_tv_fee))}
                    </td>
                    <td className={moneyCellClass}>
                      {formatCurrency(
                        Number(fee.parking_car_fee) + Number(fee.parking_motorbike_fee)
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono tabular-nums font-semibold text-ink">
                      {formatCurrency(Number(fee.total_amount))}
                    </td>
                    <td className="px-4 py-3 text-sm">{getStatusBadge(fee.status)}</td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleViewInvoice(fee)}
                        className="text-accent hover:text-accent-hover font-semibold cursor-pointer"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showInvoiceModal && selectedFee && (
        <MonthlyInvoiceModal
          fee={selectedFee}
          onClose={() => setShowInvoiceModal(false)}
          onUpdate={handleInvoiceUpdated}
        />
      )}

      {showBulkGenerateModal && (
        <BulkGenerateModal
          month={selectedMonth}
          year={selectedYear}
          onClose={() => setShowBulkGenerateModal(false)}
          onSuccess={handleBulkGenerateSuccess}
        />
      )}
    </div>
  );
}
