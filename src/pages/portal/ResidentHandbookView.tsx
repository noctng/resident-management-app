import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  DocumentTextIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  PhoneIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '../../components/icons';
import { FullscreenPdfViewerModal } from '../../components/FullscreenPdfViewerModal';
import { PdfCanvasReader } from '../../components/PdfCanvasReader';

interface HandbookInfo {
  title?: string;
  subtitle?: string;
  hotlineSecurity?: string;
  hotlineTechnical?: string;
  hotlineFeedback?: string;
  fileName?: string;
  url?: string;
  exists?: boolean;
}

const ResidentHandbookView: React.FC = () => {
  const [handbookUrl, setHandbookUrl] = useState('/api/config/handbook/file');
  const [info, setInfo] = useState<HandbookInfo>({
    title: '📖 Sổ Tay Cư Dân - Khu Đô Thị Thành Phố Cà Phê',
    subtitle:
      'Cẩm nang quy chuẩn nội quy khu đô thị, hướng dẫn sử dụng tiện ích cao cấp, chính sách tài chính & danh bạ cứu hộ khẩn cấp 24/7 do Ban Quản Lý ban hành.',
    hotlineSecurity: '0262 3999 888',
    hotlineTechnical: '0901 234 567',
    hotlineFeedback: '0262 3999 999',
  });
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    loadHandbook();
  }, []);

  const loadHandbook = async () => {
    try {
      setLoading(true);
      const data = await api.get<HandbookInfo>('/config/handbook');
      if (data) {
        setInfo(data);
        if (data.url) {
          setHandbookUrl(`${data.url}?t=${Date.now()}`);
        } else {
          setHandbookUrl(`/api/config/handbook/file?t=${Date.now()}`);
        }
      }
    } catch (e) {
      console.error('Failed to load handbook:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.open(handbookUrl, '_blank')?.print();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {loading && (
        <div className="bg-surface rounded-2xl border border-brand-border p-5 space-y-3">
          <div className="h-3.5 w-1/3 rounded-full bg-gradient-to-r from-surface-alt via-brand-border/60 to-surface-alt bg-[length:200%_100%] animate-shimmer"></div>
          <div className="h-3.5 w-2/3 rounded-full bg-gradient-to-r from-surface-alt via-brand-border/60 to-surface-alt bg-[length:200%_100%] animate-shimmer"></div>
          <div className="h-3.5 w-1/2 rounded-full bg-gradient-to-r from-surface-alt via-brand-border/60 to-surface-alt bg-[length:200%_100%] animate-shimmer"></div>
        </div>
      )}
      {/* Top Banner Card */}
      <div className="bg-surface rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-brand-border">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-accent-soft/60 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-soft text-accent-ink text-xs font-bold">
              <SparklesIcon className="w-3.5 h-3.5" />
              <span>TÀI LIỆU QUẢN LÝ VẬN HÀNH 2026</span>
            </div>
            <h1 className="text-2xl font-serif font-semibold tracking-tight text-ink">
              {info.title || '📖 Sổ Tay Cư Dân Thành Phố Cà Phê'}
            </h1>
            <p className="text-sm text-ink-soft max-w-2xl leading-relaxed">
              {info.subtitle ||
                'Cẩm nang quy chuẩn nội quy khu đô thị, hướng dẫn sử dụng tiện ích cao cấp, chính sách tài chính & danh bạ cứu hộ khẩn cấp 24/7 do Ban Quản Lý ban hành.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <span>⛶ Mở Toàn Màn Hình (Zoom)</span>
            </button>

            <a
              href={handbookUrl}
              download={info.fileName || 'So_Tay_Cu_Dan_Thanh_Pho_Ca_Phe.pdf'}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-surface-alt hover:bg-brand-border/40 text-ink font-semibold text-xs transition flex items-center gap-2 cursor-pointer border border-brand-border"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              <span>Tải PDF Về Máy</span>
            </a>

            <button
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-surface-alt hover:bg-brand-border/40 text-ink font-semibold text-xs transition flex items-center gap-2 cursor-pointer border border-brand-border hidden sm:flex"
            >
              <PrinterIcon className="w-4 h-4" />
              <span>In</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Access Hotline Cards (Click to Call) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <a
          href={`tel:${(info.hotlineSecurity || '02623999888').replace(/\s+/g, '')}`}
          className="bg-surface border border-brand-border rounded-xl p-4 text-center shadow-xs flex flex-col items-center gap-2 hover:border-accent/40 transition cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent-ink flex items-center justify-center shrink-0">
            <ShieldCheckIcon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">AN NINH 24/7</span>
            <strong className="text-sm text-ink font-mono font-semibold">
              {info.hotlineSecurity || '0262 3999 888'}
            </strong>
          </div>
        </a>

        <a
          href={`tel:${(info.hotlineTechnical || '0901234567').replace(/\s+/g, '')}`}
          className="bg-surface border border-brand-border rounded-xl p-4 text-center shadow-xs flex flex-col items-center gap-2 hover:border-accent/40 transition cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-teal-soft text-brand-teal flex items-center justify-center shrink-0">
            <PhoneIcon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">HOTLINE KỸ THUẬT</span>
            <strong className="text-sm text-ink font-mono font-semibold">
              {info.hotlineTechnical || '0901 234 567'}
            </strong>
          </div>
        </a>

        <a
          href={`tel:${(info.hotlineFeedback || '02623999999').replace(/\s+/g, '')}`}
          className="bg-surface border border-brand-border rounded-xl p-4 text-center shadow-xs flex flex-col items-center gap-2 hover:border-accent/40 transition cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-warning-soft text-brand-warning flex items-center justify-center shrink-0">
            <DocumentTextIcon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">TIẾP NHẬN PHẢN ÁNH</span>
            <strong className="text-sm text-ink font-mono font-semibold">
              {info.hotlineFeedback || '0262 3999 999'}
            </strong>
          </div>
        </a>
      </div>

      {/* Embedded PDF Viewer Container with HTML5 Canvas (100% Mobile Compatible) */}
      <div className="bg-surface rounded-3xl p-3 sm:p-6 border border-brand-border shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-brand-border">
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-accent" />
            <strong className="text-sm text-ink font-bold">
              Trình Xem Trực Tiếp Toàn Văn Sổ Tay Cư Dân
            </strong>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="px-3 py-1.5 rounded-xl bg-accent-soft hover:bg-accent-soft/70 text-accent-ink font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>⛶ Phóng Toàn Màn Hình (Zoom)</span>
            </button>
          </div>
        </div>

        {/* HTML5 Canvas PDF Reader */}
        <div className="w-full h-[650px] sm:h-[750px] rounded-2xl overflow-hidden shadow-inner">
          <PdfCanvasReader
            pdfUrl={handbookUrl}
            title={info.title}
            fileName={info.fileName}
            initialScale={1.0}
            showControls={true}
            onOpenFullscreen={() => setIsFullscreen(true)}
          />
        </div>
      </div>

      {/* Fullscreen PDF Modal with Zoom In/Out & Fit */}
      <FullscreenPdfViewerModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        pdfUrl={handbookUrl}
        title={info.title}
        fileName={info.fileName}
      />
    </div>
  );
};

export default ResidentHandbookView;
