import React, { useState } from 'react';
import { ManagementFee } from '../types';
import { useToast, useConfirm } from './ui';
import {
  XMarkIcon,
  TrashIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
} from './icons';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const statusBadgeMap: Record<string, { pill: string; dot: string; label: string }> = {
  PAID: { pill: 'bg-brand-success-soft text-brand-success', dot: 'bg-brand-success', label: 'Đã thanh toán' },
  PENDING: { pill: 'bg-brand-warning-soft text-brand-warning', dot: 'bg-brand-warning', label: 'Chưa thanh toán' },
  OVERDUE: { pill: 'bg-brand-danger-soft text-brand-danger', dot: 'bg-brand-danger', label: 'Quá hạn' },
};
const defaultStatusBadge = { pill: 'bg-surface-alt text-ink-soft', dot: 'bg-ink-soft', label: 'Đã hủy' };

interface Props {
  fee: ManagementFee;
  onClose: () => void;
  onUpdate: () => void;
}

export default function MonthlyInvoiceModal({ fee, onClose, onUpdate }: Props) {
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState(fee.note || '');
  const [error, setError] = useState('');
  const toast = useToast();
  const { confirm } = useConfirm();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const handleMarkAsPaid = async () => {
    if (!(await confirm({ title: 'Xác nhận thanh toán', description: 'Xác nhận đã thanh toán hóa đơn này?', variant: 'primary' }))) return;

    setError('');
    setIsUpdatingPayment(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/management-fees/${fee.id}/payment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: 'PAID',
          payment_method: paymentMethod,
          payment_date: paymentDate,
          note,
        }),
      });

      if (response.ok) {
        toast.success('Cập nhật thanh toán thành công!');
        onUpdate();
      } else {
        const errData = await response.json();
        setError(errData.error || 'Cập nhật thất bại');
      }
    } catch (err) {
      console.error('Error updating payment:', err);
      setError('Có lỗi xảy ra khi cập nhật');
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const handleDelete = async () => {
    if (!(await confirm({ title: 'Xóa hóa đơn', description: 'Bạn có chắc chắn muốn xóa hóa đơn này?', variant: 'danger' }))) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/management-fees/${fee.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('Xóa hóa đơn thành công!');
        onUpdate();
      } else {
        const errData = await response.json();
        toast.error(`${errData.error || 'Xóa thất bại'}`);
      }
    } catch (err) {
      console.error('Error deleting fee:', err);
      toast.error('Có lỗi xảy ra khi xóa');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/management-fees/${fee.id}/pdf`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `HoaDon_${fee.apartment_code}_${fee.month}-${fee.year}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      toast.error('Không thể tải PDF. Vui lòng thử lại.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border max-w-4xl w-full max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="px-5 py-4 border-b border-brand-border sticky top-0 bg-surface z-10">
          <div className="flex justify-between items-center gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-ink">Hóa Đơn Phí Quản Lý</h2>
              <p className="text-xs text-ink-soft mt-0.5 font-mono">
                {fee.apartment_code} - Tháng {fee.month}/{fee.year}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-ink-soft hover:text-ink hover:bg-surface-alt rounded-lg transition-colors duration-200 cursor-pointer shrink-0"
              aria-label="Đóng"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-5 mt-4 p-4 bg-brand-danger-soft border border-brand-danger/40 text-brand-danger rounded-lg">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="p-5">
          {/* Apartment Info */}
          <div className="mb-6 p-4 bg-surface-alt/50 rounded-lg">
            <h3 className="font-semibold text-ink mb-2">Thông Tin Căn Hộ</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-ink-soft font-semibold">Mã Căn Hộ</p>
                <p className="font-semibold text-ink font-mono">{fee.apartment_code}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-ink-soft font-semibold">Tòa Nhà</p>
                <p className="font-semibold text-ink">{fee.house_type}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-ink-soft font-semibold">Tầng</p>
                <p className="font-semibold text-ink font-mono">{fee.floor}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-ink-soft font-semibold">Diện Tích</p>
                <p className="font-semibold text-ink font-mono tabular-nums">{fee.area} m²</p>
              </div>
            </div>
          </div>

          {/* Fee Breakdown */}
          <div className="mb-6">
            <h3 className="font-semibold text-ink mb-3">Chi Tiết Các Khoản Phí</h3>
            <div className="border border-brand-border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-brand-border">
                <thead className="bg-surface-alt/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-ink-soft">
                      Khoản Phí
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-ink-soft">
                      Đơn Giá
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-ink-soft">
                      Số Lượng
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-ink-soft">
                      Thành Tiền
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  <tr>
                    <td className="px-4 py-3 text-sm">Phí Quản Lý</td>
                    <td className="px-4 py-3 text-sm text-right font-mono tabular-nums">
                      {formatCurrency(Number(fee.management_fee_per_sqm))}/m²
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono tabular-nums">{fee.area} m²</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold font-mono tabular-nums">
                      {formatCurrency(Number(fee.management_fee))}
                    </td>
                  </tr>
                  {Number(fee.internet_fee) > 0 && (
                    <tr>
                      <td className="px-4 py-3 text-sm">Phí Internet</td>
                      <td className="px-4 py-3 text-sm text-right font-mono tabular-nums">
                        {formatCurrency(Number(fee.internet_fee))}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono tabular-nums">1</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold font-mono tabular-nums">
                        {formatCurrency(Number(fee.internet_fee))}
                      </td>
                    </tr>
                  )}
                  {Number(fee.cable_tv_fee) > 0 && (
                    <tr>
                      <td className="px-4 py-3 text-sm">Phí Truyền Hình</td>
                      <td className="px-4 py-3 text-sm text-right font-mono tabular-nums">
                        {formatCurrency(Number(fee.cable_tv_fee))}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono tabular-nums">1</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold font-mono tabular-nums">
                        {formatCurrency(Number(fee.cable_tv_fee))}
                      </td>
                    </tr>
                  )}
                  {Number(fee.security_fee) > 0 && (
                    <tr>
                      <td className="px-4 py-3 text-sm">Phí Bảo Vệ</td>
                      <td className="px-4 py-3 text-sm text-right font-mono tabular-nums">
                        {formatCurrency(Number(fee.security_fee))}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono tabular-nums">1</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold font-mono tabular-nums">
                        {formatCurrency(Number(fee.security_fee))}
                      </td>
                    </tr>
                  )}
                  {Number(fee.cleaning_fee) > 0 && (
                    <tr>
                      <td className="px-4 py-3 text-sm">Phí Vệ Sinh</td>
                      <td className="px-4 py-3 text-sm text-right font-mono tabular-nums">
                        {formatCurrency(Number(fee.cleaning_fee))}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono tabular-nums">1</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold font-mono tabular-nums">
                        {formatCurrency(Number(fee.cleaning_fee))}
                      </td>
                    </tr>
                  )}
                  {Number(fee.parking_car_quantity) > 0 && (
                    <tr>
                      <td className="px-4 py-3 text-sm">Phí Gửi Xe Ô Tô</td>
                      <td className="px-4 py-3 text-sm text-right font-mono tabular-nums">
                        {formatCurrency(
                          Number(fee.parking_car_fee) / Number(fee.parking_car_quantity)
                        )}
                        /xe
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono tabular-nums">{fee.parking_car_quantity}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold font-mono tabular-nums">
                        {formatCurrency(Number(fee.parking_car_fee))}
                      </td>
                    </tr>
                  )}
                  {Number(fee.parking_motorbike_quantity) > 0 && (
                    <tr>
                      <td className="px-4 py-3 text-sm">Phí Gửi Xe Máy</td>
                      <td className="px-4 py-3 text-sm text-right font-mono tabular-nums">
                        {formatCurrency(
                          Number(fee.parking_motorbike_fee) / Number(fee.parking_motorbike_quantity)
                        )}
                        /xe
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono tabular-nums">
                        {fee.parking_motorbike_quantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold font-mono tabular-nums">
                        {formatCurrency(Number(fee.parking_motorbike_fee))}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-surface-alt/50">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-sm font-bold text-ink">
                      TỔNG CỘNG
                    </td>
                    <td className="px-4 py-3 font-serif text-2xl font-bold text-accent tabular-nums text-right">
                      {formatCurrency(Number(fee.total_amount))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Payment Status */}
          <div className="mb-6 p-4 bg-surface-alt/50 rounded-lg">
            <h3 className="font-semibold text-ink mb-2">Trạng Thái Thanh Toán</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-ink-soft">Trạng Thái</p>
                {(() => {
                  const sb = statusBadgeMap[fee.status] || defaultStatusBadge;
                  return (
                    <span className={`mt-0.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full ${sb.pill}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sb.dot}`}></span>
                      {sb.label}
                    </span>
                  );
                })()}
              </div>
              {fee.payment_date && (
                <>
                  <div>
                    <p className="text-sm text-ink-soft">Ngày Thanh Toán</p>
                    <p className="font-semibold text-ink font-mono">{formatDate(fee.payment_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-ink-soft">Phương Thức</p>
                    <p className="font-semibold text-ink">{fee.payment_method || 'N/A'}</p>
                  </div>
                </>
              )}
            </div>
            {fee.note && (
              <div className="mt-3">
                <p className="text-sm text-ink-soft">Ghi Chú</p>
                <p className="text-sm text-ink">{fee.note}</p>
              </div>
            )}
          </div>

          {/* Payment Form (if not paid) */}
          {fee.status !== 'PAID' && (
            <div className="mb-6 p-4 border border-brand-border bg-surface-alt/50 rounded-lg">
              <h3 className="font-semibold text-ink mb-3">Cập Nhật Thanh Toán</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-soft mb-1">
                    Phương Thức Thanh Toán
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg focus:ring-2 focus:ring-accent/40 focus:border-accent focus:outline-none"
                  >
                    <option value="CASH">Tiền mặt</option>
                    <option value="BANK_TRANSFER">Chuyển khoản</option>
                    <option value="QR_CODE">QR Code</option>
                    <option value="CARD">Thẻ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-soft mb-1">
                    Ngày Thanh Toán
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg focus:ring-2 focus:ring-accent/40 focus:border-accent focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-ink-soft mb-1">Ghi Chú</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg focus:ring-2 focus:ring-accent/40 focus:border-accent focus:outline-none"
                    placeholder="Nhập ghi chú (nếu có)..."
                  />
                </div>
              </div>
              <button
                onClick={handleMarkAsPaid}
                disabled={isUpdatingPayment}
                className="mt-4 px-6 py-2 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors duration-200 disabled:bg-surface-alt disabled:text-ink-faint disabled:cursor-not-allowed cursor-pointer"
              >
                {isUpdatingPayment ? 'Đang cập nhật...' : 'Xác Nhận Đã Thanh Toán'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-brand-border flex flex-wrap justify-end gap-2 sticky bottom-0 bg-surface">
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-brand-border text-ink text-sm font-semibold rounded-lg hover:bg-surface-alt transition-colors duration-200 cursor-pointer"
          >
            <DocumentArrowDownIcon className="w-4 h-4" />
            Tải PDF
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-brand-border text-ink text-sm font-semibold rounded-lg hover:bg-surface-alt transition-colors duration-200 cursor-pointer"
          >
            <PrinterIcon className="w-4 h-4" />
            In Hóa Đơn
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-danger hover:bg-brand-danger/90 text-white text-sm font-semibold rounded-lg transition-colors duration-200 cursor-pointer"
          >
            <TrashIcon className="w-4 h-4" />
            Xóa Hóa Đơn
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-lg transition-colors duration-200 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
