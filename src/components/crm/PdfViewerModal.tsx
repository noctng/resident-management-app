import React from 'react';
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  DocumentTextIcon,
  ArrowsPointingOutIcon,
} from '../icons';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    document_name: string;
    file_url: string;
    doc_type?: string;
    file_size?: number;
    contracts?: { contract_code: string; apartments?: { code: string } };
    apartments?: { code: string };
    uploaded_at?: string;
  } | null;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  onClose,
  document,
}) => {
  if (!isOpen || !document) return null;

  const rawUrl = document.file_url || '';

  // Build the final URL:
  // - /crm_docs/filename.pdf  → nginx serves it as a static file at this exact path (DO NOT rewrite)
  // - /uploads/...            → nginx serves as static
  // - http(s)://...           → use as-is
  const fullUrl = rawUrl.startsWith('http')
    ? rawUrl
    : `${window.location.origin}${rawUrl}`;

  const getDocTypeLabel = (type?: string) => {
    switch (type) {
      case 'HDMB_SCAN': return 'Bản Scan HĐMB (Bản Cứng)';
      case 'DEPOSIT_RECEIPT_SCAN': return 'Bản Scan Phiếu Cọc / PDC';
      case 'TRANSFER_AGREEMENT_SCAN': return 'Bản Scan HĐ Chuyển Nhượng';
      case 'CUSTOMER_ID_SCAN': return 'Bản Scan CCCD / Hộ Chiếu';
      case 'TAX_RECEIPT_SCAN': return 'Biên Lai Thuế TNCN / Trước Bạ';
      case 'TITLE_DEED_SCAN': return 'Bản Scan Sổ Đỏ / Sổ Hồng';
      case 'HANDOVER_MINUTES_SCAN': return 'Biên Bản Bàn Giao Nhà';
      case 'AMENDMENT_SCAN': return 'Phụ Lục Hợp Đồng';
      default: return 'Tài Liệu Đính Kèm';
    }
  };

  const handleDownload = () => {
    const link = window.document.createElement('a');
    link.href = fullUrl;
    link.download = document.document_name || 'document.pdf';
    link.target = '_blank';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handlePrint = () => {
    // Try printing via iframe; fallback to new tab
    const iframe = window.document.getElementById('pdf-viewer-frame') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch {
        window.open(fullUrl, '_blank');
      }
    } else {
      window.open(fullUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-fade-in" role="dialog" aria-modal="true">
      <div className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden animate-scale-up">

        {/* ─── Modal Header ─────────────────────────────────────────── */}
        <div className="px-5 py-3.5 border-b border-brand-border bg-surface-alt flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <DocumentTextIcon className="w-6 h-6 text-accent shrink-0" />
            <div className="truncate">
              <h3 className="font-bold text-ink text-sm sm:text-base truncate" title={document.document_name}>
                {document.document_name}
              </h3>
              <p className="text-[11px] text-ink-soft flex flex-wrap items-center gap-2">
                <span className="px-1.5 py-0.5 bg-accent-soft text-accent-ink rounded font-semibold">
                  {getDocTypeLabel(document.doc_type)}
                </span>
                {document.contracts?.contract_code && (
                  <span className="font-mono font-bold text-ink">
                    HĐ: {document.contracts.contract_code}
                  </span>
                )}
                {document.apartments?.code && (
                  <span>• Căn: <strong>{document.apartments.code}</strong></span>
                )}
                {document.file_size ? (
                  <span>• {(document.file_size / (1024 * 1024)).toFixed(2)} MB</span>
                ) : null}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 text-ink-soft hover:text-ink hover:bg-surface rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 text-xs font-bold"
              title="In tài liệu"
            >
              <PrinterIcon className="w-4 h-4" />
              <span className="hidden sm:inline">In</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="p-2 text-ink-soft hover:text-ink hover:bg-surface rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 text-xs font-bold"
              title="Tải về máy"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Tải Về</span>
            </button>

            <a
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-ink-soft hover:text-ink hover:bg-surface rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 text-xs font-bold"
              title="Mở tab mới"
            >
              <ArrowsPointingOutIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Mở Rộng</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-ink-soft hover:text-brand-danger hover:bg-brand-danger-soft rounded-lg transition-colors cursor-pointer ml-1"
              title="Đóng"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─── PDF Viewer Body ──────────────────────────────────────── */}
        {/* Uses <object> tag which is most compatible for inline PDF rendering.
            <iframe> is nested inside as fallback for older browsers.
            Both point to the /crm_docs/ nginx static path directly. */}
        <div className="flex-1 bg-ink relative overflow-hidden">
          <object
            data={`${fullUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
            type="application/pdf"
            className="w-full h-full border-none"
            aria-label={document.document_name}
          >
            <iframe
              id="pdf-viewer-frame"
              src={`${fullUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              title={document.document_name}
              className="w-full h-full border-none"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-pointer-lock"
            />
          </object>
        </div>

        {/* ─── Modal Footer ─────────────────────────────────────────── */}
        <div className="px-5 py-2.5 border-t border-brand-border bg-surface flex items-center justify-between text-xs text-ink-soft">
          <span>
            {document.uploaded_at
              ? `Ngày tải lên: ${new Date(document.uploaded_at).toLocaleString('vi-VN')}`
              : 'Bản scan lưu trữ điện tử'}
          </span>
          <div className="flex items-center gap-2">
            <a
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-accent text-white rounded-lg font-bold text-xs hover:bg-accent/90 transition-colors inline-flex items-center gap-1"
            >
              📄 Mở trong tab mới
            </a>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-surface-alt hover:bg-brand-border text-ink rounded-lg font-bold transition-colors cursor-pointer"
            >
              Đóng Trình Xem
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
