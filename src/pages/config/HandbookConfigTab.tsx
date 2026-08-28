import React, { useState, useEffect } from 'react';
import { PdfCanvasReader } from '../../components/PdfCanvasReader';
import { FullscreenPdfViewerModal } from '../../components/FullscreenPdfViewerModal';
import { api } from '../../services/api';
import {
  DocumentTextIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  TrashIcon,
  PhoneIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  BoltIcon,
  MagnifyingGlassIcon,
} from '../../components/icons';
import { useToast, useConfirm } from '../../components/ui';

export interface HandbookData {
  title: string;
  subtitle?: string;
  hotlineSecurity?: string;
  hotlineTechnical?: string;
  hotlineFeedback?: string;
  fileName: string;
  fileSize: number;
  updatedAt: string;
  url: string;
  exists: boolean;
}

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors';

const HandbookConfigTab: React.FC = () => {
  const [handbook, setHandbook] = useState<HandbookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const toast = useToast();
  const { confirm } = useConfirm();

  // Editable Form Fields
  const [title, setTitle] = useState('Sổ Tay Cư Dân - Khu Đô Thị Thành Phố Cà Phê');
  const [subtitle, setSubtitle] = useState(
    'Cẩm nang quy chuẩn nội quy khu đô thị, hướng dẫn sử dụng tiện ích cao cấp, chính sách tài chính & danh bạ cứu hộ khẩn cấp 24/7 do Ban Quản Lý ban hành.'
  );
  const [hotlineSecurity, setHotlineSecurity] = useState('0262 3999 888');
  const [hotlineTechnical, setHotlineTechnical] = useState('0901 234 567');
  const [hotlineFeedback, setHotlineFeedback] = useState('0262 3999 999');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadHandbookInfo();
  }, []);

  const loadHandbookInfo = async () => {
    try {
      setLoading(true);
      const data = await api.get<HandbookData>('/config/handbook');
      setHandbook(data);
      if (data.title) setTitle(data.title);
      if (data.subtitle) setSubtitle(data.subtitle);
      if (data.hotlineSecurity) setHotlineSecurity(data.hotlineSecurity);
      if (data.hotlineTechnical) setHotlineTechnical(data.hotlineTechnical);
      if (data.hotlineFeedback) setHotlineFeedback(data.hotlineFeedback);

      if (data.exists) {
        setPreviewUrl(`/api/config/handbook/file?t=${Date.now()}`);
      } else {
        setPreviewUrl(null);
      }
    } catch (err: any) {
      console.error('Failed to load handbook info:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        toast.warning('Vui lòng chọn file định dạng PDF (.pdf)');
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        toast.warning('Dung lượng file tối đa là 100MB');
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSaveInfo = async () => {
    try {
      setIsSavingInfo(true);
      setMessage(null);

      await api.put('/config/handbook', {
        title,
        subtitle,
        hotlineSecurity,
        hotlineTechnical,
        hotlineFeedback,
      });

      setMessage({ type: 'success', text: 'Cập nhật thông tin Hotline & Tiêu đề thành công!' });
      await loadHandbookInfo();
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Lưu thông tin thất bại: ' + (error.message || 'Lỗi hệ thống') });
    } finally {
      setIsSavingInfo(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setMessage(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('fileName', selectedFile.name);
      formData.append('title', title);
      formData.append('subtitle', subtitle);
      formData.append('hotlineSecurity', hotlineSecurity);
      formData.append('hotlineTechnical', hotlineTechnical);
      formData.append('hotlineFeedback', hotlineFeedback);

      await api.post<any>('/config/handbook', formData);

      setMessage({ type: 'success', text: 'Tải lên Sổ Tay Cư Dân PDF thành công!' });
      setSelectedFile(null);
      await loadHandbookInfo();
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Tải lên thất bại: ' + (error.message || 'Lỗi hệ thống') });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!(await confirm({ title: 'Xóa Sổ Tay Cư Dân', description: 'Bạn có chắc chắn muốn xóa file Sổ Tay Cư Dân này không?', variant: 'danger' }))) return;
    try {
      setLoading(true);
      await api.delete('/config/handbook');
      setMessage({ type: 'success', text: 'Đã xóa file Sổ Tay Cư Dân!' });
      setHandbook(null);
      setPreviewUrl(null);
      await loadHandbookInfo();
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Xóa thất bại: ' + (err.message || 'Lỗi server') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <DocumentTextIcon className="w-6 h-6 text-accent" />
            Cấu Hình & Quản Lý Sổ Tay Cư Dân (PDF)
          </h2>
          <p className="text-xs text-ink-soft mt-1">
            Đăng tải tài liệu Sổ Tay Cư Dân định dạng PDF và cấu hình danh bạ hotline hỗ trợ cư dân 24/7
          </p>
        </div>

        <div className="flex items-center gap-2">
          {handbook?.exists && (
            <a
              href="/api/config/handbook/file"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-surface border border-brand-border hover:border-accent/40 hover:text-accent rounded-lg text-xs font-semibold text-ink transition-colors flex items-center gap-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              <span>Tải file hiện tại</span>
            </a>
          )}
          <button
            onClick={loadHandbookInfo}
            disabled={loading}
            className="p-1.5 border border-brand-border rounded-lg text-ink-soft hover:text-accent hover:border-accent/40 transition-colors cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent/40"
            title="Làm mới"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-brand-success-soft border border-brand-success/20 text-brand-success'
              : 'bg-brand-danger-soft border border-brand-danger/20 text-brand-danger'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircleIcon className="w-4 h-4 shrink-0" />
          ) : (
            <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Grid: Upload & Current Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col: Configurations & Upload (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Card 1: Hotline & Text Info Configuration */}
          <div className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
            <h3 className="text-sm font-bold text-ink flex items-center justify-between">
              <span className="flex items-center gap-2">
                <PhoneIcon className="w-4 h-4 text-brand-teal" />
                Thông Tin Hotline & Giới Thiệu
              </span>
              <span className="text-[10px] font-bold bg-accent-soft text-accent-ink px-2 py-0.5 rounded-full">
                Hiển thị cho Cư dân
              </span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Tiêu đề tài liệu:
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputCls}
                  placeholder="VD: Sổ Tay Cư Dân - Khu Đô Thị Thành Phố Cà Phê"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Mô tả / Lời dẫn:
                </label>
                <textarea
                  rows={2}
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className={`${inputCls} leading-relaxed`}
                  placeholder="Lời giới thiệu tóm tắt..."
                />
              </div>

              {/* Hotlines — hàng ngang compact, không nhảy dòng */}
              <div className="grid grid-cols-1 gap-2 pt-1">
                <div className="flex items-center gap-2 bg-brand-danger-soft/50 pl-2.5 pr-2 py-1.5 rounded-lg border border-brand-danger/20">
                  <label className="flex items-center gap-1 text-[11px] font-bold text-brand-danger whitespace-nowrap shrink-0">
                    <ShieldCheckIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>An Ninh</span>
                  </label>
                  <input
                    type="text"
                    value={hotlineSecurity}
                    onChange={(e) => setHotlineSecurity(e.target.value)}
                    className="flex-1 min-w-0 text-right text-xs font-mono font-semibold border border-brand-danger/30 rounded-md px-2 py-1.5 bg-surface text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                    placeholder="0262 3999 888"
                  />
                </div>

                <div className="flex items-center gap-2 bg-brand-teal-soft/50 pl-2.5 pr-2 py-1.5 rounded-lg border border-brand-teal/20">
                  <label className="flex items-center gap-1 text-[11px] font-bold text-brand-teal whitespace-nowrap shrink-0">
                    <PhoneIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>Kỹ Thuật</span>
                  </label>
                  <input
                    type="text"
                    value={hotlineTechnical}
                    onChange={(e) => setHotlineTechnical(e.target.value)}
                    className="flex-1 min-w-0 text-right text-xs font-mono font-semibold border border-brand-teal/30 rounded-md px-2 py-1.5 bg-surface text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                    placeholder="0901 234 567"
                  />
                </div>

                <div className="flex items-center gap-2 bg-brand-warning-soft/50 pl-2.5 pr-2 py-1.5 rounded-lg border border-brand-warning/20">
                  <label className="flex items-center gap-1 text-[11px] font-bold text-brand-warning whitespace-nowrap shrink-0">
                    <DocumentTextIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>CSKH / Góp Ý</span>
                  </label>
                  <input
                    type="text"
                    value={hotlineFeedback}
                    onChange={(e) => setHotlineFeedback(e.target.value)}
                    className="flex-1 min-w-0 text-right text-xs font-mono font-semibold border border-brand-warning/30 rounded-md px-2 py-1.5 bg-surface text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                    placeholder="0262 3999 999"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveInfo}
                disabled={isSavingInfo}
                className="w-full py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                {isSavingInfo ? (
                  <>
                    <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang lưu thông tin...</span>
                  </>
                ) : (
                  <>
                    <DocumentTextIcon className="w-3.5 h-3.5" />
                    <span>Lưu Cấu Hình Hotline & Tiêu Đề</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card 2: PDF File Upload */}
          <div className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <span>Tải Lên &amp; Thay Thế File PDF Sổ Tay</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">
                Chọn file PDF sổ tay (Tối đa 100MB):
              </label>
              <div className="border-dashed border border-brand-border rounded-xl bg-surface-alt/50 hover:border-accent/40 transition-colors cursor-pointer p-6 text-center">
                <DocumentTextIcon className="w-8 h-8 mx-auto text-accent mb-2" />
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleFileChange}
                  id="handbook-pdf-input"
                  className="hidden"
                />
                <label
                  htmlFor="handbook-pdf-input"
                  className="inline-block px-4 py-2 bg-accent text-white text-xs font-bold rounded-lg hover:bg-accent-hover transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  Chọn File PDF Từ Máy Tính
                </label>
                {selectedFile ? (
                  <div className="mt-3 p-2 bg-surface rounded-xl border border-brand-border text-xs text-left">
                    <strong className="text-ink block truncate">{selectedFile.name}</strong>
                    <span className="text-[11px] text-ink-soft">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Sẵn sàng tải lên
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-ink-soft mt-2">
                    Kéo thả hoặc click để chọn file PDF (.pdf)
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              {uploading ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  <span>Đang tải lên hệ thống...</span>
                </>
              ) : (
                <>
                  <BoltIcon className="w-3.5 h-3.5" />
                  <span>Lưu & Phát Hành File PDF Cho Cư Dân</span>
                </>
              )}
            </button>
          </div>

          {/* Card 3: Current File Metadata Box */}
          <div className="bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-3">
            <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
              Trạng Thái Sổ Tay Hiện Tại
            </h4>

            {handbook?.exists ? (
              <div className="p-3.5 bg-brand-success-soft/60 rounded-xl border border-brand-success/20 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-brand-success font-bold">
                    <span className="w-2 h-2 rounded-full bg-brand-success inline-block" />
                    Đang phát hành
                  </span>
                  <button
                    onClick={handleDelete}
                    className="text-brand-danger hover:text-accent-hover text-[11px] font-bold flex items-center gap-1 cursor-pointer rounded focus:outline-none focus:ring-2 focus:ring-accent/40"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                    <span>Xóa</span>
                  </button>
                </div>
                <div className="text-ink font-semibold truncate">
                  {handbook.fileName}
                </div>
                <div className="text-[11px] text-ink-soft space-y-0.5">
                  <div>Dung lượng: {(Number(handbook.fileSize) / 1024).toFixed(1)} KB</div>
                  <div>Cập nhật lần cuối: {new Date(handbook.updatedAt).toLocaleString('vi-VN')}</div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-brand-warning-soft text-brand-warning rounded-lg text-xs border border-brand-warning/20 text-center">
                Chưa có Sổ Tay Cư Dân nào được tải lên.
              </div>
            )}
          </div>
        </div>

        {/* Right Col: PDF Live Viewer / Preview (8 cols) */}
        <div className="lg:col-span-8 bg-surface border border-brand-border rounded-xl shadow-sm p-4 sm:p-5 space-y-4 flex flex-col min-h-[550px]">
          <div className="flex items-center justify-between pb-3 border-b border-brand-border">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <span>Xem Trước Trực Tiếp Sổ Tay PDF</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-alt text-ink font-semibold text-xs border border-brand-border transition-colors flex items-center gap-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <MagnifyingGlassIcon className="w-3.5 h-3.5" />
              <span>Toàn Màn Hình (Zoom)</span>
            </button>
          </div>

          <div className="flex-1 w-full rounded-xl overflow-hidden border border-brand-border bg-surface-alt min-h-[580px] flex flex-col">
            {previewUrl ? (
              <PdfCanvasReader
                pdfUrl={previewUrl}
                title={title}
                fileName={handbook?.fileName}
                initialScale={1}
                showControls={true}
                onOpenFullscreen={() => setIsFullscreen(true)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-ink-soft text-xs">
                <DocumentTextIcon className="w-12 h-12 opacity-40 mb-2" />
                <span>Chưa có file PDF hoặc chọn file mới để xem trước</span>
              </div>
            )}
          </div>
        </div>

      </div>

      <FullscreenPdfViewerModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        pdfUrl={previewUrl || '/api/config/handbook/file'}
        title={title}
        fileName={handbook?.fileName}
      />
    </div>
  );
};

export default HandbookConfigTab;
