import React, { useState, useEffect, useCallback } from 'react';
import { EmptyState } from '../../components/ui';
import { MegaphoneIcon, XMarkIcon, PinIcon, ArrowLeftIcon, ArrowRightIcon } from '../../components/icons';

interface Announcement {
  id: string;
  title: string;
  content: string;
  summary?: string;
  category: string;
  cover_image?: string;
  media_urls: string[];
  is_pinned: boolean;
  published_at: string;
  users?: { username: string };
}

const CATEGORY_STYLES: Record<string, { label: string; cls: string }> = {
  general: { label: 'Thông báo', cls: 'bg-secondary-100 text-secondary-800' },
  event:   { label: 'Sự kiện',  cls: 'bg-accent-soft text-accent-ink' },
  notice:  { label: 'Lưu ý',    cls: 'bg-brand-warning-soft text-brand-warning' },
  urgent:  { label: 'Khẩn cấp', cls: 'bg-brand-danger-soft text-brand-danger' },
};

function formatRelativeTime(dt: string): string {
  const diff = Date.now() - new Date(dt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(dt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isNewPost(dt: string): boolean {
  return Date.now() - new Date(dt).getTime() < 7 * 24 * 60 * 60 * 1000;
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

function getYouTubeEmbedUrl(url: string): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

function getYouTubeThumbnail(url: string): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

function getPostMedia(post: Announcement): { thumbSrc: string | null; isVideo: boolean } {
  const youtubeMedia = (post.media_urls || []).find((u) => !!extractYouTubeId(u));
  const youtubeInContent = (post.content || '').match(/(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  const isVideo = !!(youtubeMedia || youtubeInContent);
  const thumbSrc = post.cover_image || (youtubeMedia ? getYouTubeThumbnail(youtubeMedia) : youtubeInContent ? getYouTubeThumbnail(youtubeInContent[0]) : null);
  return { thumbSrc, isVideo };
}

interface Props {
  onMarkRead?: () => void;
}

function PortalNewsSection({ onMarkRead }: Props) {
  const [posts, setPosts] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<Announcement | null>(null);
  const [mediaIdx, setMediaIdx] = useState(0);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/announcements', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch announcements:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    localStorage.setItem('news_last_read', new Date().toISOString());
    onMarkRead?.();
  }, [fetchPosts, onMarkRead]);

  const openPost = (post: Announcement) => {
    setViewing(post);
    setMediaIdx(0);
  };

  const catStyle = (cat: string) => CATEGORY_STYLES[cat] || CATEGORY_STYLES['general'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-ink-soft">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm">Đang tải tin tức...</p>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={MegaphoneIcon}
        tone="neutral"
        title="Chưa có tin tức nào"
        description="Ban Quản Lý chưa đăng bài viết nào"
        size="md"
      />
    );
  }

  const pinned = posts.filter((p) => p.is_pinned);
  const normal = posts.filter((p) => !p.is_pinned);

  // Featured post: first pinned/newest post that has a thumbnail
  const featured = [...pinned, ...normal].find((p) => getPostMedia(p).thumbSrc) || posts[0];
  const restPosts = posts.filter((p) => p.id !== featured.id);
  const restPinned = restPosts.filter((p) => p.is_pinned);
  const restNormal = restPosts.filter((p) => !p.is_pinned);

  // Extract video url from viewing post (either media_urls or content)
  const viewingYoutubeUrls = viewing ? [
    ...(viewing.media_urls || []).filter((u) => !!extractYouTubeId(u)),
    ...(((viewing.content || '').match(/(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})(?:\S+)?/g) || []))
  ].filter((v, i, a) => a.indexOf(v) === i) : [];

  const viewingImageUrls = viewing ? (viewing.media_urls || []).filter((u) => !extractYouTubeId(u)) : [];

  return (
    <div className="space-y-4">
      {/* Featured post */}
      <FeaturedCard post={featured} onClick={() => openPost(featured)} catStyle={catStyle} />

      {/* Remaining pinned posts */}
      {restPinned.length > 0 && (
        <div>
          <p className="text-xs font-bold text-brand-warning uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <PinIcon className="w-3.5 h-3.5" /> Bài Ghim
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {restPinned.map((post) => (
              <PostCard key={post.id} post={post} onClick={() => openPost(post)} catStyle={catStyle} />
            ))}
          </div>
        </div>
      )}

      {/* Regular posts */}
      {restNormal.length > 0 && (
        <div>
          {(restPinned.length > 0 || pinned.length > 0) && <p className="text-xs font-bold text-ink-soft uppercase tracking-wide mb-2 mt-5">Tất cả bài viết</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {restNormal.map((post) => (
              <PostCard key={post.id} post={post} onClick={() => openPost(post)} catStyle={catStyle} />
            ))}
          </div>
        </div>
      )}

      {/* Post Detail Modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface w-full sm:max-w-2xl max-h-[92vh] rounded-t-2xl sm:rounded-2xl shadow-elevation-overlay flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${catStyle(viewing.category).cls}`}>
                    {catStyle(viewing.category).label}
                  </span>
                  {viewing.is_pinned && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-brand-warning font-bold">
                      <PinIcon className="w-3 h-3" /> Ghim
                    </span>
                  )}
                  {isNewPost(viewing.published_at) && (
                    <span className="text-[11px] bg-accent text-white px-2 py-0.5 rounded-full font-semibold">MỚI</span>
                  )}
                </div>
                <h2 className="font-serif text-xl sm:text-2xl font-semibold text-ink leading-snug">{viewing.title}</h2>
                <p className="text-xs text-ink-soft mt-1">{formatRelativeTime(viewing.published_at)}</p>
              </div>
              <button
                onClick={() => setViewing(null)}
                className="p-1.5 hover:bg-surface-alt rounded-xl flex-shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <XMarkIcon className="w-5 h-5 text-ink-soft" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-5 space-y-4">
              {/* Embedded YouTube Videos */}
              {viewingYoutubeUrls.map((ytUrl, idx) => {
                const embedUrl = getYouTubeEmbedUrl(ytUrl);
                if (!embedUrl) return null;
                return (
                  <div key={idx} className="relative w-full aspect-video rounded-xl overflow-hidden shadow-md bg-black">
                    <iframe
                      src={embedUrl}
                      title={`Video ${idx + 1}`}
                      className="absolute inset-0 w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                );
              })}

              {/* Cover image if not a duplicate of video */}
              {viewing.cover_image && viewingYoutubeUrls.length === 0 && (
                <img
                  src={viewing.cover_image}
                  alt={viewing.title}
                  loading="lazy"
                  className="w-full rounded-xl object-cover max-h-64 shadow-xs"
                />
              )}

              {/* Rich Content (HTML or Plain Text) */}
              {viewing.content.includes('<') && viewing.content.includes('>') ? (
                <div
                  className="text-sm sm:text-base text-ink leading-relaxed space-y-3 prose max-w-none [&_img]:rounded-xl [&_img]:my-4 [&_img]:shadow-xs [&_figure]:my-4 [&_iframe]:rounded-xl [&_iframe]:shadow-md [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-bold [&_blockquote]:bg-accent-soft/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                  dangerouslySetInnerHTML={{ __html: viewing.content }}
                />
              ) : (
                <p className="text-sm text-ink-soft whitespace-pre-wrap leading-relaxed">
                  {viewing.content}
                </p>
              )}

              {/* Image gallery */}
              {viewingImageUrls.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-ink-soft mb-2">Hình ảnh đính kèm ({viewingImageUrls.length})</p>
                  <div className="relative">
                    <img
                      src={viewingImageUrls[mediaIdx]}
                      alt={viewing.title}
                      loading="lazy"
                      className="w-full rounded-xl object-cover max-h-60 bg-surface-alt"
                    />
                    {viewingImageUrls.length > 1 && (
                      <div className="flex items-center justify-between mt-2">
                        <button
                          onClick={() => setMediaIdx((i) => (i - 1 + viewingImageUrls.length) % viewingImageUrls.length)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-surface-alt hover:bg-accent-soft hover:text-accent-ink rounded-lg text-xs font-medium text-ink-soft transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                        ><ArrowLeftIcon className="w-3.5 h-3.5" /> Trước</button>
                        <span className="text-xs text-ink-soft tabular-nums">{mediaIdx + 1}/{viewingImageUrls.length}</span>
                        <button
                          onClick={() => setMediaIdx((i) => (i + 1) % viewingImageUrls.length)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-surface-alt hover:bg-accent-soft hover:text-accent-ink rounded-lg text-xs font-medium text-ink-soft transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                        >Sau <ArrowRightIcon className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeaturedCard({
  post,
  onClick,
  catStyle,
}: {
  post: Announcement;
  onClick: () => void;
  catStyle: (cat: string) => { label: string; cls: string };
}) {
  const cs = catStyle(post.category);
  const { thumbSrc, isVideo } = getPostMedia(post);

  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-surface border border-brand-border rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      {thumbSrc ? (
        <div className="relative overflow-hidden rounded-t-2xl">
          <img
            src={thumbSrc}
            alt={post.title}
            className="aspect-video w-full object-cover group-hover:scale-[1.03] transition-transform duration-[400ms] ease-out"
          />
          {isVideo && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
              <div className="w-9 h-9 rounded-full bg-accent/90 text-white flex items-center justify-center text-xs pl-0.5 shadow-sm">
                ▶
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-video w-full bg-surface-alt flex items-center justify-center">
          <MegaphoneIcon className="w-10 h-10 text-primary-400" />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${cs.cls}`}>{cs.label}</span>
          {post.is_pinned && (
            <span className="inline-flex items-center gap-1 text-[11px] text-brand-warning font-bold">
              <PinIcon className="w-3 h-3" /> Ghim
            </span>
          )}
          {isNewPost(post.published_at) && (
            <span className="text-[11px] bg-accent text-white px-2 py-0.5 rounded-full font-semibold">MỚI</span>
          )}
        </div>
        <h3 className="font-serif text-xl font-semibold text-ink leading-snug line-clamp-2 group-hover:text-accent transition-colors">{post.title}</h3>
        {post.summary && (
          <p className="text-sm text-ink-soft mt-1.5 line-clamp-2">{post.summary}</p>
        )}
        <p className="text-xs text-ink-soft mt-2">{formatRelativeTime(post.published_at)}</p>
      </div>
    </button>
  );
}

function PostCard({
  post,
  onClick,
  catStyle,
}: {
  post: Announcement;
  onClick: () => void;
  catStyle: (cat: string) => { label: string; cls: string };
}) {
  const cs = catStyle(post.category);
  const { thumbSrc, isVideo } = getPostMedia(post);

  return (
    <button
      onClick={onClick}
      className={`group w-full text-left bg-surface border rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-shadow duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${post.is_pinned ? 'border-brand-warning' : 'border-brand-border'}`}
    >
      {thumbSrc ? (
        <div className="relative overflow-hidden">
          <img
            src={thumbSrc}
            alt={post.title}
            loading="lazy"
            className="aspect-[4/3] w-full object-cover group-hover:scale-[1.03] transition-transform duration-[400ms] ease-out"
          />
          {isVideo && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
              <div className="w-8 h-8 rounded-full bg-accent/90 text-white flex items-center justify-center text-xs pl-0.5 shadow-sm">
                ▶
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-[4/3] w-full bg-surface-alt flex items-center justify-center">
          <MegaphoneIcon className="w-10 h-10 text-primary-400" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${cs.cls}`}>{cs.label}</span>
          {isVideo && (
            <span className="text-[11px] bg-brand-danger-soft text-brand-danger px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5">
              <span>▶ Video</span>
            </span>
          )}
          {isNewPost(post.published_at) && (
            <span className="text-[11px] bg-accent text-white px-2 py-0.5 rounded-full font-semibold">MỚI</span>
          )}
        </div>
        <h3 className="font-semibold text-sm text-ink leading-snug line-clamp-2 group-hover:text-accent transition-colors">{post.title}</h3>
        {post.summary && (
          <p className="text-xs text-ink-soft mt-1 line-clamp-2">{post.summary}</p>
        )}
        <p className="text-xs text-ink-soft mt-1.5">{formatRelativeTime(post.published_at)}</p>
      </div>
    </button>
  );
}

export default PortalNewsSection;
