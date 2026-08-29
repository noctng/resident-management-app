const fs = require('fs');
const path = require('path');
const prisma = require('../config/prisma');
const { logActivity } = require('../utils/logger');
const service = require('../services/configService');

const DOC_DIR = path.join(__dirname, '../../uploads/documents');
const NGINX_DOC_DIR = 'D:/nginx/nginx-1.28.0/html/dist/documents';
if (!fs.existsSync(DOC_DIR)) fs.mkdirSync(DOC_DIR, { recursive: true });
if (!fs.existsSync(NGINX_DOC_DIR)) fs.mkdirSync(NGINX_DOC_DIR, { recursive: true });

// ============ EMAIL ============
exports.getEmailConfig = async (req, res) => {
  try {
    const config = await service.getEmailConfig();
    res.json(config);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tải cấu hình' });
  }
};

exports.updateEmailConfig = async (req, res) => {
  try {
    const result = await service.updateEmailConfig(req.body, req.user);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi lưu cấu hình' });
  }
};

// ============ QR ============
exports.getQRConfig = async (req, res) => {
  try {
    const config = await service.getQRConfig();
    res.json(config);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tải cấu hình QR' });
  }
};

exports.updateQRConfig = async (req, res) => {
  try {
    const result = await service.updateQRConfig(req.body, req.user);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi lưu cấu hình QR' });
  }
};

exports.getQRConfigPublic = async (req, res) => {
  try {
    const config = await service.getQRConfigPublic();
    res.json(config);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tải cấu hình QR' });
  }
};

// ============ AMENITY LIMITS ============
exports.getAmenityLimits = async (req, res) => {
  try {
    const limits = await service.getAmenityLimits();
    res.json(limits);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tải cấu hình tiện ích' });
  }
};

exports.getAmenityLimitsPublic = async (req, res) => {
  try {
    const limits = await service.getAmenityLimitsPublic();
    res.json(limits);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tải cấu hình tiện ích' });
  }
};

exports.updateAmenityLimits = async (req, res) => {
  try {
    const result = await service.updateAmenityLimits(req.body, req.user);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi lưu cấu hình tiện ích' });
  }
};

// ============ AI ============
exports.getAIConfig = async (req, res) => {
  try {
    const config = await service.getAIConfig();
    res.json(config);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi tải cấu hình AI' });
  }
};

exports.updateAIConfig = async (req, res) => {
  try {
    const result = await service.updateAIConfig(req.body, req.user);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi lưu cấu hình AI' });
  }
};

// ============ SEPAY ============
exports.getSepayConfig = async (req, res) => {
  try {
    const config = await service.getSepayConfig();
    res.json(config);
  } catch (err) {
    console.error('Lỗi tải cấu hình SePay:', err);
    res.status(500).json({ message: 'Lỗi tải cấu hình SePay' });
  }
};

exports.updateSepayConfig = async (req, res) => {
  try {
    const result = await service.updateSepayConfig(req.body, req.user);
    res.json(result);
  } catch (err) {
    console.error('Lỗi lưu cấu hình SePay:', err);
    res.status(500).json({ message: 'Lỗi lưu cấu hình SePay' });
  }
};

// ============ HANDBOOK SETTINGS ============
exports.getHandbookInfo = async (req, res) => {
  try {
    const destBackend = path.join(DOC_DIR, 'resident-handbook.pdf');
    const destNginx = path.join(NGINX_DOC_DIR, 'resident-handbook.pdf');
    const exists = fs.existsSync(destBackend) || fs.existsSync(destNginx);

    let stat = null;
    if (fs.existsSync(destBackend)) stat = fs.statSync(destBackend);
    else if (fs.existsSync(destNginx)) stat = fs.statSync(destNginx);

    const info = await service.getHandbookInfo(
      fs.existsSync(destBackend) ? stat : null,
      fs.existsSync(destNginx) ? stat : null,
      exists
    );
    res.json(info);
  } catch (err) {
    console.error('Lỗi lấy thông tin Sổ Tay Cư Dân:', err);
    res.status(500).json({ message: 'Lỗi lấy thông tin Sổ Tay Cư Dân' });
  }
};

exports.updateHandbookSettings = async (req, res) => {
  try {
    const result = await service.updateHandbookSettings(req.body, req.user);
    res.json(result);
  } catch (err) {
    console.error('Lỗi cập nhật thông tin Sổ Tay:', err);
    res.status(500).json({ message: 'Lỗi cập nhật thông tin' });
  }
};

