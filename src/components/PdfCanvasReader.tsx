import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  DocumentArrowDownIcon,
  PrinterIcon,
  ArrowPathIcon,
  DocumentTextIcon,
} from './icons';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;

interface PdfCanvasReaderProps {
  pdfUrl: string;
  title?: string;
  fileName?: string;
  initialScale?: number;
  showControls?: boolean;
  onOpenFullscreen?: () => void;
  isFullscreen?: boolean;
}

interface PageProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  containerWidth: number;
}

// Individual PDF Page Component with guaranteed aspect ratio
const PdfPage: React.FC<PageProps> = ({ pdfDoc, pageNumber, scale, containerWidth }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const render = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const pixelRatio = window.devicePixelRatio || 1;

        // Calculate available display width
        // On mobile (containerWidth < 600), fit almost 100% of container width
        const padding = containerWidth < 600 ? 16 : 48;
        const targetWidth = Math.max(260, (containerWidth - padding) * scale);
        const actualScale = (targetWidth / baseViewport.width);

        const displayWidth = Math.round(targetWidth);
        const displayHeight = Math.round(baseViewport.height * actualScale);

        setDimensions({ width: displayWidth, height: displayHeight });

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Physical canvas buffer dimensions for Retina/HiDPI sharpness
        canvas.width = Math.round(displayWidth * pixelRatio);
        canvas.height = Math.round(displayHeight * pixelRatio);

        // CSS display dimensions
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;

        const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
        if (!ctx) return;

        // Scale context for retina
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        // Cancel previous task if any
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }

        setIsRendering(true);

        const viewport = page.getViewport({ scale: actualScale });
        const task = page.render({
          canvasContext: ctx,
          viewport: viewport,
        });

        renderTaskRef.current = task;
        await task.promise;
        setIsRendering(false);
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn(`Lỗi render trang ${pageNumber}:`, err);
        }
        setIsRendering(false);
      }
    };

    render();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, pageNumber, scale, containerWidth]);

  return (
    <div
      className="flex flex-col items-center bg-white shadow-2xl rounded-xl overflow-hidden my-3 border border-brand-border/30 transition-all"
      style={{
        width: dimensions ? `${dimensions.width}px` : '100%',
        minHeight: dimensions ? `${dimensions.height}px` : '300px',
        maxWidth: '100%',
      }}
    >
      <div className="relative w-full flex items-center justify-center bg-white">
        <canvas
          ref={canvasRef}
          className="block max-w-full bg-white"
          style={{
            width: dimensions ? `${dimensions.width}px` : '100%',
            height: dimensions ? `${dimensions.height}px` : 'auto',
          }}
        />
        {isRendering && !dimensions && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-alt/50">
            <ArrowPathIcon className="w-6 h-6 text-brand-warning animate-spin" />
          </div>
        )}
      </div>

      <div className="w-full py-1.5 px-4 bg-surface-alt dark:bg-surface-alt text-ink-soft dark:text-ink-faint text-[11px] font-mono text-center border-t border-brand-border dark:border-brand-border select-none">
        Trang {pageNumber} / {pdfDoc.numPages}
      </div>
    </div>
  );
};

