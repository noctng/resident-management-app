const fs = require('fs');
const path = require('path');

const UPLOADS_BASE = path.join(__dirname, '../../uploads');
const FEEDBACK_PICTURE_DIR = path.join(UPLOADS_BASE, 'picture_feedback');
const CRM_DOC_DIR = path.join(UPLOADS_BASE, 'crm_docs');
const NGINX_FEEDBACK_DIR = 'D:/nginx/nginx-1.28.0/html/dist/picture_feedback';
const NGINX_CRM_DOC_DIR = 'D:/nginx/nginx-1.28.0/html/dist/crm_docs';

// Ensure directories exist on load
[FEEDBACK_PICTURE_DIR, CRM_DOC_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

const saveImg = (f, id, i, t) => {
    const n = `${id}-${t}${String(i + 1).padStart(2, '0')}.${f.mimetype.split('/')[1] || 'png'}`;
    fs.writeFileSync(path.join(FEEDBACK_PICTURE_DIR, n), f.buffer);
    try {
        if (fs.existsSync(NGINX_FEEDBACK_DIR)) {
            fs.writeFileSync(path.join(NGINX_FEEDBACK_DIR, n), f.buffer);
        }
    } catch (e) {}
    return n;
};

const saveFile = (file, prefix) => {
    const ext = path.extname(file.originalname) || '';
    const filename = `${prefix}_${Date.now()}${ext}`;
    fs.writeFileSync(path.join(CRM_DOC_DIR, filename), file.buffer);
    try {
        if (fs.existsSync(NGINX_CRM_DOC_DIR)) {
            fs.writeFileSync(path.join(NGINX_CRM_DOC_DIR, filename), file.buffer);
        }
    } catch (e) {}
    return filename;
};

const saveFileWithExactName = (file, filename) => {
    fs.writeFileSync(path.join(CRM_DOC_DIR, filename), file.buffer);
    try {
        if (fs.existsSync(NGINX_CRM_DOC_DIR)) {
            fs.writeFileSync(path.join(NGINX_CRM_DOC_DIR, filename), file.buffer);
        }
    } catch (e) {}
    return filename;
};

module.exports = {
    FEEDBACK_PICTURE_DIR,
    CRM_DOC_DIR,
    saveImg,
    saveFile,
    saveFileWithExactName,
};
