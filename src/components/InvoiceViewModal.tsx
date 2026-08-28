import React, { useState, useEffect, useRef } from 'react';
import {
  DocumentTextIcon,
  ArrowPathIcon,
  XMarkIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
  DocumentChartBarIcon,
} from './icons';
import { api } from '../services/api';
import { useConfirm } from './ui';

interface InvoiceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'utility' | 'unified';
  id?: string;
  apartmentId?: string;
  apartmentCode: string;
  month: number;
  year: number;
}

export const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({
  isOpen,
  onClose,
  type,
  id,
  apartmentId,
  apartmentCode,
  month,
  year,
}) => {
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const { confirm } = useConfirm();
  const [invoiceHtml, setInvoiceHtml] = useState<string>('');
  const [fkey, setFkey] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [isVnptPublished, setIsVnptPublished] = useState<boolean>(false);
  const [vnptMccqt, setVnptMccqt] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Zoom & scaling state
  const [scale, setScale] = useState<number>(1);
  const [autoFit, setAutoFit] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const calculateFitScale = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 24;
      const targetWidth = 970;
      if (containerWidth < targetWidth) {
        return Math.max(0.35, Math.min(1, containerWidth / targetWidth));
      }
    }
    return 1;
  };

  const fetchInvoiceView = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        type,
        ...(id ? { id } : {}),
        ...(apartmentId ? { apartmentId } : {}),
        apartmentCode,
        month: String(month),
        year: String(year),
      });

      const res: any = await api.get(`/vnpt-invoice/view?${queryParams.toString()}`);
      if (res && res.success) {
        setInvoiceHtml(res.html);
        setFkey(res.fkey || '');
        setInvoiceNumber(res.invoiceNumber || '');
        setIsVnptPublished(Boolean(res.isVnptPublished));
        setVnptMccqt(res.vnptMccqt || '');
        setTimeout(() => {
          if (autoFit) {
            setScale(calculateFitScale());
          }
        }, 100);
      } else {
        setError(res?.message || 'Không thể tải dữ liệu hóa đơn điện tử.');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải hóa đơn.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      if (autoFit) {
        setScale(calculateFitScale());
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, autoFit]);

  useEffect(() => {
    if (!isOpen) return;
    fetchInvoiceView();
  }, [isOpen, type, id, apartmentId, apartmentCode, month, year]);

  const handlePublishToVnpt = async () => {
    if (publishing) return;
    if (
      !(await confirm({
        title: 'Xuất hóa đơn điện tử chính thức?',
        description: `Hóa đơn của căn hộ ${apartmentCode} (Kỳ ${String(month).padStart(2, '0')}/${year}) sẽ được phát hành lên VNPT.`,
        variant: 'primary',
        confirmLabel: 'Xuất HĐĐT',
      }))
    )
      return;

    setPublishing(true);
    setError(null);
    setSuccessNotice(null);

    try {
      const res: any = await api.post('/vnpt-invoice/publish', {
        type,
        id,
        apartmentId,
        apartmentCode,
        month,
        year,
      });

      if (res && res.success) {
        setSuccessNotice(res.message || 'Đã phát hành hóa đơn điện tử lên VNPT thành công!');
        setIsVnptPublished(true);
        if (res.mccqt) setVnptMccqt(res.mccqt);
        if (res.invoiceNumber) setInvoiceNumber(res.invoiceNumber);
        // Refresh invoice view with official template
        await fetchInvoiceView();
      } else {
        setError(res?.message || 'Phát hành hóa đơn thất bại.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Lỗi kết nối khi phát hành hóa đơn VNPT.');
    } finally {
      setPublishing(false);
    }
  };

  if (!isOpen) return null;

  const downloadUrlPdf = `/api/vnpt-invoice/download-pdf?type=${type}${id ? `&id=${id}` : ''}${apartmentId ? `&apartmentId=${apartmentId}` : ''}&apartmentCode=${apartmentCode}&month=${month}&year=${year}`;
  const downloadUrlXml = `/api/vnpt-invoice/download-xml?type=${type}${id ? `&id=${id}` : ''}${apartmentId ? `&apartmentId=${apartmentId}` : ''}&apartmentCode=${apartmentCode}&month=${month}&year=${year}`;

  const handlePrint = () => {
    const iframe = document.getElementById('invoice-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  };

  const handleZoomIn = () => {
    setAutoFit(false);
    setScale((prev) => Math.min(1.5, Number((prev + 0.15).toFixed(2))));
  };

  const handleZoomOut = () => {
    setAutoFit(false);
    setScale((prev) => Math.max(0.35, Number((prev - 0.15).toFixed(2))));
  };

  const handleResetZoom = () => {
    setAutoFit(true);
    setScale(calculateFitScale());
  };

  const baseHeight = 880;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface rounded-2xl shadow-xl border border-brand-border w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in">
        
        {/* Header - Mobile & Desktop friendly */}
        <div className="px-3.5 py-2.5 sm:px-5 sm:py-3.5 border-b border-brand-border bg-surface-alt/50 flex-shrink-0">
          {/* Row 1: Title + TT78 Badge + Status + Close Button */}
          <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <div className="p-1.5 sm:p-2 bg-accent-soft text-accent-ink rounded-lg sm:rounded-xl flex-shrink-0">
                <DocumentTextIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                <h3 className="font-bold text-ink text-sm sm:text-base whitespace-nowrap">
                  Hóa Đơn Điện Tử
                </h3>
                {isVnptPublished ? (
                  <span className="px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-full bg-brand-success-soft text-brand-success inline-flex items-center gap-1 border border-brand-success/30 flex-shrink-0">
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    HĐĐT Chính Thức VNPT (Đã Ký Số)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-full bg-brand-warning-soft text-brand-warning inline-flex items-center gap-1 border border-brand-warning/30 flex-shrink-0">
                    <DocumentTextIcon className="w-3 h-3" />
                    Bản Thể Hiện Nội Bộ (Chưa xuất VNPT)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {!isVnptPublished && (
                <button
                  type="button"
                  onClick={handlePublishToVnpt}
                  disabled={publishing || loading}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
                  title="Gửi dữ liệu và phát hành chính thức lên cổng VNPT E-Invoice"
                >
                  {publishing ? (
                    <>
                      <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang phát hành...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                      <span>Xuất HĐĐT lên VNPT</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 text-ink-soft hover:text-ink rounded-lg hover:bg-surface-alt transition-colors duration-200 cursor-pointer flex-shrink-0"
                aria-label="Đóng"
              >
                <XMarkIcon className="w-5 h-5 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Alert notice if success */}
          {successNotice && (
            <div className="mt-2 p-2 bg-brand-success-soft border border-brand-success/30 rounded-lg text-brand-success text-xs flex items-center justify-between gap-2">
              <span>{successNotice}</span>
              <button
                onClick={() => setSuccessNotice(null)}
                className="text-brand-success hover:text-ink transition-colors duration-200 cursor-pointer"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Row 2: Info & Action Toolbar */}
          <div className="mt-2 pt-2 border-t border-brand-border/60 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-ink-soft truncate">
              Căn hộ: <strong className="text-ink font-mono">{apartmentCode}</strong> • Kỳ: <strong className="text-ink font-mono">{String(month).padStart(2, '0')}/{year}</strong> • FKey: <code className="text-accent font-mono text-[11px]">{fkey || '...'}</code>
              {vnptMccqt && (
                <> • MCCQT: <code className="text-brand-teal font-mono text-[11px]">{vnptMccqt}</code></>
              )}
            </p>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap ml-auto">
              {/* Zoom Controls */}
              <div className="flex items-center bg-surface-alt rounded-lg p-0.5 text-xs">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  title="Thu nhỏ"
                  className="px-2 py-1 hover:bg-surface text-ink rounded font-bold transition-colors duration-200 cursor-pointer"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  title="Tự động căn vừa màn hình"
                  className="px-2 py-1 hover:bg-surface text-ink rounded text-[11px] font-semibold transition-colors duration-200 cursor-pointer"
                >
                  {autoFit ? 'Vừa khung' : `${Math.round(scale * 100)}%`}
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  title="Phóng to"
                  className="px-2 py-1 hover:bg-surface text-ink rounded font-bold transition-colors duration-200 cursor-pointer"
                >
                  +
                </button>
              </div>

              {/* Action Buttons */}
              <button
                type="button"
                onClick={handlePrint}
                disabled={loading || !!error}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 border border-brand-border text-ink text-xs font-semibold rounded-lg hover:bg-surface-alt transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PrinterIcon className="w-3.5 h-3.5" />
                <span>In</span>
              </button>

              <a
                href={downloadUrlPdf}
                download={`HDDT_${apartmentCode}_${String(month).padStart(2, '0')}${year}.pdf`}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-brand-danger-soft hover:bg-brand-danger/20 text-brand-danger text-xs font-bold rounded-lg border border-brand-danger/30 transition-colors duration-200 cursor-pointer"
                title={isVnptPublished ? 'Tải PDF chính thức từ VNPT' : 'Tải PDF bản thể hiện nội bộ'}
              >
                <DocumentArrowDownIcon className="w-3.5 h-3.5" />
                <span>{isVnptPublished ? 'Tải PDF VNPT' : 'Tải PDF'}</span>
              </a>

              <a
                href={downloadUrlXml}
                download={`HDDT_${apartmentCode}_${String(month).padStart(2, '0')}${year}.xml`}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-brand-teal-soft hover:bg-brand-teal/20 text-brand-teal text-xs font-bold rounded-lg border border-brand-teal/30 transition-colors duration-200 cursor-pointer"
                title={isVnptPublished ? 'Tải XML chính thức từ VNPT' : 'Tải XML chuẩn TCT'}
              >
                <DocumentChartBarIcon className="w-3.5 h-3.5" />
                <span>{isVnptPublished ? 'Tải XML VNPT' : 'Tải XML'}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Content Body - Responsive Scaling Viewport */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto p-2 sm:p-4 bg-bg flex justify-center custom-scrollbar"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 text-ink-soft">
              <ArrowPathIcon className="w-8 h-8 animate-spin text-accent mb-3" />
              <p className="text-sm font-medium">Đang tải bản thể hiện hóa đơn điện tử...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-brand-danger max-w-md">
              <p className="font-semibold text-sm mb-2">Không thể tải hóa đơn điện tử</p>
              <p className="text-xs text-ink-soft">{error}</p>
            </div>
          ) : (
            <div
              className="flex justify-center items-start w-full"
              style={{
                minHeight: `${baseHeight * scale}px`,
              }}
            >
              <div
                style={{
                  width: `${970 * scale}px`,
                  height: `${baseHeight * scale}px`,
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.1)',
                  transition: 'width 0.15s ease-out, height 0.15s ease-out',
                }}
              >
                <iframe
                  id="invoice-iframe"
                  srcDoc={invoiceHtml}
                  title="Bản thể hiện HĐĐT"
                  className="bg-surface"
                  style={{
                    border: 'none',
                    width: '970px',
                    height: `${baseHeight}px`,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="px-4 py-2.5 sm:px-5 bg-surface-alt/50 border-t border-brand-border flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft flex-shrink-0">
          <div className="truncate">
            Hóa đơn điện tử có giá trị pháp lý tương đương hóa đơn giấy theo quy định của Tổng Cục Thuế.
          </div>
          <div className="font-mono text-[11px] whitespace-nowrap ml-auto">
            Số HĐ: <strong className="text-ink">{invoiceNumber || 'HD00001'}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceViewModal;
