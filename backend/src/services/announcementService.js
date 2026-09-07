const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const repo = require('../repositories/announcementRepository');
const { enqueue } = require('../queues/notificationQueue');

const NEWS_IMAGE_DIR = path.join(__dirname, '../../uploads/news/images');
const NGINX_NEWS_IMAGE_DIR = '/home/dell/workspace/resident-management-app/backend/nginx-1.28.0/html/dist/news/images';

if (!fs.existsSync(NEWS_IMAGE_DIR)) fs.mkdirSync(NEWS_IMAGE_DIR, { recursive: true });
try { if (!fs.existsSync(NGINX_NEWS_IMAGE_DIR)) fs.mkdirSync(NGINX_NEWS_IMAGE_DIR, { recursive: true }); } catch (e) {}

function saveImage(base64String, fileId) {
  if (!base64String || !base64String.startsWith('data:')) return null;
  const matches = base64String.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  if (!matches) return null;
  const ext = matches[1].includes('png') ? 'png' : matches[1].includes('gif') ? 'gif' : 'jpg';
  const filename = `${fileId}.${ext}`;
  const buf = Buffer.from(matches[2], 'base64');
  fs.writeFileSync(path.join(NEWS_IMAGE_DIR, filename), buf);
  try { fs.writeFileSync(path.join(NGINX_NEWS_IMAGE_DIR, filename), buf); } catch (e) {}
  return `/news/images/${filename}`;
}

async function listPublished({ limit, offset }) {
  const posts = await repo.getPublished({ limit, offset });
  return { data: posts, total: posts.length };
}

async function getById(id, isAdmin = false) {
  const post = await repo.getById(id);
  if (!post || (!post.is_published && !isAdmin)) {
    const err = new Error('Không tìm thấy bài viết');
    err.status = 404;
    throw err;
  }
  return post;
}

async function listAll() {
  const posts = await repo.getAll();
  return { data: posts, total: posts.length };
}

async function create(dto, userId) {
  const postId = crypto.randomUUID();
  const coverUrl = dto.cover_image_base64 ? saveImage(dto.cover_image_base64, `cover-${postId}`) : null;
  const mediaUrls = [];
  (dto.media_base64_list || []).forEach((b64, idx) => {
    const url = saveImage(b64, `media-${postId}-${idx}`);
    if (url) mediaUrls.push(url);
  });
  const post = await repo.create({
    id: postId,
    title: dto.title,
    content: dto.content,
    summary: dto.summary ?? null,
    category: dto.category || 'general',
    cover_image: coverUrl,
    media_urls: mediaUrls,
    is_pinned: Boolean(dto.is_pinned),
    is_published: false,
    created_by: userId,
  });
  return post;
}

async function update(id, dto, existing) {
  let coverUrl = existing.cover_image;
  if (dto.cover_image_base64 && dto.cover_image_base64.startsWith('data:')) {
    coverUrl = saveImage(dto.cover_image_base64, `cover-${id}-${Date.now()}`);
  }
  let mediaUrls = Array.isArray(dto.keep_media_urls) ? dto.keep_media_urls : existing.media_urls;
  (dto.media_base64_list || []).forEach((b64, idx) => {
    const url = saveImage(b64, `media-${id}-${Date.now()}-${idx}`);
    if (url) mediaUrls.push(url);
  });
  return repo.update(id, {
    title: dto.title ?? existing.title,
    content: dto.content ?? existing.content,
    summary: dto.summary !== undefined ? dto.summary : existing.summary,
    category: dto.category || existing.category,
    is_pinned: dto.is_pinned !== undefined ? Boolean(dto.is_pinned) : existing.is_pinned,
    cover_image: coverUrl,
    media_urls: mediaUrls,
    updated_at: new Date(),
  });
}

async function publish(id) {
  const existing = await repo.getById(id);
  if (!existing) { const e = new Error('Không tìm thấy bài viết'); e.status = 404; throw e; }
  const updated = await repo.setPublishState(id, true);
  const categoryLabel = { general: 'Thông báo', event: 'Sự kiện', notice: 'Lưu ý', urgent: '🚨 Khẩn cấp' };
  enqueue({
    type: 'announcement',
    broadcast: true,
    payload: {
      title: `📰 ${categoryLabel[existing.category] || 'Tin tức mới'}`,
      body: existing.title + (existing.summary ? ` — ${existing.summary.slice(0, 80)}` : ''),
      url: '/?tab=news',
      tag: `news-${existing.id}`,
    },
  }).catch(console.error);
  return updated;
}

async function unpublish(id) {
  return repo.setPublishState(id, false);
}

async function uploadMedia(image_base64) {
  if (!image_base64) { const e = new Error('Không có dữ liệu ảnh'); e.status = 400; throw e; }
  const fileId = `media-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const url = saveImage(image_base64, fileId);
  if (!url) { const e = new Error('Định dạng ảnh không hợp lệ'); e.status = 400; throw e; }
  return { url };
}

async function remove(id) {
  await repo.remove(id);
}

module.exports = {
  listPublished, getById, listAll, create, update, publish, unpublish, uploadMedia, remove,
};
