import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import {
  MegaphoneIcon, PinIcon, XMarkIcon, PhotoIcon, PencilIcon, EyeIcon, PlusIcon, TrashIcon,
  ArrowLeftIcon, Cog6ToothIcon, UserIcon, ClockIcon, TvIcon, PhoneIcon, Squares2x2Icon, DocumentArrowDownIcon,
} from '../components/icons';
import { RichTextEditor } from '../components/RichTextEditor';
import { useConfirm } from '../components/ui';

interface Announcement {
  id: string;
  title: string;
  content: string;
  summary?: string;
  category: string;
  cover_image?: string;
  media_urls: string[];
  is_pinned: boolean;
  is_published: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
  users?: { username: string };
}

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'Thông báo chung', color: 'bg-accent-soft text-accent-ink' },
  { value: 'event', label: 'Sự kiện', color: 'bg-brand-success-soft text-brand-success' },
  { value: 'notice', label: 'Lưu ý', color: 'bg-brand-warning-soft text-brand-warning' },
  { value: 'urgent', label: 'Khẩn cấp', color: 'bg-brand-danger-soft text-brand-danger' },
];

const categoryBadge = (cat: string) => {
  const opt = CATEGORY_OPTIONS.find((o) => o.value === cat);
  return opt ? (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${opt.color}`}>
      {opt.label}
    </span>
  ) : null;
};

function formatDate(dt?: string) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function NewsManagementPage() {
  const [posts, setPosts] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPost, setEditingPost] = useState<Announcement | null>(null);
  const [previewModalPost, setPreviewModalPost] = useState<Partial<Announcement> | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile' | 'card'>('desktop');
  const [submitting, setSubmitting] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const { confirm } = useConfirm();
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Form State (WordPress Style)
  const [fTitle, setFTitle] = useState('');
  const [fContent, setFContent] = useState('');
  const [fSummary, setFSummary] = useState('');
  const [fCategory, setFCategory] = useState('general');
  const [fPinned, setFPinned] = useState(false);
  const [fCoverBase64, setFCoverBase64] = useState<string | null>(null);
  const [fCoverPreview, setFCoverPreview] = useState<string | null>(null);

  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleOpenPreview = () => {
    setPreviewModalPost({
      title: fTitle.trim() || 'Tiêu đề bài viết (Chưa nhập)',
      content: fContent || '<p>Chưa có nội dung bài viết...</p>',
      summary: fSummary.trim() || undefined,
      category: fCategory,
      cover_image: fCoverPreview || undefined,
      is_pinned: fPinned,
      published_at: new Date().toISOString(),
    });
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ data: Announcement[] }>('/announcements/admin/all');
      setPosts(res.data || []);
    } catch {
      showToast('Không tải được danh sách bài viết', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

  const openCreate = () => {
    setEditingPost(null);
    setFTitle('');
    setFContent('<p>Nhập nội dung bài viết tại đây...</p>');
    setFSummary('');
    setFCategory('general');
    setFPinned(false);
    setFCoverBase64(null);
    setFCoverPreview(null);
    setIsEditing(true);
  };

  const openEdit = (p: Announcement) => {
    setEditingPost(p);
    setFTitle(p.title);
    setFContent(p.content || '');
    setFSummary(p.summary || '');
    setFCategory(p.category || 'general');
    setFPinned(p.is_pinned);
    setFCoverBase64(null);
    setFCoverPreview(p.cover_image || null);
    setIsEditing(true);
  };

  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    setFCoverBase64(b64);
    setFCoverPreview(b64);
  };

  const handleSavePost = async (publishImmediately: boolean = false) => {
    if (!fTitle.trim()) {
      showToast('Vui lòng nhập tiêu đề bài viết!', 'error');
      return;
    }
    if (!fContent.trim() || fContent === '<p><br></p>') {
      showToast('Vui lòng nhập nội dung bài viết!', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title: fTitle.trim(),
        content: fContent.trim(),
        summary: fSummary.trim() || undefined,
        category: fCategory,
        is_pinned: fPinned,
      };
      if (fCoverBase64) body.cover_image_base64 = fCoverBase64;

      let savedPostId = editingPost?.id;

      if (editingPost) {
        await fetch(`/api/announcements/${editingPost.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        });
      } else {
        const createRes = await fetch('/api/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        });
        const created = await createRes.json();
        savedPostId = created.id;
      }

      if (publishImmediately && savedPostId) {
        await fetch(`/api/announcements/${savedPostId}/publish`, {
          method: 'POST',
          credentials: 'include',
        });
        showToast('Đã xuất bản bài viết và gửi thông báo đẩy đến cư dân!');
      } else {
        showToast(editingPost ? 'Đã lưu cập nhật bài viết' : 'Đã lưu bài viết ở dạng bản nháp');
      }

      setIsEditing(false);
      await fetchPosts();
    } catch {
      showToast('Lỗi khi lưu bài viết', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (post: Announcement) => {
    if (post.is_published) {
      if (
        !(await confirm({
          title: 'Thu hồi bài viết?',
          description: `"${post.title}" sẽ chuyển về bản nháp và ẩn khỏi cư dân.`,
          variant: 'primary',
          confirmLabel: 'Thu hồi',
        }))
      )
        return;
      setPublishingId(post.id);
      try {
        await fetch(`/api/announcements/${post.id}/unpublish`, { method: 'POST', credentials: 'include' });
        showToast('Đã chuyển bài viết về bản nháp');
        await fetchPosts();
      } catch { showToast('Lỗi thu hồi', 'error'); }
      finally { setPublishingId(null); }
      return;
    }

    if (
        !(await confirm({
          title: 'Công khai bài viết?',
          description: `"${post.title}" sẽ được đăng và gửi thông báo đẩy tới TẤT CẢ cư dân.`,
          variant: 'primary',
          confirmLabel: 'Công khai',
        }))
      )
        return;
    setPublishingId(post.id);
    try {
      await fetch(`/api/announcements/${post.id}/publish`, { method: 'POST', credentials: 'include' });
      showToast('Đã công khai và gửi thông báo đẩy đến tất cả cư dân!');
      await fetchPosts();
    } catch { showToast('Lỗi xuất bản', 'error'); }
    finally { setPublishingId(null); }
  };

  const handleDelete = async (post: Announcement) => {
    if (
        !(await confirm({
          title: 'Xóa bài viết?',
          description: `"${post.title}" sẽ bị xóa vĩnh viễn và không thể hoàn tác.`,
          variant: 'danger',
          confirmLabel: 'Xóa',
        }))
      )
        return;
    try {
      await fetch(`/api/announcements/${post.id}`, { method: 'DELETE', credentials: 'include' });
      showToast('Đã xóa bài viết thành công');
      await fetchPosts();
    } catch { showToast('Lỗi khi xóa bài viết', 'error'); }
  };

  const handleTogglePin = async (post: Announcement) => {
    try {
      await fetch(`/api/announcements/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_pinned: !post.is_pinned }),
      });
      await fetchPosts();
    } catch { showToast('Lỗi ghim bài', 'error'); }
  };

  // Filter posts
  const filteredPosts = posts.filter((p) => {
    const matchesSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = filterCategory === 'all' || p.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-semibold transition-all animate-bounce ${toast.type === 'error' ? 'bg-brand-danger' : 'bg-brand-success'}`}>
          {toast.msg}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* VIEW 1: WORDPRESS-STYLE FULL RICH EDITOR                      */}
      {/* ────────────────────────────────────────────────────────────── */}
      {isEditing ? (
        <div className="space-y-4 animate-fade-in">
          {/* Top Bar */}
          <div className="flex items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-brand-border shadow-sm flex-wrap">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3.5 py-2 bg-surface border border-brand-border hover:bg-surface-alt hover:border-accent/40 text-ink rounded-lg text-xs font-semibold transition-colors duration-200 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeftIcon className="w-3.5 h-3.5" />
                <span>Quay lại danh sách</span>
              </button>
              <h1 className="text-lg font-bold text-ink ">
                {editingPost ? 'Chỉnh sửa bài viết' : 'Viết bài mới'}
              </h1>
            </div>
          </div>

          {/* 2-Column WordPress Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Title + Rich Text Editor + Excerpt (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              {/* Title input */}
              <div className="bg-surface p-4 rounded-xl border border-brand-border shadow-sm">
                <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1.5">
                  Tiêu đề bài viết *
                </label>
                <input
                  type="text"
                  value={fTitle}
                  onChange={(e) => setFTitle(e.target.value)}
                  placeholder="Nhập tiêu đề tại đây..."
                  className="w-full px-4 py-3 text-lg sm:text-xl font-bold rounded-lg border border-brand-border bg-surface-alt text-ink placeholder:text-ink-faint focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none"
                />
              </div>

              {/* Rich WYSIWYG Editor */}
              <div>
                <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1.5">
                  Nội dung bài viết (Rich Text, Hình ảnh & Video) *
                </label>
                <RichTextEditor
                  value={fContent}
                  onChange={setFContent}
                  placeholder="Viết nội dung bài viết tại đây. Sử dụng nút 'Thêm Media' để chèn ảnh hoặc video YouTube vào bất kỳ vị trí nào..."
                />
              </div>

              {/* Excerpt / Summary Box */}
              <div className="bg-surface p-4 rounded-xl border border-brand-border shadow-sm">
                <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1.5">
                  Tóm tắt ngắn (Excerpt - hiển thị ở danh sách bài viết)
                </label>
                <textarea
                  value={fSummary}
                  onChange={(e) => setFSummary(e.target.value)}
                  rows={3}
                  placeholder="Nhập 1-2 câu tóm tắt ngắn cho bài viết..."
                  maxLength={300}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-brand-border bg-surface-alt text-ink placeholder:text-ink-faint focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none resize-y"
                />
              </div>
            </div>

            {/* Right Column: Sidebar (Publish, Categories, Featured Image) (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              {/* Box 1: Đăng bài viết (Publish Box) */}
              <div className="bg-surface rounded-xl border border-brand-border shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-surface-alt border-b border-brand-border font-bold text-xs text-ink-soft uppercase tracking-wider flex items-center gap-1.5">
                  <Cog6ToothIcon className="w-3.5 h-3.5" />
                  <span>Thiết lập đăng bài</span>
                </div>
                <div className="p-4 space-y-3.5 text-xs">
                  <div className="flex items-center justify-between text-ink-soft">
                    <span>Trạng thái:</span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-semibold ${editingPost?.is_published ? 'bg-brand-success-soft text-brand-success' : 'bg-brand-warning-soft text-brand-warning'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${editingPost?.is_published ? 'bg-brand-success' : 'bg-brand-warning'}`} />
                      {editingPost?.is_published ? 'Đã xuất bản' : 'Bản nháp'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-brand-border">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={fPinned}
                        onChange={(e) => setFPinned(e.target.checked)}
                        className="w-4 h-4 accent-accent rounded"
                      />
                      <span className="font-semibold text-ink flex items-center gap-1"><PinIcon className="w-3.5 h-3.5" /> Ghim bài viết lên đầu trang</span>
                    </label>
                  </div>

                  {/* Actions: Xem trước & Lưu nháp in 1 row, Đăng ngay as main action */}
                  <div className="pt-3 border-t border-brand-border space-y-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleOpenPreview}
                        className="flex-1 py-2.5 bg-accent-soft hover:brightness-95 text-accent-ink border border-accent/30 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <EyeIcon className="w-4 h-4" />
                        <span>Xem trước</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSavePost(false)}
                        disabled={submitting}
                        className="flex-1 py-2.5 bg-surface hover:bg-surface-alt text-ink border border-brand-border rounded-lg font-semibold transition-colors duration-200 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <DocumentArrowDownIcon className="w-4 h-4" />
                        <span>Lưu nháp</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSavePost(true)}
                      disabled={submitting}
                      className="w-full py-3 bg-accent hover:bg-accent-hover text-white rounded-lg font-bold shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 text-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none"
                    >
                      <MegaphoneIcon className="w-4 h-4" />
                      <span>{editingPost?.is_published ? 'Cập nhật & Phát hành' : 'Đăng bài viết ngay'}</span>
                    </button>
                  </div>
                </div>
              </div>


              {/* Box 2: Chuyên mục (Categories) */}
              <div className="bg-surface rounded-xl border border-brand-border shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-surface-alt border-b border-brand-border font-bold text-xs text-ink-soft uppercase tracking-wider flex items-center gap-1.5">
                  <Squares2x2Icon className="w-3.5 h-3.5" />
                  <span>Chuyên mục phân loại</span>
                </div>
                <div className="p-4 space-y-2.5">
                  {CATEGORY_OPTIONS.map((cat) => (
                    <label
                      key={cat.value}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors duration-150 ${fCategory === cat.value ? 'border-accent bg-accent-soft/40 text-accent-ink font-semibold' : 'border-brand-border text-ink hover:bg-surface-alt'}`}
                    >
                      <input
                        type="radio"
                        name="category"
                        value={cat.value}
                        checked={fCategory === cat.value}
                        onChange={(e) => setFCategory(e.target.value)}
                        className="accent-accent w-4 h-4"
                      />
                      <span className="text-xs">{cat.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Box 3: Ảnh đại diện (Featured Image) */}
              <div className="bg-surface rounded-xl border border-brand-border shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-surface-alt border-b border-brand-border font-bold text-xs text-ink-soft uppercase tracking-wider flex items-center gap-1.5">
                  <PhotoIcon className="w-3.5 h-3.5" />
                  <span>Ảnh đại diện (Featured Image)</span>
                </div>
                <div className="p-4 space-y-3">
                  {fCoverPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-brand-border shadow-xs">
                      <img src={fCoverPreview} alt="Cover" className="w-full h-40 object-cover" />
                      <button
                        type="button"
                        onClick={() => { setFCoverBase64(null); setFCoverPreview(null); }}
                        className="absolute top-2 right-2 w-7 h-7 bg-brand-danger text-white rounded-full flex items-center justify-center font-bold text-xs shadow-md hover:brightness-95 transition cursor-pointer"
                        title="Xóa ảnh"
                        aria-label="Xóa ảnh đại diện"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => coverInputRef.current?.click()}
                      className="border-2 border-dashed border-brand-border rounded-xl p-5 text-center cursor-pointer hover:border-accent/40 hover:bg-accent-soft/20 transition-colors duration-200 flex flex-col items-center focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none"
                    >
                      <PhotoIcon className="w-8 h-8 text-ink-faint mb-1" />
                      <span className="text-xs font-semibold text-accent">Đặt ảnh đại diện bài viết</span>
                    </div>
                  )}

                  <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ────────────────────────────────────────────────────────────── */
        /* VIEW 2: POSTS LIST / TABLE DASHBOARD                          */
        /* ────────────────────────────────────────────────────────────── */
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent-ink flex items-center justify-center">
                <MegaphoneIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-ink ">Tin Tức & Thông Báo</h1>
                <p className="text-xs text-ink-soft ">Soạn thảo và đăng tải bài viết, sự kiện cho cư dân</p>
              </div>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs sm:text-sm font-bold shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Viết bài mới</span>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Tổng bài viết', value: posts.length, color: 'text-ink' },
              { label: 'Đã xuất bản', value: posts.filter((p) => p.is_published).length, color: 'text-brand-success' },
              { label: 'Bản nháp', value: posts.filter((p) => !p.is_published).length, color: 'text-brand-warning' },
            ].map((s) => (
              <div key={s.label} className="bg-surface border border-brand-border rounded-xl p-4 text-center shadow-xs">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-ink-soft mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filters & Search */}
          <div className="flex items-center justify-between gap-3 flex-wrap bg-surface p-3 rounded-xl border border-brand-border shadow-xs">
            <input
              type="text"
              placeholder="🔍 Tìm kiếm bài viết theo tiêu đề..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[200px] px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-brand-border bg-surface-alt text-ink placeholder:text-ink-faint focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none"
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm rounded-lg border border-brand-border bg-surface-alt text-ink focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none"
            >
              <option value="all">Tất cả chuyên mục</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Posts List */}
          {loading ? (
            <div className="text-center py-16 text-ink-soft">Đang tải danh sách bài viết...</div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-20 bg-surface rounded-xl border border-brand-border text-ink-soft">
              <MegaphoneIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-sm">Chưa có bài viết nào</p>
              <button
                onClick={openCreate}
                className="mt-3 px-4 py-2 bg-accent-soft text-accent-ink hover:brightness-95 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                + Soạn bài viết đầu tiên
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className={`bg-surface border rounded-xl shadow-xs overflow-hidden transition-shadow duration-200 hover:shadow-md ${post.is_pinned ? 'border-brand-warning/40 bg-brand-warning-soft/20' : 'border-brand-border'}`}
                >
                  <div className="flex gap-4 p-4 items-center">
                    {/* Thumbnail */}
                    {post.cover_image ? (
                      <img src={post.cover_image} alt="" className="w-20 aspect-video object-cover rounded-md bg-surface-alt flex-shrink-0" />
                    ) : (
                      <div className="w-20 aspect-video bg-surface-alt rounded-md flex-shrink-0 flex items-center justify-center">
                        <MegaphoneIcon className="w-8 h-8 text-ink-faint" />
                      </div>
                    )}

                    {/* Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {post.is_pinned && <PinIcon className="w-4 h-4 text-brand-warning flex-shrink-0" />}
                        <h3
                          onClick={() => openEdit(post)}
                          className="font-semibold text-sm text-ink hover:text-accent cursor-pointer line-clamp-2"
                        >
                          {post.title}
                        </h3>
                        {categoryBadge(post.category)}
                      </div>

                      {post.summary && (
                        <p className="text-xs text-ink-soft  line-clamp-1 mb-1.5">{post.summary}</p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-ink-soft flex-wrap">
                        <span className="flex items-center gap-1"><UserIcon className="w-3.5 h-3.5" /> {post.users?.username || 'Admin'}</span>
                        <span className="font-mono flex items-center gap-1"><ClockIcon className="w-3.5 h-3.5" /> {formatDate(post.published_at || post.created_at)}</span>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-semibold ${post.is_published ? 'bg-brand-success-soft text-brand-success' : 'bg-surface-alt text-ink-soft'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${post.is_published ? 'bg-brand-success' : 'bg-ink-faint'}`} />
                          {post.is_published ? 'PUBLISHED' : 'DRAFT'}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handlePublish(post)}
                        disabled={publishingId === post.id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${post.is_published ? 'bg-surface border border-brand-border text-ink-soft hover:bg-surface-alt' : 'bg-brand-success text-white hover:brightness-95'}`}
                      >
                        {publishingId === post.id ? '...' : post.is_published ? 'Thu hồi' : 'Xuất bản'}
                      </button>
                      <button
                        onClick={() => openEdit(post)}
                        className="p-1.5 rounded-lg border border-transparent text-ink-soft hover:text-accent hover:bg-accent-soft transition-colors duration-200 cursor-pointer"
                        title="Sửa bài viết"
                        aria-label="Sửa bài viết"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleTogglePin(post)}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-colors duration-200 cursor-pointer ${post.is_pinned ? 'bg-accent-soft text-accent-ink' : 'border border-brand-border text-ink-soft hover:bg-surface-alt'}`}
                        title={post.is_pinned ? 'Bỏ ghim' : 'Ghim bài'}
                        aria-label={post.is_pinned ? 'Bỏ ghim bài viết' : 'Ghim bài viết'}
                      >
                        <PinIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(post)}
                        className="p-1.5 rounded-lg border border-transparent text-ink-soft hover:text-brand-danger hover:bg-brand-danger-soft transition-colors duration-200 cursor-pointer"
                        title="Xóa bài viết"
                        aria-label="Xóa bài viết"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* ADVANCED MULTI-DEVICE PREVIEW MODAL                            */}
      {/* ────────────────────────────────────────────────────────────── */}
      {previewModalPost && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-surface w-full max-w-3xl max-h-[94vh] rounded-2xl shadow-xl flex flex-col overflow-hidden border border-brand-border">
            {/* Preview Modal Header with Device Switcher */}
            <div className="px-5 py-3.5 border-b border-brand-border flex items-center justify-between gap-3 bg-surface-alt flex-shrink-0">
              <div className="flex items-center gap-2">
                <EyeIcon className="w-4 h-4 text-ink-soft" />
                <h3 className="font-bold text-sm text-ink ">Xem trước hiển thị trên Cổng Cư Dân</h3>
              </div>

              {/* Device Mode Switcher */}
              <div className="flex items-center bg-surface-alt p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`px-3 py-1 rounded-lg transition-colors duration-150 cursor-pointer flex items-center gap-1 ${previewDevice === 'desktop' ? 'bg-surface text-accent shadow-sm font-bold' : 'text-ink-soft hover:text-ink'}`}
                >
                  <TvIcon className="w-3.5 h-3.5" />
                  <span>Máy tính</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`px-3 py-1 rounded-lg transition-colors duration-150 cursor-pointer flex items-center gap-1 ${previewDevice === 'mobile' ? 'bg-surface text-accent shadow-sm font-bold' : 'text-ink-soft hover:text-ink'}`}
                >
                  <PhoneIcon className="w-3.5 h-3.5" />
                  <span>Điện thoại</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('card')}
                  className={`px-3 py-1 rounded-lg transition-colors duration-150 cursor-pointer flex items-center gap-1 ${previewDevice === 'card' ? 'bg-surface text-accent shadow-sm font-bold' : 'text-ink-soft hover:text-ink'}`}
                >
                  <Squares2x2Icon className="w-3.5 h-3.5" />
                  <span>Thẻ danh sách</span>
                </button>
              </div>

              <button
                onClick={() => setPreviewModalPost(null)}
                className="p-1.5 rounded-lg border border-transparent text-ink-soft hover:text-ink hover:bg-surface transition-colors duration-200 cursor-pointer"
                aria-label="Đóng xem trước"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Preview Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-surface-alt/60 flex justify-center items-start">
              {/* MODE 1: DESKTOP DETAIL MODAL VIEW */}
              {previewDevice === 'desktop' && (
                <div className="w-full bg-surface rounded-xl shadow-sm p-6 space-y-4 border border-brand-border">
                  <div className="flex items-center gap-2 flex-wrap">
                    {categoryBadge(previewModalPost.category || 'general')}
                    {previewModalPost.is_pinned && <span className="text-[11px] text-brand-warning font-bold inline-flex items-center gap-1"><PinIcon className="w-3.5 h-3.5" /> Ghim bài</span>}
                    <span className="text-[11px] bg-brand-danger-soft text-brand-danger px-2 py-0.5 rounded-full font-bold">MỚI</span>
                    <span className="text-xs text-ink-soft">Vừa xong</span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold text-ink  leading-snug">
                    {previewModalPost.title || 'Tiêu đề bài viết'}
                  </h2>

                  {previewModalPost.cover_image && (
                    <img src={previewModalPost.cover_image} alt="" className="w-full rounded-2xl object-cover max-h-72 shadow-xs" />
                  )}

                  <div
                    className="text-sm sm:text-base text-ink leading-relaxed space-y-3 prose  max-w-none [&_img]:rounded-xl [&_figure]:my-4 [&_iframe]:rounded-2xl [&_iframe]:shadow-md [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-bold [&_blockquote]:border-l-4 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:italic"
                    dangerouslySetInnerHTML={{ __html: previewModalPost.content || '<p>Chưa có nội dung...</p>' }}
                  />
                </div>
              )}

              {/* MODE 2: MOBILE SMARTPHONE FRAME VIEW */}
              {previewDevice === 'mobile' && (
                <div className="w-[360px] sm:w-[380px] bg-black p-3.5 rounded-[40px] shadow-2xl border-4 border-black relative">
                  {/* Phone Notch */}
                  <div className="w-28 h-4 bg-black mx-auto rounded-b-xl absolute top-3.5 left-1/2 -translate-x-1/2 z-20" />
                  {/* Phone Screen */}
                  <div className="bg-surface  rounded-[30px] overflow-hidden pt-6 pb-4 px-4 space-y-3 text-left max-h-[580px] overflow-y-auto">
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {categoryBadge(previewModalPost.category || 'general')}
                      {previewModalPost.is_pinned && <span className="text-[10px] text-brand-warning font-bold inline-flex items-center gap-1"><PinIcon className="w-3 h-3" /> Ghim</span>}
                      <span className="text-[10px] bg-brand-danger-soft text-brand-danger px-1.5 py-0.5 rounded-full font-bold">MỚI</span>
                      <span className="text-[10px] text-ink-soft">Vừa xong</span>
                    </div>

                    <h2 className="text-base font-bold text-ink  leading-snug">
                      {previewModalPost.title || 'Tiêu đề bài viết'}
                    </h2>

                    {previewModalPost.cover_image && (
                      <img src={previewModalPost.cover_image} alt="" className="w-full rounded-xl object-cover max-h-44 shadow-xs" />
                    )}

                    <div
                      className="text-xs text-ink leading-relaxed space-y-2 prose  max-w-none [&_img]:rounded-lg [&_figure]:my-2 [&_iframe]:rounded-xl"
                      dangerouslySetInnerHTML={{ __html: previewModalPost.content || '<p>Chưa có nội dung...</p>' }}
                    />
                  </div>
                </div>
              )}

              {/* MODE 3: FEED CARD PREVIEW */}
              {previewDevice === 'card' && (
                <div className="w-full max-w-xl space-y-3">
                  <p className="text-xs font-bold text-ink-soft uppercase tracking-wide text-center mb-1">
                    Giao diện thẻ bài viết hiển thị trong danh sách Tin tức Cư dân:
                  </p>
                  <div className="bg-surface border border-brand-border rounded-xl p-4 shadow-sm">
                    <div className="flex gap-3">
                      {previewModalPost.cover_image ? (
                        <div className="w-24 h-20 sm:w-28 sm:h-20 flex-shrink-0 rounded-xl overflow-hidden shadow-xs">
                          <img src={previewModalPost.cover_image} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-20 h-16 sm:w-24 sm:h-20 bg-surface-alt rounded-xl flex-shrink-0 flex items-center justify-center">
                          <MegaphoneIcon className="w-8 h-8 text-ink-faint" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          {categoryBadge(previewModalPost.category || 'general')}
                          <span className="text-[11px] bg-brand-danger-soft text-brand-danger px-2 py-0.5 rounded-full font-bold">MỚI</span>
                        </div>
                        <h3 className="font-semibold text-sm text-ink  leading-snug line-clamp-2">
                          {previewModalPost.title || 'Tiêu đề bài viết'}
                        </h3>
                        {previewModalPost.summary && (
                          <p className="text-xs text-ink-soft  mt-1 line-clamp-2">{previewModalPost.summary}</p>
                        )}
                        <p className="text-[11px] text-ink-soft mt-1.5">Vừa xong</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Preview Modal Footer Actions */}
            <div className="px-5 py-3.5 border-t border-brand-border flex items-center justify-between gap-2 bg-surface flex-shrink-0">
              <button
                type="button"
                onClick={() => setPreviewModalPost(null)}
                className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-lg text-xs font-semibold hover:bg-surface-alt hover:border-accent/40 transition-colors duration-200 cursor-pointer"
              >
                Đóng xem trước
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setPreviewModalPost(null); handleSavePost(false); }}
                  disabled={submitting}
                  className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-lg text-xs font-bold hover:bg-surface-alt hover:border-accent/40 transition-colors duration-200 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <DocumentArrowDownIcon className="w-4 h-4" />
                  <span>Lưu bản nháp</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setPreviewModalPost(null); handleSavePost(true); }}
                  disabled={submitting}
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-bold shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none"
                >
                  <MegaphoneIcon className="w-4 h-4" />
                  <span>{editingPost?.is_published ? 'Cập nhật & Phát hành' : 'Đăng bài viết ngay'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NewsManagementPage;

