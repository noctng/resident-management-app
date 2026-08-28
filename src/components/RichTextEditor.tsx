import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PhotoIcon, XMarkIcon, PlusIcon, EyeIcon } from './icons';
import { useToast } from './ui';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Nhập nội dung bài viết tại đây...',
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'html' | 'preview'>('visual');
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaTab, setMediaTab] = useState<'upload' | 'youtube' | 'url'>('upload');
  
  // Media modal inputs
  const [uploading, setUploading] = useState(false);
  const [captionInput, setCaptionInput] = useState('');
  const [alignInput, setAlignInput] = useState<'center' | 'left' | 'right'>('center');
  const [youtubeInput, setYoutubeInput] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null);
  const [selectedFileBase64, setSelectedFileBase64] = useState<string | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrlInput, setLinkUrlInput] = useState('');

  const toast = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);

  // Sync value into contentEditable when switching or mounting
  useEffect(() => {
    if (editorRef.current && activeTab === 'visual') {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value, activeTab]);

  const handleVisualInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html === '<p><br></p>' || html === '<br>' ? '' : html);
    }
  }, [onChange]);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0);
    }
  };

  const restoreSelection = () => {
    if (savedSelectionRef.current && activeTab === 'visual') {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedSelectionRef.current);
      }
    }
  };

  const execCmd = (cmd: string, val: string | undefined = undefined) => {
    restoreSelection();
    document.execCommand(cmd, false, val);
    handleVisualInput();
  };

  const openMediaModal = () => {
    saveSelection();
    setCaptionInput('');
    setYoutubeInput('');
    setImageUrlInput('');
    setSelectedFilePreview(null);
    setSelectedFileBase64(null);
    setIsMediaModalOpen(true);
  };

  const openLinkModal = () => {
    saveSelection();
    setLinkUrlInput('');
    setIsLinkModalOpen(true);
  };

  const handleInsertLink = () => {
    const url = linkUrlInput.trim();
    if (!url) return;
    setIsLinkModalOpen(false);
    execCmd('createLink', url);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    setSelectedFileBase64(b64);
    setSelectedFilePreview(b64);
  };

  const insertHtmlAtCursor = (html: string) => {
    if (activeTab === 'html') {
      onChange((value || '') + '\n' + html + '\n');
      return;
    }

    if (editorRef.current) {
      editorRef.current.focus();
      restoreSelection();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const el = document.createElement('div');
        el.innerHTML = html;
        const frag = document.createDocumentFragment();
        let node: ChildNode | null = null;
        let lastNode: ChildNode | null = null;
        while ((node = el.firstChild)) {
          lastNode = frag.appendChild(node);
        }
        range.insertNode(frag);
        if (lastNode) {
          range.setStartAfter(lastNode);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } else {
        editorRef.current.innerHTML += html;
      }
      handleVisualInput();
    }
  };

  const handleInsertMedia = async () => {
    if (mediaTab === 'upload') {
      if (!selectedFileBase64) return;
      setUploading(true);
      try {
        const res = await fetch('/api/announcements/upload-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ image_base64: selectedFileBase64 }),
        });
        const data = await res.json();
        if (data.url) {
          const alignClass = alignInput === 'center' ? 'mx-auto text-center' : alignInput === 'right' ? 'ml-auto text-right' : 'mr-auto text-left';
          const mediaHtml = `<figure class="my-4 ${alignClass}" style="max-width: 100%;"><img src="${data.url}" alt="${captionInput || 'Hình ảnh'}" class="rounded-xl shadow-sm inline-block" style="max-height: 520px; width: auto;" />${captionInput ? `<figcaption class="text-xs text-ink-soft mt-1.5 italic">${captionInput}</figcaption>` : ''}</figure><p><br></p>`;
          insertHtmlAtCursor(mediaHtml);
          setIsMediaModalOpen(false);
        }
      } catch (err) {
        console.error('Upload media error:', err);
      } finally {
        setUploading(false);
      }
    } else if (mediaTab === 'youtube') {
      const ytId = extractYouTubeId(youtubeInput);
      if (!ytId) {
        toast.warning('Vui lòng nhập đường dẫn YouTube hợp lệ!');
        return;
      }
      const videoHtml = `<div class="my-5 relative w-full aspect-video rounded-2xl overflow-hidden shadow-lg bg-black"><iframe src="https://www.youtube.com/embed/${ytId}" class="absolute inset-0 w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>${captionInput ? `<p class="text-xs text-center text-ink-soft italic mt-1">${captionInput}</p>` : ''}<p><br></p>`;
      insertHtmlAtCursor(videoHtml);
      setIsMediaModalOpen(false);
    } else if (mediaTab === 'url') {
      if (!imageUrlInput.trim()) return;
      const alignClass = alignInput === 'center' ? 'mx-auto text-center' : alignInput === 'right' ? 'ml-auto text-right' : 'mr-auto text-left';
      const mediaHtml = `<figure class="my-4 ${alignClass}" style="max-width: 100%;"><img src="${imageUrlInput.trim()}" alt="${captionInput || 'Hình ảnh'}" class="rounded-xl shadow-sm inline-block" style="max-height: 520px; width: auto;" />${captionInput ? `<figcaption class="text-xs text-ink-soft mt-1.5 italic">${captionInput}</figcaption>` : ''}</figure><p><br></p>`;
      insertHtmlAtCursor(mediaHtml);
      setIsMediaModalOpen(false);
    }
  };

  return (
    <div className="border border-brand-border rounded-xl bg-surface shadow-sm flex flex-col overflow-hidden">
      {/* Top Header Bar: Add Media Button + Mode Tabs */}
      <div className="border-b border-brand-border bg-surface-alt/50 rounded-t-xl p-1.5 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openMediaModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-brand-border hover:border-accent/40 hover:text-accent text-ink text-xs font-semibold rounded-lg transition-colors duration-200 cursor-pointer"
          >
            <PlusIcon className="w-4 h-4 text-accent" />
            <span>Thêm Media (Ảnh / Video)</span>
          </button>
        </div>

        {/* Mode Switcher: Trực quan / Văn bản / Xem trước */}
        <div className="flex items-center bg-surface-alt rounded-lg p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('visual')}
            className={`px-3 py-1 rounded-md transition-colors duration-150 cursor-pointer ${activeTab === 'visual' ? 'bg-surface text-accent shadow-xs font-bold' : 'text-ink-soft hover:text-ink'}`}
          >
            Trực quan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('html')}
            className={`px-3 py-1 rounded-md transition-colors duration-150 cursor-pointer ${activeTab === 'html' ? 'bg-surface text-accent shadow-xs font-bold' : 'text-ink-soft hover:text-ink'}`}
          >
            Văn bản (HTML)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1 rounded-md transition-colors duration-150 cursor-pointer flex items-center gap-1 ${activeTab === 'preview' ? 'bg-surface text-accent shadow-xs font-bold' : 'text-ink-soft hover:text-ink'}`}
          >
            <EyeIcon className="w-3.5 h-3.5" />
            <span>Xem trước</span>
          </button>
        </div>
      </div>


      {/* Formatting Toolbar (Only in Visual Mode) */}
      {activeTab === 'visual' && (
        <div className="border-b border-brand-border bg-surface-alt/50 rounded-b-none p-1.5 flex flex-wrap gap-0.5 items-center text-sm">
          {/* Format dropdown */}
          <select
            onChange={(e) => execCmd('formatBlock', e.target.value)}
            className="text-xs bg-surface-alt border border-brand-border rounded-md px-2 py-1 text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
            defaultValue=""
          >
            <option value="" disabled>Định dạng</option>
            <option value="p">Đoạn văn (Paragraph)</option>
            <option value="h2">Tiêu đề 2 (H2)</option>
            <option value="h3">Tiêu đề 3 (H3)</option>
            <option value="h4">Tiêu đề 4 (H4)</option>
          </select>

          <div className="w-[1px] h-4 bg-brand-border mx-1" />

          {/* Bold */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }}
            className="w-7 h-7 p-1.5 flex items-center justify-center font-bold text-ink-soft hover:bg-surface hover:text-ink rounded-md transition-colors duration-150 cursor-pointer"
            title="In đậm (Ctrl+B)"
          >
            B
          </button>

          {/* Italic */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }}
            className="w-7 h-7 p-1.5 flex items-center justify-center italic font-serif text-ink-soft hover:bg-surface hover:text-ink rounded-md transition-colors duration-150 cursor-pointer"
            title="In nghiêng (Ctrl+I)"
          >
            I
          </button>

          {/* Underline */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCmd('underline'); }}
            className="w-7 h-7 p-1.5 flex items-center justify-center underline text-ink-soft hover:bg-surface hover:text-ink rounded-md transition-colors duration-150 cursor-pointer"
            title="Gạch chân (Ctrl+U)"
          >
            U
          </button>

          <div className="w-[1px] h-4 bg-brand-border mx-1" />

          {/* Bullet list */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCmd('insertUnorderedList'); }}
            className="px-1.5 h-7 flex items-center justify-center text-xs font-semibold text-ink-soft hover:bg-surface hover:text-ink rounded-md transition-colors duration-150 cursor-pointer"
            title="Danh sách không thứ tự"
          >
            • Danh sách
          </button>

          {/* Numbered list */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCmd('insertOrderedList'); }}
            className="px-1.5 h-7 flex items-center justify-center text-xs font-semibold text-ink-soft hover:bg-surface hover:text-ink rounded-md transition-colors duration-150 cursor-pointer"
            title="Danh sách số"
          >
            1. Số thứ tự
          </button>

          {/* Blockquote */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCmd('formatBlock', 'blockquote'); }}
            className="w-7 h-7 p-1.5 flex items-center justify-center text-base font-serif text-ink-soft hover:bg-surface hover:text-ink rounded-md transition-colors duration-150 cursor-pointer"
            title="Trích dẫn"
          >
            ❝
          </button>

          <div className="w-[1px] h-4 bg-brand-border mx-1" />

          {/* Align Left */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCmd('justifyLeft'); }}
            className="w-7 h-7 p-1.5 flex items-center justify-center text-ink-soft hover:bg-surface hover:text-ink rounded-md transition-colors duration-150 cursor-pointer text-xs"
            title="Căn trái"
          >
            ≡
          </button>

          {/* Align Center */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCmd('justifyCenter'); }}
            className="w-7 h-7 p-1.5 flex items-center justify-center text-ink-soft hover:bg-surface hover:text-ink rounded-md transition-colors duration-150 cursor-pointer text-xs"
            title="Căn giữa"
          >
            ⩸
          </button>

          {/* Align Right */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCmd('justifyRight'); }}
            className="w-7 h-7 p-1.5 flex items-center justify-center text-ink-soft hover:bg-surface hover:text-ink rounded-md transition-colors duration-150 cursor-pointer text-xs"
            title="Căn phải"
          >
            ≣
          </button>

          <div className="w-[1px] h-4 bg-brand-border mx-1" />

          {/* Link */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              openLinkModal();
            }}
            className="px-1.5 h-7 flex items-center justify-center text-xs font-semibold text-accent hover:bg-accent-soft rounded-md transition-colors duration-150 cursor-pointer"
            title="Chèn liên kết"
          >
            Link
          </button>

          {/* Horizontal Rule */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCmd('insertHorizontalRule'); }}
            className="w-7 h-7 p-1.5 flex items-center justify-center text-ink-soft hover:bg-surface hover:text-ink rounded-md transition-colors duration-150 cursor-pointer text-xs font-bold"
            title="Đường kẻ ngang"
          >
            ―
          </button>

          {/* Clear formatting */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); execCmd('removeFormat'); }}
            className="w-7 h-7 p-1.5 flex items-center justify-center text-brand-danger hover:bg-brand-danger-soft rounded-md transition-colors duration-150 cursor-pointer text-xs font-bold"
            title="Xóa định dạng"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editor Body */}
      <div className="relative min-h-[360px] max-h-[600px] overflow-y-auto bg-surface p-4">
        {activeTab === 'visual' ? (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleVisualInput}
            onBlur={saveSelection}
            onKeyUp={saveSelection}
            onMouseUp={saveSelection}
            className="outline-none min-h-[340px] text-ink placeholder:text-ink-faint text-sm sm:text-base leading-relaxed prose max-w-none focus:outline-none"
            data-placeholder={placeholder}
          />
        ) : activeTab === 'html' ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-full min-h-[340px] font-mono text-xs sm:text-sm bg-sidebar-bg text-sidebar-text p-3 rounded-lg border border-sidebar-line placeholder:text-sidebar-dim focus:outline-none resize-y"
            placeholder="<!-- Nhập mã HTML tại đây -->"
          />
        ) : (
          /* Live Preview Mode inside editor */
          <div className="min-h-[340px] p-2">
            <div className="mb-3 px-3 py-1.5 bg-accent-soft border border-accent/30 text-accent-ink rounded-xl text-xs font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1"><EyeIcon className="w-3.5 h-3.5" /> Chế độ xem trước trực tiếp (Live Preview)</span>
              <span className="text-[10px] text-accent-ink/80 font-normal">Hiển thị như trên Cổng Cư Dân</span>
            </div>
            {value ? (
              <div
                className="text-sm sm:text-base text-ink leading-relaxed space-y-3 prose max-w-none [&_img]:rounded-xl [&_img]:shadow-xs [&_figure]:my-4 [&_iframe]:rounded-2xl [&_iframe]:shadow-md [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-bold [&_blockquote]:border-l-4 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:italic"
                dangerouslySetInnerHTML={{ __html: value }}
              />
            ) : (
              <p className="text-ink-soft italic text-sm">Chưa có nội dung để xem trước...</p>
            )}
          </div>
        )}
      </div>


      {/* Link Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-surface border border-brand-border w-full max-w-md rounded-2xl shadow-xl p-5 space-y-4">
            <h3 className="font-bold text-base text-ink ">Nhập đường dẫn liên kết (URL)</h3>
            <input
              autoFocus
              type="text"
              value={linkUrlInput}
              onChange={(e) => setLinkUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleInsertLink();
                }
              }}
              placeholder="https://example.com"
              className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold border border-brand-border bg-surface text-ink-soft hover:text-ink hover:border-accent/40 hover:bg-surface-alt transition-colors duration-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleInsertLink}
                disabled={!linkUrlInput.trim()}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-accent hover:bg-accent-hover text-white disabled:opacity-50 transition-colors duration-200 shadow-sm cursor-pointer"
              >
                Chèn liên kết
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Modal */}
      {isMediaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-surface border border-brand-border w-full max-w-xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between flex-shrink-0">
              <h3 className="font-bold text-base text-ink flex items-center gap-2">
                <PhotoIcon className="w-5 h-5 text-accent" />
                <span>Thêm Media vào bài viết</span>
              </h3>
              <button onClick={() => setIsMediaModalOpen(false)} className="p-1.5 rounded-lg border border-transparent text-ink-soft hover:text-ink hover:bg-surface-alt transition-colors duration-200 cursor-pointer" aria-label="Đóng">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Media Tabs */}
            <div className="flex border-b border-brand-border px-5 pt-2 gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMediaTab('upload')}
                className={`pb-2 px-3 border-b-2 transition-colors duration-150 cursor-pointer ${mediaTab === 'upload' ? 'border-accent text-accent' : 'border-transparent text-ink-soft hover:text-ink'}`}
              >
                Tải ảnh từ máy tính
              </button>
              <button
                type="button"
                onClick={() => setMediaTab('youtube')}
                className={`pb-2 px-3 border-b-2 transition-colors duration-150 cursor-pointer ${mediaTab === 'youtube' ? 'border-accent text-accent' : 'border-transparent text-ink-soft hover:text-ink'}`}
              >
                Nhúng Video YouTube
              </button>
              <button
                type="button"
                onClick={() => setMediaTab('url')}
                className={`pb-2 px-3 border-b-2 transition-colors duration-150 cursor-pointer ${mediaTab === 'url' ? 'border-accent text-accent' : 'border-transparent text-ink-soft hover:text-ink'}`}
              >
                Chèn từ link URL
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Tab 1: Upload File */}
              {mediaTab === 'upload' && (
                <div className="space-y-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-brand-border rounded-2xl p-6 text-center cursor-pointer hover:border-accent/40 hover:bg-accent-soft/20 transition-colors duration-200 flex flex-col items-center justify-center"
                  >
                    {selectedFilePreview ? (
                      <img src={selectedFilePreview} alt="" className="max-h-48 rounded-xl object-contain shadow-xs" />
                    ) : (
                      <>
                        <PhotoIcon className="w-12 h-12 text-ink-faint mb-2" />
                        <p className="text-sm font-semibold text-ink ">Nhấn để chọn ảnh từ máy tính</p>
                        <p className="text-xs text-ink-soft mt-1">Hỗ trợ PNG, JPG, GIF, WebP (Tối đa 15MB)</p>
                      </>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                </div>
              )}

              {/* Tab 2: YouTube Video */}
              {mediaTab === 'youtube' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-ink-soft block mb-1">
                      Đường dẫn Video YouTube (URL) *
                    </label>
                    <input
                      type="text"
                      value={youtubeInput}
                      onChange={(e) => setYoutubeInput(e.target.value)}
                      placeholder="https://youtu.be/... hoặc https://www.youtube.com/watch?v=..."
                      className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none"
                    />
                  </div>
                  {extractYouTubeId(youtubeInput) && (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-sm bg-black">
                      <iframe
                        src={`https://www.youtube.com/embed/${extractYouTubeId(youtubeInput)}`}
                        title="Preview"
                        className="absolute inset-0 w-full h-full border-0"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: URL */}
              {mediaTab === 'url' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-ink-soft block mb-1">
                      Đường dẫn hình ảnh trực tiếp (URL) *
                    </label>
                    <input
                      type="text"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none"
                    />
                  </div>
                  {imageUrlInput.trim() && (
                    <img src={imageUrlInput.trim()} alt="" className="max-h-40 rounded-xl object-contain mx-auto border" />
                  )}
                </div>
              )}

              {/* Shared: Caption & Alignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-brand-border">
                <div>
                  <label className="text-xs font-semibold text-ink-soft block mb-1">
                    Chú thích ảnh/video (Caption)
                  </label>
                  <input
                    type="text"
                    value={captionInput}
                    onChange={(e) => setCaptionInput(e.target.value)}
                    placeholder="VD: Lễ ký kết dự án..."
                    className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-xs text-ink placeholder:text-ink-faint focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none"
                  />
                </div>
                {mediaTab !== 'youtube' && (
                  <div>
                    <label className="text-xs font-semibold text-ink-soft block mb-1">
                      Căn lề hình ảnh
                    </label>
                    <select
                      value={alignInput}
                      onChange={(e) => setAlignInput(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-xs text-ink focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none cursor-pointer"
                    >
                      <option value="center">⩸ Căn giữa (Mặc định)</option>
                      <option value="left">≡ Căn trái</option>
                      <option value="right">≣ Căn phải</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-3 border-t border-brand-border flex justify-end gap-2 bg-surface-alt flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsMediaModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold border border-brand-border bg-surface text-ink-soft hover:text-ink hover:border-accent/40 hover:bg-surface transition-colors duration-200 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleInsertMedia}
                disabled={uploading || (mediaTab === 'upload' && !selectedFileBase64) || (mediaTab === 'youtube' && !youtubeInput) || (mediaTab === 'url' && !imageUrlInput)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-accent hover:bg-accent-hover text-white disabled:opacity-50 transition-colors duration-200 shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>{uploading ? 'Đang tải lên...' : 'Chèn vào bài viết'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
