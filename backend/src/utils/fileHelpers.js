const fs = require('fs');
const path = require('path');
const { save, remove } = require('../services/objectStorageService');

const UPLOADS_BASE = path.join(__dirname, '../../uploads');

// Keep legacy paths for read fallback and delete cleanup
const FEEDBACK_PICTURE_DIR = path.join(UPLOADS_BASE, 'picture_feedback');
const CRM_DOC_DIR = path.join(UPLOADS_BASE, 'crm_docs');

// Ensure directories exist on load
[FEEDBACK_PICTURE_DIR, CRM_DOC_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

const saveImg = async (f, id, i, t) => {
    const stored = await save({
        buffer: f.buffer,
        originalName: `${id}-${t}${String(i + 1).padStart(2, '0')}.${(f.mimetype || 'image/png').split('/')[1] || 'png'}`,
        mimeType: f.mimetype || 'image/png',
        prefix: 'picture_feedback',
    });
    return stored.filename;
};

const saveFile = async (file, prefix) => {
    const stored = await save({
        buffer: file.buffer,
        originalName: file.originalname || `${prefix}_${Date.now()}`,
        mimeType: file.mimetype || 'application/octet-stream',
        prefix: 'crm_docs',
    });
    return stored.filename;
};

const saveFileWithExactName = async (file, filename) => {
    const stored = await save({
        buffer: file.buffer,
        originalName: filename,
        mimeType: file.mimetype || 'application/octet-stream',
        prefix: 'crm_docs',
    });
    return stored.filename;
};

module.exports = {
    FEEDBACK_PICTURE_DIR,
    CRM_DOC_DIR,
    saveImg,
    saveFile,
    saveFileWithExactName,
    remove,
};
