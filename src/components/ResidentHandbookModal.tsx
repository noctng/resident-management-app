import React, { useEffect, useCallback , useRef} from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import {
  DocumentTextIcon,
  XMarkIcon,
} from './icons';
import { PdfCanvasReader } from './PdfCanvasReader';

interface ResidentHandbookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ResidentHandbookModal: React.FC<ResidentHandbookModalProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen);

  const pdfUrl = '/api/config/handbook/file';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none" ref={dialogRef} role="dialog" aria-modal="true">
      <div className="bg-sidebar-bg-2 rounded-none sm:rounded-3xl shadow-elevation-overlay border border-sidebar-line w-full max-w-6xl h-full sm:h-[95vh] flex flex-col overflow-hidden animate-scale-up">
        
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3 bg-sidebar-bg text-white flex items-center justify-between border-b border-sidebar-line shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-accent/20 text-accent-soft flex items-center justify-center border border-accent/30 shrink-0">
              <DocumentTextIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-accent-soft truncate flex items-center gap-2">
                <span>Sổ Tay Cư Dân - Thành Phố Cà Phê</span>
                <span className="px-2 py-0.5 bg-accent/20 text-accent-soft text-[10px] font-bold rounded-full border border-accent/30 hidden sm:inline">
                  TOÀN VĂN
                </span>
              </h3>
              <p className="text-[11px] text-sidebar-dim truncate hidden sm:block">
                Hỗ trợ phóng to / thu nhỏ trực tiếp trên mọi thiết bị
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-brand-danger hover:brightness-110 text-white border border-brand-danger/50 transition flex items-center justify-center cursor-pointer" aria-label="Đóng">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body with Canvas Reader */}
        <div className="flex-1 w-full bg-sidebar-bg-2 overflow-hidden flex flex-col">
          <PdfCanvasReader
            pdfUrl={pdfUrl}
            title="Sổ Tay Cư Dân"
            fileName="So_Tay_Cu_Dan_Thanh_Pho_Ca_Phe.pdf"
            initialScale={1.0}
            showControls={true}
          />
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-2 bg-sidebar-bg border-t border-sidebar-line flex items-center justify-between text-xs text-sidebar-text shrink-0">
          <div>
            Hotline BQL 24/7: <a href="tel:02623999888" className="text-accent-soft font-mono tabular-nums font-bold hover:underline">0262 3999 888</a>
          </div>
          <div className="text-[11px] text-sidebar-dim hidden sm:block">
            Tương thích 100% mọi trình duyệt di động & máy tính
          </div>
        </div>

      </div>
    </div>
  );
};

export default ResidentHandbookModal;