export const PdfCanvasReader: React.FC<PdfCanvasReaderProps> = ({
  pdfUrl,
  title = 'Sổ Tay Cư Dân',
  fileName = 'So_Tay_Cu_Dan.pdf',
  initialScale = 1.0,
  showControls = true,
  onOpenFullscreen,
  isFullscreen = false,
}) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(initialScale);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'continuous'>('continuous');

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(
    typeof window !== 'undefined' ? Math.min(window.innerWidth - 32, 900) : 600
  );

  // Measure container width accurately
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 100) {
          setContainerWidth(w);
        }
      } else if (typeof window !== 'undefined') {
        setContainerWidth(Math.min(window.innerWidth - 32, 900));
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    const timer = setTimeout(updateWidth, 300);

    return () => {
      window.removeEventListener('resize', updateWidth);
      clearTimeout(timer);
    };
  }, []);

  // Load PDF Document
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadDoc = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (!isMounted) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setLoading(false);
      } catch (err: any) {
        console.error('Lỗi nạp tài liệu PDF:', err);
        if (isMounted) {
          setError('Không thể tải trực tiếp file PDF. Vui lòng sử dụng nút tải về bên dưới.');
          setLoading(false);
        }
      }
    };

    loadDoc();

    return () => {
      isMounted = false;
    };
  }, [pdfUrl]);

  // Zoom handlers
  const handleZoomIn = () => {
    setScale((prev) => Math.min(2.5, Number((prev + 0.15).toFixed(2))));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(0.6, Number((prev - 0.15).toFixed(2))));
  };

  const handleResetZoom = () => {
    setScale(1.0);
  };

  const handlePrint = () => {
    window.open(pdfUrl, '_blank')?.print();
  };

  const zoomPercent = Math.round(scale * 100);

  return (
    <div className="flex flex-col h-full w-full bg-surface-alt text-white rounded-2xl overflow-hidden shadow-xl border border-brand-border">
      
      {/* Reader Toolbar */}
      {showControls && (
        <div className="px-3 py-2.5 bg-surface-alt border-b border-brand-border flex flex-wrap items-center justify-between gap-2 shrink-0 z-10">
          
          {/* Left: Document Info & Page Navigation */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-brand-warning flex items-center gap-1 shrink-0" title={title}>
              <DocumentTextIcon className="w-4 h-4 text-brand-warning" />
              <span className="hidden sm:inline truncate max-w-[150px]">{title}</span>
            </span>

            {numPages > 0 && (
              <div className="flex items-center gap-1 bg-surface-alt px-2 py-1 rounded-xl text-xs font-mono">
                {viewMode === 'single' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="p-1 hover:text-brand-warning disabled:opacity-30 cursor-pointer"
                      title="Trang trước"
                    >
                      ◀
                    </button>
                    <span className="font-bold text-brand-warning">
                      {currentPage} / {numPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                      disabled={currentPage >= numPages}
                      className="p-1 hover:text-brand-warning disabled:opacity-30 cursor-pointer"
                      title="Trang tiếp"
                    >
                      ▶
                    </button>
                  </>
                ) : (
                  <span className="text-brand-warning font-bold">
                    Tổng cộng: {numPages} trang
                  </span>
                )}
              </div>
            )}

            {/* View Mode Toggle */}
            <button
              type="button"
              onClick={() => setViewMode((m) => (m === 'continuous' ? 'single' : 'continuous'))}
              className="px-2 py-1 bg-surface-alt hover:bg-surface-alt text-[11px] rounded-lg text-ink-faint font-medium transition cursor-pointer hidden md:inline"
              title="Đổi chế độ cuộn trang / từng trang"
            >
              {viewMode === 'continuous' ? '📜 Cuộn liên tục' : '📄 Từng trang'}
            </button>
          </div>

          {/* Right: Zoom & Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Zoom Out */}
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={scale <= 0.6}
              title="Thu nhỏ"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-surface-alt hover:bg-surface-alt active:scale-95 disabled:opacity-30 flex items-center justify-center text-ink-faint cursor-pointer font-bold text-sm"
            >
              －
            </button>

            {/* Zoom Percent / Reset */}
            <button
              type="button"
              onClick={handleResetZoom}
              title="100% (Reset Zoom)"
              className="px-2 h-7 sm:h-8 rounded-lg bg-surface-alt hover:bg-surface-alt text-brand-warning font-mono text-xs font-bold cursor-pointer transition active:scale-95"
            >
              {zoomPercent}%
            </button>

            {/* Zoom In */}
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={scale >= 2.5}
              title="Phóng to"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-surface-alt hover:bg-surface-alt active:scale-95 disabled:opacity-30 flex items-center justify-center text-ink-faint cursor-pointer font-bold text-sm"
            >
              ＋
            </button>

            <div className="h-4 w-px bg-surface-alt mx-0.5"></div>

            {/* Fullscreen Button */}
            {onOpenFullscreen && !isFullscreen && (
              <button
                type="button"
                onClick={onOpenFullscreen}
                className="px-2.5 h-7 sm:h-8 bg-brand-warning hover:bg-brand-warning text-white text-xs font-bold rounded-lg transition flex items-center gap-1 active:scale-95 cursor-pointer shadow-xs"
                title="Phóng toàn màn hình"
              >
                <span>⛶ Toàn màn hình</span>
              </button>
            )}

            {/* Download */}
            <a
              href={pdfUrl}
              download={fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 sm:px-2.5 h-7 sm:h-8 rounded-lg bg-surface-alt hover:bg-surface-alt text-ink-faint hover:text-white text-xs font-medium transition flex items-center gap-1 cursor-pointer"
              title="Tải PDF về máy"
            >
              <DocumentArrowDownIcon className="w-4 h-4 text-brand-warning" />
              <span className="hidden lg:inline">Tải về</span>
            </a>

            {/* Print */}
            <button
              type="button"
              onClick={handlePrint}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-surface-alt hover:bg-surface-alt text-ink-faint hover:text-white flex items-center justify-center cursor-pointer hidden md:flex"
              title="In tài liệu"
            >
              <PrinterIcon className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

      {/* Main Canvas Viewport with Touch & Scroll */}
      <div
        ref={containerRef}
        className="flex-1 w-full overflow-auto bg-surface-alt p-2 sm:p-6 flex flex-col items-center gap-2 select-none touch-pan-y"
        style={{ minHeight: isFullscreen ? 'calc(100vh - 4rem)' : '580px' }}
      >
        {loading && (
          <div className="flex flex-col items-center justify-center my-auto py-16 text-ink-faint space-y-3">
            <ArrowPathIcon className="w-9 h-9 text-brand-warning animate-spin" />
            <span className="text-xs font-bold tracking-wide">Đang nạp và kết xuất Sổ Tay Cư Dân...</span>
            <span className="text-[11px] text-ink-soft">Tương thích hoàn hảo mọi thiết bị di động & máy tính</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center my-auto py-12 px-4 text-center space-y-4 max-w-md bg-surface-alt p-6 rounded-2xl border border-brand-border">
            <DocumentTextIcon className="w-12 h-12 text-brand-warning mx-auto" />
            <p className="text-xs text-ink-faint leading-relaxed">{error}</p>
            <a
              href={pdfUrl}
              download={fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-brand-warning hover:bg-brand-warning text-white rounded-xl text-xs font-bold shadow-lg transition flex items-center gap-2"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              <span>Tải File PDF Ngay</span>
            </a>
          </div>
        )}

        {!loading && !error && pdfDoc && numPages > 0 && (
          <>
            {viewMode === 'continuous' ? (
              // Continuous Scroll
              Array.from({ length: numPages }, (_, index) => (
                <PdfPage
                  key={index + 1}
                  pdfDoc={pdfDoc}
                  pageNumber={index + 1}
                  scale={scale}
                  containerWidth={containerWidth}
                />
              ))
            ) : (
              // Single Page View
              <PdfPage
                key={currentPage}
                pdfDoc={pdfDoc}
                pageNumber={currentPage}
                scale={scale}
                containerWidth={containerWidth}
              />
            )}
          </>
        )}
      </div>

    </div>
  );
};

export default PdfCanvasReader;
