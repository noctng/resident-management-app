import React, { useState, useEffect } from 'react';
import { formatDate } from '../utils/formatters';
import { api } from '../services/api';
import {
  DocumentChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  BanknotesIcon,
  ClockIcon,
  ArrowPathIcon,
  ArrowTrendingUpIcon,
} from '../components/icons';

export default function DebtDashboardPage() {
  const [overallStats, setOverallStats] = useState<any>(null);
  const [topDebtors, setTopDebtors] = useState<any[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [debtHeatmap, setDebtHeatmap] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [stats, debtors, revenue, payments, heatmap] = await Promise.all([
        api.get<any>('/debt-dashboard/stats'),
        api.get<any[]>('/debt-dashboard/top-debtors?limit=10'),
        api.get<any[]>('/debt-dashboard/monthly-revenue?limit=6'),
        api.get<any[]>('/debt-dashboard/recent-payments?limit=10'),
        api.get<any[]>('/debt-dashboard/debt-heatmap'),
      ]);

      setOverallStats(stats);
      setTopDebtors(debtors);
      setMonthlyRevenue(revenue);
      setRecentPayments(payments);
      setDebtHeatmap(heatmap);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value || 0);
  };

  const formatPercent = (value: number) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 h-screen animate-fade-in">
        <div className="bg-surface p-6 rounded-2xl shadow-lg border border-brand-border flex flex-col items-center">
          <ArrowPathIcon className="w-10 h-10 text-primary-500 animate-spin mb-4" />
          <p className="text-ink-soft font-medium">
            Đang tải dữ liệu công nợ...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center h-screen animate-fade-in">
        <div className="bg-brand-danger-soft border border-brand-border p-6 rounded-2xl max-w-lg w-full text-center">
          <div className="bg-surface p-3 rounded-full inline-block mb-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-brand-danger" />
          </div>
          <h2 className="text-xl font-bold text-brand-danger mb-2">Đã xảy ra lỗi!</h2>
          <p className="text-brand-danger mb-6">{error}</p>
          <button
            className="px-6 py-2 bg-brand-danger hover:bg-brand-danger/90 text-white font-semibold rounded-xl transition-colors duration-200 cursor-pointer"
            onClick={fetchDashboardData}
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto min-h-screen bg-bg animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink">Dashboard Công Nợ</h1>
          <p className="text-sm text-ink-soft mt-1">
            Tổng quan tình hình thu phí và công nợ toàn khu căn hộ
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            className="p-2.5 bg-surface text-ink-soft rounded-xl border border-brand-border hover:text-accent hover:border-accent/40 transition-colors duration-200 cursor-pointer"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
          <div className="bg-surface px-4 py-2 rounded-xl text-sm font-medium text-ink-soft border border-brand-border">
            Cập nhật: {new Date().toLocaleTimeString('vi-VN')}
          </div>
        </div>
      </div>

      {/* Overall Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-surface rounded-2xl shadow-sm border border-brand-border p-6 hover:shadow-md transition-shadow duration-200 group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-ink-soft mb-1">
                Tổng Hóa Đơn
              </p>
              <p className="text-3xl font-bold text-ink mt-1 tabular-nums">
                {overallStats?.total_invoices || 0}
              </p>
              <div className="mt-2 text-xs text-ink-soft">
                Phát sinh trong tháng
              </div>
            </div>
            <div className="w-12 h-12 bg-surface-alt rounded-xl flex items-center justify-center text-ink-soft">
              <DocumentChartBarIcon className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm border border-brand-border p-6 hover:shadow-md transition-shadow duration-200 group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-ink-soft mb-1">Đã Thu</p>
              <p className="text-2xl font-mono tabular-nums font-bold text-ink mt-1">
                {formatCurrency(overallStats?.collected_amount || 0)}
              </p>
              <p className="text-xs text-brand-success mt-2 font-medium flex items-center gap-1">
                <CheckCircleIcon className="w-3 h-3" />
                {overallStats?.paid_invoices || 0} hóa đơn
              </p>
            </div>
            <div className="w-12 h-12 bg-brand-success-soft rounded-xl flex items-center justify-center text-brand-success">
              <BanknotesIcon className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm border border-brand-border p-6 hover:shadow-md transition-shadow duration-200 group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-ink-soft mb-1">Còn Nợ</p>
              <p className="font-serif text-3xl text-brand-danger mt-1">
                {formatCurrency(overallStats?.debt_amount || 0)}
              </p>
              <p className="text-xs text-brand-danger mt-2 font-medium flex items-center gap-1">
                <ExclamationTriangleIcon className="w-3 h-3" />
                {(overallStats?.pending_invoices || 0) + (overallStats?.overdue_invoices || 0)} hóa
                đơn
              </p>
            </div>
            <div className="w-12 h-12 bg-brand-danger-soft rounded-xl flex items-center justify-center text-brand-danger">
              <ArrowTrendingUpIcon className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm border border-brand-border p-6 hover:shadow-md transition-shadow duration-200 group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-ink-soft mb-1">
                Tỷ Lệ Thu Hồi
              </p>
              <p className="text-3xl font-bold text-brand-teal mt-1 tabular-nums">
                {formatPercent(overallStats?.collection_rate || 0)}
              </p>
              <div className="w-full bg-surface-alt rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-primary-500 to-secondary-600 h-full rounded-full"
                  style={{ width: `${overallStats?.collection_rate || 0}%` }}
                ></div>
              </div>
            </div>
            <div className="w-12 h-12 bg-brand-teal-soft rounded-xl flex items-center justify-center text-brand-teal">
              <ChartBarIcon className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Allocation Bar */}
      {(() => {
        const collected = overallStats?.collected_amount || 0;
        const debt = overallStats?.debt_amount || 0;
        const total = collected + debt;
        const collectedPct = total > 0 ? (collected / total) * 100 : 0;
        return (
          <div className="mb-8">
            <div className="h-2.5 w-full rounded-full bg-surface-alt overflow-hidden flex">
              <div
                className="h-full bg-brand-success"
                style={{ width: `${collectedPct}%` }}
              ></div>
              <div
                className="h-full bg-brand-danger"
                style={{ width: `${total > 0 ? 100 - collectedPct : 0}%` }}
              ></div>
            </div>
            <div className="flex items-center gap-6 mt-2 text-xs text-ink-soft">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-success"></span>
                Đã thu: {formatCurrency(collected)}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-danger"></span>
                Còn nợ: {formatCurrency(debt)}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top Debtors */}
        <div className="bg-surface rounded-2xl shadow-sm border border-brand-border p-6 flex flex-col">
          <h2 className="text-lg font-bold text-ink mb-6 flex items-center gap-2">
            <span className="p-1 bg-brand-danger-soft rounded-lg text-brand-danger">
              <ExclamationTriangleIcon className="w-5 h-5" />
            </span>
            Top Căn Hộ Nợ Nhiều Nhất
          </h2>
          <div className="space-y-4 flex-grow overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
            {topDebtors.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 py-8 text-center bg-surface-alt rounded-xl border border-dashed border-brand-border">
                <CheckCircleIcon className="w-12 h-12 text-ink-faint mb-2" />
                <p className="text-ink-soft font-medium">
                  Không có công nợ quá hạn
                </p>
              </div>
            ) : (
              topDebtors.map((debtor, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-surface-alt rounded-xl hover:bg-surface-alt/60 transition-colors border border-transparent hover:border-brand-border"
                >
                  <div className="flex items-center gap-4">
                    <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    idx === 0
                      ? 'bg-accent text-white'
                      : idx === 1
                        ? 'bg-accent-soft text-accent-ink'
                        : 'bg-surface-alt text-ink-soft'
                  }`}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-bold text-ink text-base">
                        {debtor.apartment_code}
                      </p>
                      <p className="text-xs text-ink-soft mt-0.5">
                        <span className="text-brand-danger font-medium">
                          {debtor.overdue_count} quá hạn
                        </span>{' '}
                        • {debtor.pending_count} chưa trả
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono tabular-nums text-brand-danger font-bold text-base">
                      {formatCurrency(debtor.debt_amount)}
                    </p>
                    <p className="text-xs text-ink-soft mt-0.5">Tổng nợ</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Monthly Revenue Trend */}
        <div className="bg-surface rounded-2xl shadow-sm border border-brand-border p-6 flex flex-col">
          <h2 className="text-lg font-bold text-ink mb-6 flex items-center gap-2">
            <span className="p-1 bg-brand-teal-soft rounded-lg text-brand-teal">
              <ArrowTrendingUpIcon className="w-5 h-5" />
            </span>
            Xu Hướng Thu (6 Tháng Gần Nhất)
          </h2>
          <div className="space-y-6 flex-grow">
            {monthlyRevenue.map((month, idx) => {
              const maxRevenue =
                Math.max(...monthlyRevenue.map((m) => parseFloat(m.total_revenue))) || 1;
              const percentage = (parseFloat(month.total_revenue) / maxRevenue) * 100;
              const collectedPercentage =
                (parseFloat(month.collected_revenue) / parseFloat(month.total_revenue || 1)) * 100;

              return (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-ink">
                      T{month.month}/{month.year}
                    </span>
                    <div className="text-right">
                      <span className="block text-sm font-bold font-mono tabular-nums text-ink">
                        {formatCurrency(month.total_revenue)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-surface-alt rounded-full h-3 overflow-hidden relative">
                    {/* Background Bar (Total Potential) */}
                    <div
                      className="absolute top-0 left-0 h-full bg-brand-border rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                    {/* Collected Bar (Actual) */}
                    <div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-500 to-secondary-600 rounded-full"
                      style={{ width: `${(percentage * collectedPercentage) / 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-ink-soft mt-1.5">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-secondary-500"></div>
                      Đã thu:{' '}
                      <span className="text-secondary-600 font-medium font-mono tabular-nums">
                        {formatCurrency(month.collected_revenue)}
                      </span>
                    </span>
                    <span
                      className={
                        month.collection_rate >= 100
                          ? 'text-brand-success font-bold'
                          : 'text-ink-soft'
                      }
                    >
                      {formatPercent(month.collection_rate)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Debt Heatmap */}
      <div className="bg-surface rounded-2xl shadow-sm border border-brand-border p-6 mb-8">
        <h2 className="text-lg font-bold text-ink mb-6 flex items-center gap-2">
            <span className="p-1 bg-brand-warning-soft rounded-lg text-brand-warning">
            <BuildingOfficeIcon className="w-5 h-5" />
          </span>
          Bản Đồ Công Nợ Theo Tòa & Tầng
        </h2>
        <div className="overflow-x-auto rounded-xl border border-brand-border">
          <table className="min-w-full divide-y divide-brand-border">
            <thead className="bg-surface-alt">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-ink-soft uppercase tracking-wider">
                  Tòa Nhà
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-ink-soft uppercase tracking-wider">
                  Tầng
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-ink-soft uppercase tracking-wider">
                  Tổng Hóa Đơn
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-ink-soft uppercase tracking-wider">
                  Chưa Thanh Toán
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-ink-soft uppercase tracking-wider">
                  Số Tiền Nợ
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-brand-border">
              {debtHeatmap.map((row, idx) => (
                <tr
                  key={idx}
                  className={`hover:bg-surface-alt/60 transition-colors ${Number(row.debt_amount) > 0 ? 'bg-brand-danger-soft/30' : ''}`}
                >
                  <td className="px-6 py-4 text-sm font-bold text-ink">
                    {row.house_type}
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-soft">
                    {row.floor}
                  </td>
                  <td className="px-6 py-4 text-sm text-right tabular-nums text-ink">
                    {row.total_fees}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-semibold tabular-nums text-brand-warning">
                    {row.unpaid_count}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-mono font-bold text-brand-danger">
                    {formatCurrency(row.debt_amount)}
                  </td>
                </tr>
              ))}
              {debtHeatmap.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-ink-soft"
                  >
                    Không có dữ liệu công nợ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Payments */}
      <div className="bg-surface rounded-2xl shadow-sm border border-brand-border p-6">
        <h2 className="text-lg font-bold text-ink mb-6 flex items-center gap-2">
            <span className="p-1 bg-brand-success-soft rounded-lg text-brand-success">
            <ClockIcon className="w-5 h-5" />
          </span>
          Giao Dịch Gần Đây
        </h2>
        <div className="overflow-x-auto rounded-xl border border-brand-border">
          <table className="min-w-full divide-y divide-brand-border">
            <thead className="bg-surface-alt">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-ink-soft uppercase tracking-wider">
                  Căn Hộ
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-ink-soft uppercase tracking-wider">
                  Kỳ/Tháng
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-ink-soft uppercase tracking-wider">
                  Số Tiền
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-ink-soft uppercase tracking-wider pl-8">
                  Phương Thức
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-ink-soft uppercase tracking-wider">
                  Ngày Thanh Toán
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-brand-border">
              {recentPayments.map((payment) => (
                <tr
                  key={payment.id}
                  className="hover:bg-surface-alt/60 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-mono font-semibold text-ink">
                    {payment.apartment_code}
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-soft font-mono">
                    T{payment.month}/{payment.year}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-mono tabular-nums font-bold text-brand-success">
                    {formatCurrency(payment.total_amount)}
                  </td>
                  <td className="px-6 py-4 text-sm text-ink pl-8">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-alt text-ink">
                      {payment.payment_method || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-soft">
                    {formatDate(payment.payment_date)}
                  </td>
                </tr>
              ))}
              {recentPayments.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-ink-soft"
                  >
                    Không có giao dịch gần đây
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
