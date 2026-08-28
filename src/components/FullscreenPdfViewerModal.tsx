import React, { useEffect, useCallback } from 'react';
import {
  DocumentTextIcon,
  XMarkIcon,
} from './icons';
import { PdfCanvasReader } from './PdfCanvasReader';

interface FullscreenPdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  title?: string;
  fileName?: string;
}

export const FullscreenPdfViewerModal: React.FC<FullscreenPdfViewerModalProps> = ({
  isOpen,
  onClose,
  pdfUrl,
  title = 'Sổ Tay Cư Dân - Thành Phố Cà Phê',
  fileName = 'So_Tay_Cu_Dan.pdf',
}) => {
  // Handle Keyboard Shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-sidebar-bg-2/95 flex flex-col backdrop-blur-lg animate-fade-in select-none">
      
      {/* Top Floating Control Bar */}
      <header className="h-14 px-4 sm:px-6 bg-sidebar-bg-2 border-b border-sidebar-line text-white flex items-center justify-between gap-3 shrink-0 shadow-xl z-10">
        
        {/* Title & Document Badge */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-accent/20 text-accent-soft flex items-center justify-center border border-accent/30 shrink-0">
            <DocumentTextIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-accent-soft truncate">
              {title}
            </h2>
            <div className="flex items-center gap-2 text-[10px] text-sidebar-dim">
              <span>Chế độ đọc Toàn Màn Hình</span>
              <span className="px-1.5 py-0.2 bg-sidebar-line rounded text-accent-soft font-mono hidden sm:inline">
                {fileName}
              </span>
            </div>
          </div>
        </div>

        {/* Close Button (Esc) */}
        <button
          type="button"
          onClick={onClose}
          title="Đóng toàn màn hình (Phím Esc)"
          className="px-3 h-8 sm:h-9 rounded-xl bg-brand-danger hover:brightness-110 text-white border border-brand-danger/50 transition flex items-center gap-1.5 cursor-pointer text-xs font-bold"
        >
          <XMarkIcon className="w-4 h-4" />
          <span>Đóng (Esc)</span>
        </button>

      </header>

      {/* Main Viewport Container */}
      <main className="flex-1 w-full h-[calc(100vh-3.5rem)] overflow-hidden bg-sidebar-bg-2 flex flex-col">
        <PdfCanvasReader
          pdfUrl={pdfUrl}
          title={title}
          fileName={fileName}
          initialScale={1.1}
          showControls={true}
          isFullscreen={true}
        />
      </main>

    </div>
  );
};

export default FullscreenPdfViewerModal;
