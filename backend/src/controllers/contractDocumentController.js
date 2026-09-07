const prisma = require('../config/prisma');
const { logActivity } = require('../utils/logger');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { save, remove } = require('../services/objectStorageService');

// Setup storage directory
const uploadDir = path.join(__dirname, '../../uploads/crm_docs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Also ensure nginx dist crm_docs exists
const nginxCrmDir = '/home/dell/workspace/resident-management-app/backend/nginx-1.28.0/html/dist/crm_docs';
if (!fs.existsSync(nginxCrmDir)) {
  try {
    fs.mkdirSync(nginxCrmDir, { recursive: true });
  } catch (e) {
    // Ignore if path not available
  }
}

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext) || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Chỉ cho phép tải lên định dạng PDF hoặc hình ảnh (PNG, JPG)'));
  }
};

exports.upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

/**
 * 1. Get Documents with Filters and Search
 */
exports.getDocuments = async (req, res) => {
  try {
    const { contract_id, apartment_id, doc_type, search } = req.query;

    const where = {};
    if (contract_id) where.contract_id = contract_id;
    if (apartment_id) where.apartment_id = apartment_id;
    if (doc_type && doc_type !== 'ALL') where.doc_type = doc_type;
    if (search) {
      where.OR = [
        { document_name: { contains: search, mode: 'insensitive' } },
        { contracts: { contract_code: { contains: search, mode: 'insensitive' } } },
        { contracts: { apartments: { code: { contains: search, mode: 'insensitive' } } } },
        { apartments: { code: { contains: search, mode: 'insensitive' } } },
        { contracts: { customers: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const documents = await prisma.contract_documents.findMany({
      where,
      include: {
        contracts: {
          include: {
            apartments: true,
            customers: true,
          },
        },
        apartments: true,
      },
      orderBy: { uploaded_at: 'desc' },
    });

    // Summary stats
    const totalDocs = documents.length;
    const totalSize = documents.reduce((sum, d) => sum + (d.file_size || 0), 0);
    const uniqueContracts = new Set(documents.map((d) => d.contract_id).filter(Boolean)).size;

    res.json({
      success: true,
      documents,
      totalCount: documents.length,
      stats: {
        totalDocs,
        totalSize,
        uniqueContracts,
      },
    });
  } catch (err) {
    console.error('Lỗi lấy danh sách tài liệu scan:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2. Upload Document (Scanned PDF or Image)
 */
exports.uploadDocument = async (req, res) => {
  try {
    const {
      contract_id,
      apartment_id,
      document_name,
      doc_type = 'HDMB_SCAN',
      notes,
    } = req.body;

    let fileUrl = '';
    let fileSize = 0;
    let mimeType = 'application/pdf';

    if (req.file) {
      const stored = await save({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        prefix: 'crm_docs',
      });

      fileUrl = stored.url;
      fileSize = stored.size;
      mimeType = stored.mimeType;
    } else if (req.body.file_url) {
      fileUrl = req.body.file_url;
      fileSize = req.body.file_size || 1024 * 500;
    } else {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn file scan PDF cần tải lên' });
    }

    let aptId = apartment_id;
    if (contract_id && !aptId) {
      const contract = await prisma.contracts.findUnique({ where: { id: contract_id } });
      if (contract) aptId = contract.apartment_id;
    }

    const docId = 'doc_' + crypto.randomBytes(6).toString('hex');
    const uploader = req.user?.username || req.user?.name || 'Admin';

    const document = await prisma.contract_documents.create({
      data: {
        id: docId,
        contract_id: contract_id || null,
        apartment_id: aptId || null,
        document_name: document_name || req.file?.originalname || 'Bản scan hồ sơ HĐMB',
        file_url: fileUrl,
        file_size: fileSize,
        mime_type: mimeType,
        doc_type,
        uploaded_by: uploader,
        notes,
      },
      include: {
        contracts: {
          include: {
            apartments: true,
            customers: true,
          },
        },
        apartments: true,
      },
    });

    await logActivity(
      req.user,
      'TẢI_LÊN_BẢN_SCAN',
      'CONTRACT_DOCUMENT',
      document.id,
      document.document_name,
      `Tải lên bản scan ${document.document_name} (${doc_type})`
    );

    res.status(201).json({
      success: true,
      message: 'Tải lên bản scan thành công!',
      document,
    });
  } catch (err) {
    console.error('Lỗi tải lên tài liệu scan:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 3. Delete Document
 */
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await prisma.contract_documents.findUnique({ where: { id } });

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài liệu' });
    }

    // Try deleting physical file from both old and new storage paths
    if (doc.file_url) {
      const filename = path.basename(doc.file_url);
      const candidates = [
        path.join(uploadDir, filename),
        path.join(nginxCrmDir, filename),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          try { fs.unlinkSync(p); } catch (e) {}
        }
      }
    }

    await prisma.contract_documents.delete({ where: { id } });

    await logActivity(
      req.user,
      'XÓA_BẢN_SCAN',
      'CONTRACT_DOCUMENT',
      doc.id,
      doc.document_name,
      `Xóa bản scan ${doc.document_name}`
    );

    res.json({ success: true, message: 'Đã xóa bản scan thành công' });
  } catch (err) {
    console.error('Lỗi xóa tài liệu:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 4. Serve File directly (PDF / Images) inline
 */
exports.serveFile = (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      // Check nginx dist as fallback
      const altPath = path.join(nginxCrmDir, filename);
      if (fs.existsSync(altPath)) {
        return res.sendFile(altPath);
      }
      return res.status(404).send('Không tìm thấy tệp scan PDF trên máy chủ');
    }

    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="' + encodeURIComponent(filename) + '"');
    } else if (['.jpg', '.jpeg'].includes(ext)) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (ext === '.png') {
      res.setHeader('Content-Type', 'image/png');
    }

    return res.sendFile(filePath);
  } catch (err) {
    console.error('Lỗi truyền file scan:', err);
    res.status(500).send('Lỗi máy chủ khi đọc tệp');
  }
};