// ============ FILE I/O HANDLERS (giữ nguyên, fs stream) ============
exports.uploadHandbook = async (req, res) => {
  try {
    let pdfBuffer = null;
    let finalFileName = req.body?.fileName || 'So_Tay_Cu_Dan_TP_Ca_Phe.pdf';
    const finalTitle = req.body?.title || 'Sổ Tay Cư Dân - Khu Đô Thị Thành Phố Cà Phê';
    const { subtitle, hotlineSecurity, hotlineTechnical, hotlineFeedback } = req.body || {};

    if (req.file && req.file.buffer) {
      pdfBuffer = req.file.buffer;
      finalFileName = req.file.originalname || finalFileName;
    } else if (req.body?.base64Data) {
      const base64Data = req.body.base64Data;
      if (base64Data.includes(',')) {
        pdfBuffer = Buffer.from(base64Data.split(',')[1], 'base64');
      } else {
        pdfBuffer = Buffer.from(base64Data, 'base64');
      }
    }

    const destBackend = path.join(DOC_DIR, 'resident-handbook.pdf');
    const destNginx = path.join(NGINX_DOC_DIR, 'resident-handbook.pdf');

    if (!fs.existsSync(DOC_DIR)) fs.mkdirSync(DOC_DIR, { recursive: true });
    if (!fs.existsSync(NGINX_DOC_DIR)) fs.mkdirSync(NGINX_DOC_DIR, { recursive: true });

    if (pdfBuffer && pdfBuffer.length > 0) {
      fs.writeFileSync(destBackend, pdfBuffer);
      try {
        fs.writeFileSync(destNginx, pdfBuffer);
      } catch (nginxErr) {
        console.warn('[Handbook] Warning writing to Nginx doc dir:', nginxErr.message);
      }
    }

    const fileSize = pdfBuffer ? pdfBuffer.length : 0;
    const now = new Date().toISOString();

    const upsert = async (key, value, description) => {
      if (value !== undefined) {
        await prisma.system_settings.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value), description },
        });
      }
    };

    await upsert('HANDBOOK_TITLE', finalTitle, 'Tiêu đề Sổ Tay Cư Dân');
    await upsert('HANDBOOK_SUBTITLE', subtitle, 'Mô tả Sổ Tay Cư Dân');
    await upsert('HANDBOOK_HOTLINE_SECURITY', hotlineSecurity, 'Hotline An Ninh 24/7');
    await upsert('HANDBOOK_HOTLINE_TECHNICAL', hotlineTechnical, 'Hotline Kỹ Thuật');
    await upsert('HANDBOOK_HOTLINE_FEEDBACK', hotlineFeedback, 'Hotline Tiếp Nhận Phản Ánh');

    if (pdfBuffer && pdfBuffer.length > 0) {
      await upsert('HANDBOOK_FILENAME', finalFileName, 'Tên file Sổ Tay Cư Dân');
      await upsert('HANDBOOK_FILESIZE', String(fileSize), 'Dung lượng file Sổ Tay Cư Dân');
      await upsert('HANDBOOK_UPDATED_AT', now, 'Thời gian cập nhật Sổ Tay Cư Dân');
    }

    await logActivity(
      req.user,
      'CẬP_NHẬT_CẤU_HÌNH',
      'SYSTEM',
      'HANDBOOK',
      finalFileName,
      `Tải lên Sổ Tay Cư Dân mới (${(fileSize / 1024).toFixed(1)} KB)`
    );

    res.json({
      message: 'Tải lên Sổ Tay Cư Dân thành công',
      url: '/documents/resident-handbook.pdf',
      fileName: finalFileName,
      fileSize,
      updatedAt: now,
    });
  } catch (err) {
    console.error('Lỗi upload Sổ Tay Cư Dân:', err);
    res.status(500).json({ message: 'Lỗi tải lên file PDF Sổ Tay Cư Dân' });
  }
};

exports.deleteHandbook = async (req, res) => {
  try {
    const destBackend = path.join(DOC_DIR, 'resident-handbook.pdf');
    const destNginx = path.join(NGINX_DOC_DIR, 'resident-handbook.pdf');

    if (fs.existsSync(destBackend)) fs.unlinkSync(destBackend);
    if (fs.existsSync(destNginx)) fs.unlinkSync(destNginx);

    await prisma.system_settings.deleteMany({
      where: { key: { in: ['HANDBOOK_TITLE', 'HANDBOOK_FILENAME', 'HANDBOOK_FILESIZE', 'HANDBOOK_UPDATED_AT'] } },
    });

    await logActivity(
      req.user,
      'XÓA_CẤU_HÌNH',
      'SYSTEM',
      'HANDBOOK',
      'resident-handbook.pdf',
      'Xóa file Sổ Tay Cư Dân'
    );

    res.json({ message: 'Đã xóa Sổ Tay Cư Dân' });
  } catch (err) {
    console.error('Lỗi xóa Sổ Tay Cư Dân:', err);
    res.status(500).json({ message: 'Lỗi xóa file Sổ Tay Cư Dân' });
  }
};

exports.downloadHandbook = async (req, res) => {
  try {
    const filePath = path.join(NGINX_DOC_DIR, 'resident-handbook.pdf');
    const fallbackPath = path.join(DOC_DIR, 'resident-handbook.pdf');
    const finalPath = fs.existsSync(filePath) ? filePath : fallbackPath;

    if (!fs.existsSync(finalPath)) {
      return res.status(404).json({ message: 'Chưa có file Sổ Tay Cư Dân nào được tải lên' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="So_Tay_Cu_Dan_TP_Ca_Phe.pdf"');
    fs.createReadStream(finalPath).pipe(res);
  } catch (err) {
    console.error('Lỗi tải file Sổ Tay Cư Dân:', err);
    res.status(500).json({ message: 'Lỗi tải file' });
  }
};

exports.viewHandbookFile = async (req, res) => {
  try {
    const filePath = path.join(NGINX_DOC_DIR, 'resident-handbook.pdf');
    const fallbackPath = path.join(DOC_DIR, 'resident-handbook.pdf');
    const finalPath = fs.existsSync(filePath) ? filePath : fallbackPath;

    if (!fs.existsSync(finalPath)) {
      return res.status(404).send('Chưa có file Sổ Tay Cư Dân');
    }

    const stat = fs.statSync(finalPath);
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Length': stat.size,
      'Content-Disposition': 'inline; filename="So_Tay_Cu_Dan.pdf"',
      'Cache-Control': 'public, max-age=3600',
    });
    fs.createReadStream(finalPath).pipe(res);
  } catch (err) {
    console.error('Lỗi xem file Sổ Tay Cư Dân:', err);
    res.status(500).send('Lỗi xem file');
  }
};
