const prisma = require('../config/prisma');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { sendPushToAllResidents } = require('../services/pushService');

const NEWS_IMAGE_DIR = path.join(__dirname, '../../uploads/news/images');
const NGINX_NEWS_IMAGE_DIR = 'D:/nginx/nginx-1.28.0/html/dist/news/images';

// Ensure image directory exists
if (!fs.existsSync(NEWS_IMAGE_DIR)) {
    fs.mkdirSync(NEWS_IMAGE_DIR, { recursive: true });
}
if (!fs.existsSync(NGINX_NEWS_IMAGE_DIR)) {
    try { fs.mkdirSync(NGINX_NEWS_IMAGE_DIR, { recursive: true }); } catch (e) {}
}

/** Save base64 image to disk, return public URL */
function saveImage(base64String, fileId) {
    if (!base64String || !base64String.startsWith('data:')) return null;
    const matches = base64String.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches) return null;
    const ext = matches[1].includes('png') ? 'png' : matches[1].includes('gif') ? 'gif' : 'jpg';
    const filename = `${fileId}.${ext}`;
    const filePath = path.join(NEWS_IMAGE_DIR, filename);
    const buf = Buffer.from(matches[2], 'base64');
    fs.writeFileSync(filePath, buf);
    try {
        fs.writeFileSync(path.join(NGINX_NEWS_IMAGE_DIR, filename), buf);
    } catch (e) {}
    return `/news/images/${filename}`;
}

/** GET /api/announcements — published posts (resident & public) */
exports.getPublished = async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const posts = await prisma.announcements.findMany({
            where: { is_published: true },
            orderBy: [{ is_pinned: 'desc' }, { published_at: 'desc' }],
            take: parseInt(limit),
            skip: parseInt(offset),
            select: {
                id: true,
                title: true,
                content: true,
                summary: true,
                category: true,
                cover_image: true,
                media_urls: true,
                is_pinned: true,
                published_at: true,
                created_at: true,
                users: { select: { username: true } },
            },
        });
        res.json({ data: posts, total: posts.length });
    } catch (err) {
        console.error('[Announcements] getPublished error:', err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

/** GET /api/announcements/:id — single post with full content */
exports.getById = async (req, res) => {
    try {
        const post = await prisma.announcements.findUnique({
            where: { id: req.params.id },
            include: { users: { select: { username: true } } },
        });
        if (!post || (!post.is_published && !req.user?.isAdmin)) {
            return res.status(404).json({ message: 'Không tìm thấy bài viết' });
        }
        res.json(post);
    } catch (err) {
        console.error('[Announcements] getById error:', err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

/** GET /api/announcements/admin/all — all posts (admin) */
exports.getAll = async (req, res) => {
    try {
        const posts = await prisma.announcements.findMany({
            orderBy: [{ created_at: 'desc' }],
            include: { users: { select: { username: true } } },
        });
        res.json({ data: posts, total: posts.length });
    } catch (err) {
        console.error('[Announcements] getAll error:', err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

/** POST /api/announcements — create new post (admin) */
exports.create = async (req, res) => {
    try {
        const { title, content, summary, category, is_pinned, cover_image_base64, media_base64_list } = req.body;
        const postId = crypto.randomUUID();

        const coverUrl = cover_image_base64 ? saveImage(cover_image_base64, `cover-${postId}`) : null;
        const mediaUrls = [];
        if (Array.isArray(media_base64_list)) {
            media_base64_list.forEach((b64, idx) => {
                const url = saveImage(b64, `media-${postId}-${idx}`);
                if (url) mediaUrls.push(url);
            });
        }

        const post = await prisma.announcements.create({
            data: {
                id: postId,
                title,
                content,
                summary: summary || null,
                category: category || 'general',
                cover_image: coverUrl,
                media_urls: mediaUrls,
                is_pinned: Boolean(is_pinned),
                is_published: false,
                created_by: req.user.id,
            },
        });
        res.status(201).json(post);
    } catch (err) {
        console.error('[Announcements] create error:', err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

/** PUT /api/announcements/:id — update post (admin) */
exports.update = async (req, res) => {
    try {
        const { title, content, summary, category, is_pinned, cover_image_base64, media_base64_list, keep_media_urls } = req.body;
        const existing = await prisma.announcements.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ message: 'Không tìm thấy bài viết' });

        const postId = existing.id;
        let coverUrl = existing.cover_image;
        if (cover_image_base64 && cover_image_base64.startsWith('data:')) {
            coverUrl = saveImage(cover_image_base64, `cover-${postId}-${Date.now()}`);
        }

        let mediaUrls = Array.isArray(keep_media_urls) ? keep_media_urls : existing.media_urls;
        if (Array.isArray(media_base64_list) && media_base64_list.length > 0) {
            media_base64_list.forEach((b64, idx) => {
                const url = saveImage(b64, `media-${postId}-${Date.now()}-${idx}`);
                if (url) mediaUrls.push(url);
            });
        }

        const updated = await prisma.announcements.update({
            where: { id: req.params.id },
            data: {
                title: title || existing.title,
                content: content || existing.content,
                summary: summary !== undefined ? summary : existing.summary,
                category: category || existing.category,
                is_pinned: is_pinned !== undefined ? Boolean(is_pinned) : existing.is_pinned,
                cover_image: coverUrl,
                media_urls: mediaUrls,
                updated_at: new Date(),
            },
        });
        res.json(updated);
    } catch (err) {
        console.error('[Announcements] update error:', err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

/** POST /api/announcements/:id/publish — publish (admin) → push notification */
exports.publish = async (req, res) => {
    try {
        const existing = await prisma.announcements.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ message: 'Không tìm thấy bài viết' });

        const now = new Date();
        const updated = await prisma.announcements.update({
            where: { id: req.params.id },
            data: {
                is_published: true,
                published_at: now,
                updated_at: now,
            },
        });

        res.json(updated);

        // Send push to ALL residents after response
        const categoryLabel = { general: 'Thông báo', event: 'Sự kiện', notice: 'Lưu ý', urgent: '🚨 Khẩn cấp' };
        sendPushToAllResidents({
            title: `📰 ${categoryLabel[existing.category] || 'Tin tức mới'}`,
            body: existing.title + (existing.summary ? ` — ${existing.summary.slice(0, 80)}` : ''),
            url: '/?tab=news',
            tag: `news-${existing.id}`,
        }).catch(console.error);
    } catch (err) {
        console.error('[Announcements] publish error:', err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

/** POST /api/announcements/:id/unpublish — unpublish (admin) */
exports.unpublish = async (req, res) => {
    try {
        const updated = await prisma.announcements.update({
            where: { id: req.params.id },
            data: { is_published: false, published_at: null, updated_at: new Date() },
        });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

/** POST /api/announcements/upload-media — upload image from rich editor */
exports.uploadMedia = async (req, res) => {
    try {
        const { image_base64 } = req.body;
        if (!image_base64) return res.status(400).json({ message: 'Không có dữ liệu ảnh' });
        const fileId = `media-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const url = saveImage(image_base64, fileId);
        if (!url) return res.status(400).json({ message: 'Định dạng ảnh không hợp lệ' });
        res.json({ url });
    } catch (err) {
        console.error('[Announcements] uploadMedia error:', err);
        res.status(500).json({ message: 'Lỗi upload ảnh' });
    }
};

/** DELETE /api/announcements/:id — delete (admin) */
exports.remove = async (req, res) => {
    try {
        await prisma.announcements.delete({ where: { id: req.params.id } });
        res.status(204).send();
    } catch (err) {
        console.error('[Announcements] delete error:', err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

