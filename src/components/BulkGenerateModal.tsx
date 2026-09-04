import React, { useState } from 'react';
import { BulkGenerateResult } from '../types';
import { useConfirm } from './ui';
import {
  XMarkIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from './icons';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

interface Props {
  month: number;
  year: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkGenerateModal({ month, year, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BulkGenerateResult | null>(null);
  const [error, setError] = useState('');
  const { confirm } = useConfirm();

  const handleGenerate = async () => {
    if (!(await confirm({ title: 'Tạo hóa đơn hàng loạt', description: `Xác nhận tạo hóa đơn hàng loạt cho tháng ${month}/${year}?`, variant: 'primary' }))) return;

    setError('');
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/management-fees/bulk-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          month,
          year,
          apartment_settings: {}, // Có thể mở rộng để cho phép cấu hình từng căn hộ
        }),
      });

      if (response.ok) {
        const data: BulkGenerateResult = await response.json();
        setResult(data);

        if (data.success.length > 0) {
          setTimeout(() => {
            onSuccess();
          }, 3000);
        }
      } else {
        const errData = await response.json();
        setError(errData.error || 'Tạo hóa đơn thất bại');
      }
    } catch (err) {
      console.error('Error bulk generating:', err);
      setError('Có lỗi xảy ra khi tạo hóa đơn');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-surface w-full rounded-2xl shadow-elevation-overlay border border-brand-border max-w-4xl max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="sticky top-0 z-10 px-5 py-4 border-b border-brand-border flex justify-between items-center bg-surface">
          <div>
            <h2 className="text-base font-bold text-ink">Tạo Hóa Đơn Hàng Loạt</h2>
            <p className="text-xs text-ink-soft mt-0.5">
              Tháng {month}/{year}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-surface-alt transition-colors duration-200 cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-brand-danger-soft border border-brand-danger/30 text-sm text-brand-danger">
              {error}
            </div>
          )}

          {/* Initial State */}
          {!result && !loading && (
            <div>
              <div className="mb-6 p-4 rounded-lg bg-brand-warning-soft border border-brand-warning/30">
                <p className="text-sm text-brand-warning flex items-start gap-1.5">
                  <ExclamationTriangleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Lưu ý:</strong> Hệ thống sẽ tạo hóa đơn phí quản lý cho{' '}
                    <strong>TẤT CẢ</strong> các căn hộ trong tháng {month}/{year}.
                  </span>
                </p>
                <ul className="mt-2 text-sm text-brand-warning list-disc list-inside">
                  <li>Các căn hộ đã có hóa đơn sẽ được bỏ qua</li>
                  <li>Áp dụng cấu hình phí hiện tại</li>
                  <li>Mặc định bật Internet và Truyền hình cho tất cả căn hộ</li>
                  <li>Không tính phí gửi xe (có thể chỉnh sửa sau)</li>
                </ul>
              </div>

              <button
                onClick={handleGenerate}
                className="w-full px-6 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors duration-200 font-semibold flex items-center justify-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Bắt Đầu Tạo Hóa Đơn
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center rounded-full h-16 w-16 border-2 border-accent/70"></div>
              <p className="mt-4 text-lg font-semibold text-ink">Đang tạo hóa đơn...</p>
              <p className="text-sm text-ink-soft">
                Vui lòng đợi, quá trình này có thể mất vài phút
              </p>
            </div>
          )}

          {/* Result State */}
          {result && (
            <div>
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-brand-success-soft border border-brand-success/30">
                  <p className="text-sm text-brand-success">Thành Công</p>
                  <p className="text-3xl font-bold text-brand-success tabular-nums">
                    {result.success.length}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-brand-warning-soft border border-brand-warning/30">
                  <p className="text-sm text-brand-warning">Bỏ Qua</p>
                  <p className="text-3xl font-bold text-brand-warning tabular-nums">
                    {result.skipped.length}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-brand-danger-soft border border-brand-danger/30">
                  <p className="text-sm text-brand-danger">Thất Bại</p>
                  <p className="text-3xl font-bold text-brand-danger tabular-nums">
                    {result.failed.length}
                  </p>
                </div>
              </div>

              {/* Success List */}
              {result.success.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-brand-success mb-2 flex items-center gap-1.5">
                    <CheckCircleIcon className="w-5 h-5" />
                    Đã Tạo Thành Công ({result.success.length})
                  </h3>
                  <div className="max-h-48 overflow-y-auto custom-scrollbar rounded-lg border border-brand-success/30">
                    <table className="min-w-full text-sm">
                      <thead className="bg-brand-success-soft sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Mã Căn Hộ</th>
                          <th className="px-3 py-2 text-right">Tổng Tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-success/20">
                        {result.success.map((item) => (
                          <tr key={item.fee_id}>
                            <td className="px-3 py-2 font-mono tabular-nums">{item.apartment_code}</td>
                            <td className="px-3 py-2 text-right font-semibold font-mono tabular-nums">
                              {formatCurrency(item.total_amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Skipped List */}
              {result.skipped.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-brand-warning mb-2 flex items-center gap-1.5">
                    <ClockIcon className="w-5 h-5" />
                    Đã Bỏ Qua ({result.skipped.length})
                  </h3>
                  <div className="max-h-48 overflow-y-auto custom-scrollbar rounded-lg border border-brand-warning/30">
                    <table className="min-w-full text-sm">
                      <thead className="bg-brand-warning-soft sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Mã Căn Hộ</th>
                          <th className="px-3 py-2 text-left">Lý Do</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-warning/20">
                        {result.skipped.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-mono tabular-nums">{item.apartment_code}</td>
                            <td className="px-3 py-2 text-ink-soft">{item.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Failed List */}
              {result.failed.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-brand-danger mb-2 flex items-center gap-1.5">
                    <XCircleIcon className="w-5 h-5" />
                    Thất Bại ({result.failed.length})
                  </h3>
                  <div className="max-h-48 overflow-y-auto custom-scrollbar rounded-lg border border-brand-danger/30">
                    <table className="min-w-full text-sm">
                      <thead className="bg-brand-danger-soft sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Mã Căn Hộ</th>
                          <th className="px-3 py-2 text-left">Lỗi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-danger/20">
                        {result.failed.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-mono tabular-nums">{item.apartment_code}</td>
                            <td className="px-3 py-2 text-ink-soft">{item.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-full px-6 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors duration-200 font-semibold"
              >
                Đóng
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
