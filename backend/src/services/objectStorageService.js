const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const NGINX_DIST_BASE = '/home/dell/workspace/resident-management-app/backend/nginx-1.28.0/html/dist';
const UPLOADS_BASE = path.join(__dirname, '../../uploads');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function generateKey(prefix, originalName) {
  const ext = path.extname(originalName || '');
  const random = crypto.randomBytes(8).toString('hex');
  const timestamp = Date.now().toString(36);
  return `${prefix}/${timestamp}-${random}${ext}`;
}

async function save({ buffer, originalName, mimeType, prefix }) {
  const safePrefix = (prefix || 'uploads').replace(/[^a-zA-Z0-9_-]/g, '');
  const key = generateKey(safePrefix, originalName);
  const relativePath = key.replace(/^uploads\//, '');

  const localPath = path.join(UPLOADS_BASE, relativePath);
  const distPath = path.join(NGINX_DIST_BASE, relativePath);

  ensureDir(path.dirname(localPath));
  ensureDir(path.dirname(distPath));

  fs.writeFileSync(localPath, buffer);
  fs.writeFileSync(distPath, buffer);

  const publicUrl = `/${relativePath}`;

  return {
    key,
    filename: path.basename(relativePath),
    path: relativePath,
    url: publicUrl,
    localPath,
    distPath,
    size: buffer.length,
    mimeType: mimeType || 'application/octet-stream',
  };
}

async function remove(relativePath) {
  const localPath = path.join(UPLOADS_BASE, relativePath);
  const distPath = path.join(NGINX_DIST_BASE, relativePath);
  [localPath, distPath].forEach((p) => {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });
}

module.exports = { save, remove };
