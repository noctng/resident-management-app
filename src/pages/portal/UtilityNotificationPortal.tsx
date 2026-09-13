import React, { useState, useEffect, useRef } from 'react';
import {
  BoltIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  EnvelopeIcon,
  ChatBubbleBottomCenterTextIcon,
  EyeIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
} from '../../components/icons';
import { useToast } from '../../components/ui';
import { generateUtilityInvoiceHTML } from './utilityInvoiceHtmlGenerator';

interface UtilityImportRecord {
  id: string;
  HoTen: string;
  MaCanHo: string;
  ThangNam: string;
  ChiSo_dien_cu: number;
  ChiSo_dien_moi: number;
  ChiSo_dien: number;
  ChiSo_nuoc_cu: number;
  ChiSo_nuoc_moi: number;
  ChiSo_nuoc: number;
  SoTien_dien: number;
  SoTien_nuoc: number;
  TongTien: number;
  HanNop: string;
  Email: string;
  CCMAIL: string;
  NoiDung: string;
  SDT: string;
  ZaloId: string;
  qrCodeUrl: string;
  statusZalo?: 'PENDING' | 'SUCCESS' | 'FAILED';
  statusEmail?: 'PENDING' | 'SUCCESS' | 'FAILED';
  errorMsg?: string;
}

export const UtilityNotificationPortal: React.FC = () => {
  const toast = useToast();
  const [records, setRecords] = useState<UtilityImportRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<UtilityImportRecord | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isDispatchingZalo, setIsDispatchingZalo] = useState(false);
  const [isDispatchingEmail, setIsDispatchingEmail] = useState(false);

  const [webhookUrl, setWebhookUrl] = useState('');
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);

  // Tab lọc trong popup báo cáo (ALL, SUCCESS, FAILED)
  const [reportFilter, setReportFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL');

  // Thống kê kết quả gửi chi tiết
  const [dispatchResult, setDispatchResult] = useState<{
    channelName: string;
    total: number;
    successCount: number;
    failedCount: number;
    showModal: boolean;
    details: any[];
  } | null>(null);

  // Load n8n webhook URL config
  useEffect(() => {
    const fetchN8nConfig = async () => {
      try {
        const res = await fetch('/api/utility-dispatch/n8n-config');
        const data = await res.json();
        if (data.webhookUrl) {
          setWebhookUrl(data.webhookUrl);
        }
      } catch (e) {
        console.error('Failed to load n8n config', e);
      }
    };
    fetchN8nConfig();
  }, []);

  const handleSaveWebhook = async () => {
    setIsSavingWebhook(true);
    try {
      const res = await fetch('/api/utility-dispatch/n8n-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Đã lưu cấu hình URL Webhook n8n!');
      }
    } catch (e: any) {
      toast.error('Lỗi lưu Webhook n8n: ' + e.message);
    } finally {
      setIsSavingWebhook(false);
    }
  };

  // Xử lý upload file Excel
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/utility-dispatch/parse-excel', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Lỗi đọc file Excel');
      }

      setRecords(result.data);
      toast.success(`Đã nạp thành công ${result.total} căn hộ từ file Excel!`);
    } catch (err: any) {
      toast.error('Lỗi nạp file: ' + err.message);
    } finally {
      setIsLoadingFile(false);
      e.target.value = '';
    }
  };

  // Mở modal xem trước HTML/In
  const handlePreview = (record: UtilityImportRecord) => {
    setSelectedRecord(record);
  };

  const closePreviewModal = () => {
    setSelectedRecord(null);
  };

  // In trực tiếp từ Iframe
  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    }
  };

  // Tải trực tiếp file PDF từ backend
  const handleDownloadPdf = async (record: UtilityImportRecord) => {
    try {
      toast.info('Đang kết xuất file PDF...');
      const res = await fetch('/api/utility-dispatch/preview-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (!res.ok) throw new Error('Không thể tạo file PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ThongBaoDienNuoc_${record.MaCanHo}_T${record.ThangNam.replace(/[^0-9]/g, '')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Đã tải file PDF thành công!');
    } catch (e: any) {
      toast.error('Lỗi tải PDF: ' + e.message);
    }
  };

  // Gửi đơn lẻ 1 căn qua Zalo
  const handleSendSingleZalo = async (record: UtilityImportRecord) => {
    try {
      toast.info(`Đang gửi Zalo cho căn hộ ${record.MaCanHo}...`);
      const res = await fetch('/api/utility-dispatch/send-zalo-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record, webhookUrl }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Lỗi gửi Zalo');

      setRecords((prev) =>
        prev.map((r) => (r.id === record.id ? { ...r, statusZalo: 'SUCCESS', errorMsg: '' } : r))
      );
      toast.success(`Đã gửi Zalo thành công cho căn hộ ${record.MaCanHo}!`);
    } catch (e: any) {
      setRecords((prev) =>
        prev.map((r) => (r.id === record.id ? { ...r, statusZalo: 'FAILED', errorMsg: e.message } : r))
      );
      toast.error(`Gửi Zalo thất bại: ${e.message}`);
    }
  };

  // Gửi đơn lẻ 1 căn qua Email
  const handleSendSingleEmail = async (record: UtilityImportRecord) => {
    try {
      toast.info(`Đang gửi Email cho căn hộ ${record.MaCanHo}...`);
      const res = await fetch('/api/utility-dispatch/send-email-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Lỗi gửi Email');

      setRecords((prev) =>
        prev.map((r) => (r.id === record.id ? { ...r, statusEmail: 'SUCCESS', errorMsg: '' } : r))
      );
      toast.success(`Đã gửi Email thành công cho căn hộ ${record.MaCanHo}!`);
    } catch (e: any) {
      setRecords((prev) =>
        prev.map((r) => (r.id === record.id ? { ...r, statusEmail: 'FAILED', errorMsg: e.message } : r))
      );
      toast.error(`Gửi Email thất bại: ${e.message}`);
    }
  };

  // 🟢 Gửi HÀNG LOẠT QUA ZALO
  const handleBatchSendZalo = async () => {
    if (records.length === 0) {
      toast.error('Chưa có danh sách căn hộ để gửi');
      return;
    }

    if (!webhookUrl) {
      toast.error('Vui lòng nhập URL Webhook n8n để gửi Zalo');
      return;
    }

    setIsDispatchingZalo(true);
    setReportFilter('ALL');
    try {
      const res = await fetch('/api/utility-dispatch/batch-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records,
          channels: ['ZALO'],
          webhookUrl,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Lỗi gửi Zalo hàng loạt');
      }

      const statusMap = new Map();
      (result.details || []).forEach((d: any) => {
        statusMap.set(d.id, d);
      });

      setRecords((prev) =>
        prev.map((r) => {
          const detail = statusMap.get(r.id);
          if (detail) {
            return {
              ...r,
              statusZalo: detail.zalo !== 'SKIPPED' ? detail.zalo : r.statusZalo,
              errorMsg: detail.error || '',
            };
          }
          return r;
        })
      );

      setDispatchResult({
        channelName: 'Zalo (n8n)',
        total: result.total,
        successCount: result.successCount,
        failedCount: result.failedCount,
        showModal: true,
        details: result.details || [],
      });

      toast.success(
        `Hoàn tất gửi Zalo: Thành công ${result.successCount}/${result.total} căn hộ!`
      );
    } catch (e: any) {
      toast.error('Gửi Zalo thất bại: ' + e.message);
    } finally {
      setIsDispatchingZalo(false);
    }
  };

  // 🔵 Gửi HÀNG LOẠT QUA EMAIL
  const handleBatchSendEmail = async () => {
    if (records.length === 0) {
      toast.error('Chưa có danh sách căn hộ để gửi');
      return;
    }

    setIsDispatchingEmail(true);
    setReportFilter('ALL');
    try {
      const res = await fetch('/api/utility-dispatch/batch-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records,
          channels: ['EMAIL'],
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Lỗi gửi Email hàng loạt');
      }

      const statusMap = new Map();
      (result.details || []).forEach((d: any) => {
        statusMap.set(d.id, d);
      });

      setRecords((prev) =>
        prev.map((r) => {
          const detail = statusMap.get(r.id);
          if (detail) {
            return {
              ...r,
              statusEmail: detail.email !== 'SKIPPED' ? detail.email : r.statusEmail,
              errorMsg: detail.error || '',
            };
          }
          return r;
        })
      );

      setDispatchResult({
        channelName: 'Email Trực Tiếp',
        total: result.total,
        successCount: result.successCount,
        failedCount: result.failedCount,
        showModal: true,
        details: result.details || [],
      });

      toast.success(
        `Hoàn tất gửi Email: Thành công ${result.successCount}/${result.total} căn hộ!`
      );
    } catch (e: any) {
      toast.error('Gửi Email thất bại: ' + e.message);
    } finally {
      setIsDispatchingEmail(false);
    }
  };

  // Xuất file Excel báo cáo kết quả gửi
  const handleExportReportExcel = () => {
    if (!dispatchResult || !dispatchResult.details) return;

    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += 'Mã Căn Hộ,Họ Tên Cư Dân,Số Điện Thoại,Zalo ID,Email,Tổng Tiền,Trạng Thái,Chi Tiết Phản Hồi / Lý Do Lỗi\n';

    dispatchResult.details.forEach((d) => {
      const row = [
        `"${d.maCanHo || ''}"`,
        `"${(d.hoTen || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        `"${d.sdt || ''}"`,
        `"${d.zaloId || ''}"`,
        `"${d.email || ''}"`,
        `"${d.tongTien || 0}"`,
        `"${d.status === 'SUCCESS' ? 'THÀNH CÔNG' : 'THẤT BẠI'}"`,
        `"${(d.error || d.zaloMsg || d.emailMsg || '').replace(/"/g, '""')}"`,
      ];
      csvContent += row.join(',') + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BaoCaoPhatHanh_${dispatchResult.channelName.replace(/\s+/g, '_')}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Đã xuất file báo cáo CSV thành công!');
  };

  return (
    <div className="min-h-screen bg-bg text-ink font-sans">
      {/* Top Navigation Bar */}
      <header className="bg-surface border-b border-brand-border sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Thành Phố Cà Phê" className="w-9 h-9 object-contain" />
            <div>
              <h1 className="font-bold text-base text-ink flex items-center gap-2">
                Cổng Phát Hành Thông Báo Điện Nước
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-accent-soft text-accent-ink">
                  Staff Portal
                </span>
              </h1>
              <p className="text-xs text-ink-soft">
                Nhập file Excel, sinh mã VietQR tự động và gửi thông báo riêng biệt qua Zalo / Email
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Step 1: Upload File & Settings Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Area */}
          <div className="lg:col-span-2 bg-surface rounded-2xl border border-brand-border p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-ink mb-1 flex items-center gap-2">
                <ArrowUpTrayIcon className="w-5 h-5 text-accent" />
                1. Nạp File Excel Danh Sách Điện Nước
              </h3>
              <p className="text-xs text-ink-soft mb-4">
                Hỗ trợ file Excel chứa cột: HoTen, MaCanHo, ThangNam, ChiSo_dien, ChiSo_nuoc, TongTien, HanNop, Email, SĐT, ZALO ID...
              </p>

              <div className="border-2 border-dashed border-brand-border hover:border-accent/60 rounded-xl p-6 text-center transition-colors bg-surface-alt/50">
                <input
                  type="file"
                  id="excel-upload"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isLoadingFile}
                />
                <label
                  htmlFor="excel-upload"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <div className="p-3 bg-accent-soft text-accent rounded-full">
                    <ArrowUpTrayIcon className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-accent hover:underline">
                    {isLoadingFile ? 'Đang đọc dữ liệu...' : 'Chọn file Excel từ máy tính (.xlsx)'}
                  </span>
                  <span className="text-[11px] text-ink-faint">
                    Tự động nhận diện kỳ hóa đơn, tính mã VietQR và khớp Zalo ID cư dân
                  </span>
                </label>
              </div>
            </div>

            {records.length > 0 && (
              <div className="mt-4 pt-4 border-t border-brand-border flex items-center justify-between">
                <span className="text-xs font-semibold text-brand-success flex items-center gap-1.5">
                  <CheckCircleIcon className="w-4 h-4" />
                  Đã tải <strong>{records.length}</strong> căn hộ (Kỳ: {records[0]?.ThangNam})
                </span>
                <button
                  type="button"
                  onClick={() => setRecords([])}
                  className="text-xs text-brand-danger hover:underline cursor-pointer"
                >
                  Xóa danh sách tải lại
                </button>
              </div>
            )}
          </div>

          {/* n8n Webhook & Tách riêng 2 Nút Gửi Zalo / Email */}
          <div className="bg-surface rounded-2xl border border-brand-border p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-sm font-bold text-ink mb-1 flex items-center gap-2">
                <ChatBubbleBottomCenterTextIcon className="w-5 h-5 text-accent" />
                2. Cấu Hình Webhook n8n (Zalo)
              </h3>
              <p className="text-xs text-ink-soft mb-3">
                URL tiếp nhận Webhook từ quy trình n8n gửi ZNS / Zalo OA
              </p>

              <div className="space-y-2">
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://n8n.yourdomain.com/webhook/zalo-utility"
                  className="block w-full px-3 py-2 text-xs rounded-xl border border-brand-border bg-surface-alt text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 font-mono"
                />
                <button
                  type="button"
                  onClick={handleSaveWebhook}
                  disabled={isSavingWebhook}
                  className="w-full py-1.5 bg-surface-alt hover:bg-surface border border-brand-border text-ink text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  {isSavingWebhook ? 'Đang lưu...' : 'Lưu URL Webhook'}
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-brand-border space-y-2.5">
              <span className="text-xs font-semibold text-ink block">Thực hiện phát hành:</span>

              {/* Nút Gửi Zalo Riêng */}
              <button
                type="button"
                onClick={handleBatchSendZalo}
                disabled={isDispatchingZalo || isDispatchingEmail || records.length === 0}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />
                <span>
                  {isDispatchingZalo
                    ? 'Đang gửi Zalo...'
                    : `Gửi Zalo Hàng Loạt (${records.length} Căn)`}
                </span>
              </button>

              {/* Nút Gửi Email Riêng */}
              <button
                type="button"
                onClick={handleBatchSendEmail}
                disabled={isDispatchingEmail || isDispatchingZalo || records.length === 0}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <EnvelopeIcon className="w-4 h-4" />
                <span>
                  {isDispatchingEmail
                    ? 'Đang gửi Email...'
                    : `Gửi Email Hàng Loạt (${records.length} Căn)`}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Step 2: Records Preview Table */}
        <div className="bg-surface rounded-2xl border border-brand-border overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 border-b border-brand-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                Danh Sách Thông Báo Điện Nước
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent-soft text-accent-ink">
                  {records.length} bản ghi
                </span>
              </h3>
            </div>
          </div>

          {records.length === 0 ? (
            <div className="p-16 text-center text-ink-soft">
              <BoltIcon className="w-12 h-12 mx-auto text-ink-faint mb-3" />
              <p className="text-sm font-semibold">Chưa có dữ liệu thông báo</p>
              <p className="text-xs text-ink-faint mt-1">
                Vui lòng chọn file Excel danh sách điện nước ở bước 1 để nạp dữ liệu.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-ink">
                <thead className="bg-surface-alt/70 text-ink-soft border-b border-brand-border font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Mã Căn</th>
                    <th className="py-3 px-4">Tên Cư Dân / Đơn Vị</th>
                    <th className="py-3 px-4 text-center">Kỳ</th>
                    <th className="py-3 px-4 text-right">Điện (kWh)</th>
                    <th className="py-3 px-4 text-right">Nước (m³)</th>
                    <th className="py-3 px-4 text-right">Tổng Tiền</th>
                    <th className="py-3 px-4">Kênh Sẵn Sàng</th>
                    <th className="py-3 px-4 text-center">Trạng Thái</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border font-mono text-xs">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-alt/40 transition-colors font-sans">
                      <td className="py-3.5 px-4 font-bold text-ink font-mono">{r.MaCanHo}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-ink max-w-[200px] truncate" title={r.HoTen}>
                          {r.HoTen.split('\n')[0]}
                        </div>
                        <div className="text-[11px] text-ink-soft font-mono">
                          {r.SDT} {r.ZaloId ? `· Zalo: ${r.ZaloId.slice(0, 6)}...` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono">{r.ThangNam}</td>
                      <td className="py-3.5 px-4 text-right font-mono">
                        {r.ChiSo_dien.toLocaleString('vi-VN')}
                        <span className="text-[10px] text-ink-soft block font-sans">
                          {r.SoTien_dien.toLocaleString('vi-VN')} đ
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">
                        {r.ChiSo_nuoc.toLocaleString('vi-VN')}
                        <span className="text-[10px] text-ink-soft block font-sans">
                          {r.SoTien_nuoc.toLocaleString('vi-VN')} đ
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold font-mono text-accent">
                        {r.TongTien.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              r.ZaloId ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            Zalo
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              r.Email ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            Email
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {r.statusZalo === 'SUCCESS' && (
                            <span className="text-[10px] text-brand-success font-semibold flex items-center gap-0.5">
                              <CheckCircleIcon className="w-3 h-3" /> Zalo OK
                            </span>
                          )}
                          {r.statusZalo === 'FAILED' && (
                            <span className="text-[10px] text-brand-danger font-semibold flex items-center gap-0.5" title={r.errorMsg}>
                              <ExclamationTriangleIcon className="w-3 h-3" /> Zalo Lỗi
                            </span>
                          )}
                          {r.statusEmail === 'SUCCESS' && (
                            <span className="text-[10px] text-brand-success font-semibold flex items-center gap-0.5">
                              <CheckCircleIcon className="w-3 h-3" /> Email OK
                            </span>
                          )}
                          {r.statusEmail === 'FAILED' && (
                            <span className="text-[10px] text-brand-danger font-semibold flex items-center gap-0.5" title={r.errorMsg}>
                              <ExclamationTriangleIcon className="w-3 h-3" /> Email Lỗi
                            </span>
                          )}
                          {!r.statusZalo && !r.statusEmail && (
                            <span className="text-[11px] text-ink-faint">Chưa gửi</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handlePreview(r)}
                            className="p-1.5 text-ink-soft hover:text-accent hover:bg-surface rounded-lg transition-colors cursor-pointer"
                            title="Xem bản in hóa đơn"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendSingleZalo(r)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Gửi riêng Zalo qua n8n"
                          >
                            <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendSingleEmail(r)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Gửi riêng Email"
                          >
                            <EnvelopeIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal Xem Trước Bản In */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface rounded-2xl border border-brand-border shadow-elevation-overlay w-full max-w-4xl h-[92vh] flex flex-col overflow-hidden animate-slide-up">
            <div className="p-4 px-6 border-b border-brand-border flex items-center justify-between bg-surface">
              <div>
                <h3 className="text-base font-bold text-ink">
                  Hóa Đơn Điện Nước — {selectedRecord.MaCanHo}
                </h3>
                <p className="text-xs text-ink-soft">
                  Kỳ: {selectedRecord.ThangNam} · Tổng tiền:{' '}
                  <strong className="text-accent">{selectedRecord.TongTien.toLocaleString('vi-VN')} đ</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 text-xs font-semibold text-ink bg-surface-alt hover:bg-surface border border-brand-border rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  title="In trực tiếp"
                >
                  <PrinterIcon className="w-4 h-4" />
                  <span>In</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(selectedRecord)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-accent hover:bg-accent-hover rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Tải file PDF"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  <span>Tải PDF</span>
                </button>
                <button
                  type="button"
                  onClick={closePreviewModal}
                  className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-gray-100 p-3 overflow-hidden flex items-center justify-center">
              <iframe
                ref={iframeRef}
                srcDoc={generateUtilityInvoiceHTML(selectedRecord)}
                title="Utility Invoice Preview"
                className="w-full h-full rounded-xl bg-white shadow-md border border-gray-300"
              />
            </div>

            <div className="p-4 px-6 border-t border-brand-border flex items-center justify-between bg-surface">
              <div className="text-xs text-ink-soft">
                Cú pháp chuyển khoản:{' '}
                <strong className="text-ink font-mono bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {selectedRecord.NoiDung}
                </strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSendSingleZalo(selectedRecord)}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer"
                >
                  Gửi Zalo (n8n)
                </button>
                <button
                  type="button"
                  onClick={() => handleSendSingleEmail(selectedRecord)}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition cursor-pointer"
                >
                  Gửi Email
                </button>
                <button
                  type="button"
                  onClick={closePreviewModal}
                  className="px-4 py-2 text-xs font-semibold text-ink-soft hover:text-ink rounded-xl transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Báo Cáo Thống Kê Chi Tiết Kết Quả Phát Hành */}
      {dispatchResult?.showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface rounded-2xl border border-brand-border shadow-elevation-overlay w-full max-w-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-brand-border flex items-center justify-between bg-surface">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-accent-soft text-accent">
                  <CheckCircleIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">
                    Báo Cáo Thống Kê Phát Hành: {dispatchResult.channelName}
                  </h3>
                  <p className="text-xs text-ink-soft">
                    Chi tiết phản hồi thời gian thực từ Zalo API / SMTP Server
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDispatchResult((prev) => (prev ? { ...prev, showModal: false } : null))}
                className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-surface-alt transition-colors cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Stat Cards */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div
                  onClick={() => setReportFilter('ALL')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    reportFilter === 'ALL'
                      ? 'bg-accent-soft border-accent ring-2 ring-accent/30'
                      : 'bg-surface-alt border-brand-border hover:bg-surface'
                  }`}
                >
                  <span className="text-[11px] text-ink-soft block font-semibold">Tất Cả Căn Hộ</span>
                  <span className="text-2xl font-bold font-mono text-ink">
                    {dispatchResult.total}
                  </span>
                </div>
                <div
                  onClick={() => setReportFilter('SUCCESS')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    reportFilter === 'SUCCESS'
                      ? 'bg-brand-success-soft border-brand-success ring-2 ring-brand-success/30'
                      : 'bg-surface-alt border-brand-border hover:bg-brand-success-soft/30'
                  }`}
                >
                  <span className="text-[11px] text-brand-success block font-semibold">✓ Gửi Thành Công</span>
                  <span className="text-2xl font-bold font-mono text-brand-success">
                    {dispatchResult.successCount}
                  </span>
                </div>
                <div
                  onClick={() => setReportFilter('FAILED')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    reportFilter === 'FAILED'
                      ? 'bg-brand-danger-soft border-brand-danger ring-2 ring-brand-danger/30'
                      : 'bg-surface-alt border-brand-border hover:bg-brand-danger-soft/30'
                  }`}
                >
                  <span className="text-[11px] text-brand-danger block font-semibold">⚠️ Gửi Thất Bại</span>
                  <span className="text-2xl font-bold font-mono text-brand-danger">
                    {dispatchResult.failedCount}
                  </span>
                </div>
              </div>

              {/* Filter Tabs & Export CSV Button */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-ink">
                  Danh sách chi tiết ({reportFilter === 'ALL' ? 'Tất cả' : reportFilter === 'SUCCESS' ? 'Thành công' : 'Thất bại'}):
                </span>
                <button
                  type="button"
                  onClick={handleExportReportExcel}
                  className="px-3 py-1.5 text-xs font-semibold text-accent-ink bg-accent-soft hover:bg-accent-soft/80 rounded-lg transition flex items-center gap-1 cursor-pointer"
                >
                  <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                  <span>Xuất Báo Cáo CSV</span>
                </button>
              </div>

              {/* Details List */}
              <div className="border border-brand-border rounded-xl overflow-hidden divide-y divide-brand-border max-h-64 overflow-y-auto">
                {dispatchResult.details
                  .filter((d) => {
                    if (reportFilter === 'SUCCESS') return d.status === 'SUCCESS';
                    if (reportFilter === 'FAILED') return d.status === 'FAILED';
                    return true;
                  })
                  .map((d, i) => {
                    const isOk = d.status === 'SUCCESS';
                    return (
                      <div key={i} className="p-3 text-xs flex items-start justify-between gap-3 hover:bg-surface-alt/50 transition">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${isOk ? 'bg-brand-success' : 'bg-brand-danger'}`} />
                            <strong className="font-mono text-ink">{d.maCanHo}</strong>
                            <span className="text-ink-soft truncate font-medium">({d.hoTen.split('\n')[0]})</span>
                          </div>
                          <div className="text-[11px] text-ink-faint mt-0.5">
                            {d.sdt && <span>SĐT: {d.sdt}</span>}
                            {d.zaloId && <span className="ml-2 font-mono">Zalo ID: {d.zaloId}</span>}
                            {d.email && <span className="ml-2">Email: {d.email}</span>}
                          </div>
                          {(d.error || d.zaloMsg || d.emailMsg) && (
                            <p className={`text-[11px] mt-1 font-mono ${isOk ? 'text-brand-success' : 'text-brand-danger'}`}>
                              Phản hồi: {d.error || d.zaloMsg || d.emailMsg}
                            </p>
                          )}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            isOk ? 'bg-brand-success-soft text-brand-success' : 'bg-brand-danger-soft text-brand-danger'
                          }`}
                        >
                          {isOk ? 'THÀNH CÔNG' : 'THẤT BẠI'}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="p-4 px-6 border-t border-brand-border flex justify-between items-center bg-surface">
              <span className="text-xs text-ink-soft">
                Tỷ lệ thành công:{' '}
                <strong className="text-brand-success">
                  {dispatchResult.total > 0
                    ? Math.round((dispatchResult.successCount / dispatchResult.total) * 100)
                    : 0}%
                </strong>
              </span>
              <button
                type="button"
                onClick={() => setDispatchResult((prev) => (prev ? { ...prev, showModal: false } : null))}
                className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Đã hiểu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UtilityNotificationPortal;
