const fs = require('fs');
const path = require('path');
const prisma = require('../config/prisma');
const { logActivity } = require('../utils/logger');

exports.getEmailConfig = async (req, res) => {
    try {
        const settings = await prisma.system_settings.findMany({
            where: {
                key: { in: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_FROM', 'SMTP_SECURE'] },
            },
        });
        const config = {};
        settings.forEach((s) => (config[s.key] = s.value));
        // Do not return password
        config.SMTP_PASS = '********';
        res.json(config);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi tải cấu hình' });
    }
};

exports.updateEmailConfig = async (req, res) => {
    try {
        const config = req.body;
        const keys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_FROM', 'SMTP_SECURE'];

        for (const key of keys) {
            if (config[key] !== undefined) {
                await prisma.system_settings.upsert({
                    where: { key },
                    update: { value: String(config[key]) },
                    create: { key, value: String(config[key]), description: 'Email Config' },
                });
            }
        }

        if (config.SMTP_PASS && config.SMTP_PASS !== '********') {
            await prisma.system_settings.upsert({
                where: { key: 'SMTP_PASS' },
                update: { value: config.SMTP_PASS },
                create: {
                    key: 'SMTP_PASS',
                    value: config.SMTP_PASS,
                    description: 'Email Password',
                },
            });
        }

        await logActivity(
            req.user,
            'CẬP_NHẬT_CẤU_HÌNH',
            'SYSTEM',
            'EMAIL',
            'Email Settings',
            'Cập nhật cấu hình email'
        );
        res.json({ message: 'Cập nhật thành công' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi lưu cấu hình' });
    }
};

exports.getQRConfig = async (req, res) => {
    try {
        const settings = await prisma.system_settings.findMany({
            where: {
                key: {
                    in: [
                        'QR_BANK_ACCOUNT',
                        'QR_ACCOUNT_NAME',
                        'QR_BANK_CODE',
                        'QR_SEPAY_VA',
                        'QR_SEPAY_BANK_CODE',
                    ],
                },
            },
        });
        const config = {};
        settings.forEach((s) => (config[s.key] = s.value));
        res.json(config);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi tải cấu hình QR' });
    }
};

exports.updateQRConfig = async (req, res) => {
    try {
        const config = req.body;
        const keys = [
            'QR_BANK_ACCOUNT',
            'QR_ACCOUNT_NAME',
            'QR_BANK_CODE',
            'QR_SEPAY_VA',
            'QR_SEPAY_BANK_CODE',
        ];

        for (const key of keys) {
            if (config[key] !== undefined) {
                await prisma.system_settings.upsert({
                    where: { key },
                    update: { value: String(config[key]) },
                    create: { key, value: String(config[key]), description: 'QR Payment Config' },
                });
            }
        }

        await logActivity(
            req.user,
            'CẬP_NHẬT_CẤU_HÌNH',
            'SYSTEM',
            'QR',
            'QR Payment Settings',
            'Cập nhật cấu hình QR Code thanh toán'
        );
        res.json({ message: 'Cập nhật thành công' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi lưu cấu hình QR' });
    }
};

// =============================================
// AMENITY USAGE LIMITS CONFIG
// =============================================
const AMENITY_TYPES = ['GOLF_3D', 'HORSE_RIDING', 'MUSEUM', 'ZEN_GARDEN', 'SAUNA', 'ARCHERY', 'GYM', 'YOGA'];

exports.getAmenityLimits = async (req, res) => {
    try {
        const settings = await prisma.system_settings.findMany({
            where: { key: { startsWith: 'AMENITY_LIMIT_' } },
        });

        // Build config from DB, with defaults
        const limits = {};
        for (const type of AMENITY_TYPES) {
            const key = `AMENITY_LIMIT_${type}`;
            const setting = settings.find((s) => s.key === key);
            limits[type] = {
                monthlyLimit: setting ? parseInt(setting.value, 10) : 0,
                description: '',
            };
            if (setting && setting.description) {
                limits[type].description = setting.description;
            }
        }

        res.json(limits);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi tải cấu hình tiện ích' });
    }
};

// Public version — no admin required, read-only for residents
exports.getQRConfigPublic = async (req, res) => {
    try {
        const settings = await prisma.system_settings.findMany({
            where: {
                key: {
                    in: [
                        'QR_BANK_ACCOUNT',
                        'QR_ACCOUNT_NAME',
                        'QR_BANK_CODE',
                        'QR_SEPAY_VA',
                        'QR_SEPAY_BANK_CODE',
                    ],
                },
            },
        });
        const config = {};
        settings.forEach((s) => (config[s.key] = s.value));
        res.json(config);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi tải cấu hình QR' });
    }
};

exports.getAmenityLimitsPublic = async (req, res) => {
    try {
        const settings = await prisma.system_settings.findMany({
            where: { key: { startsWith: 'AMENITY_LIMIT_' } },
        });

        const limits = {};
        for (const type of AMENITY_TYPES) {
            const key = `AMENITY_LIMIT_${type}`;
            const setting = settings.find((s) => s.key === key);
            limits[type] = {
                monthlyLimit: setting ? parseInt(setting.value, 10) : 0,
                description: '',
            };
            if (setting && setting.description) {
                limits[type].description = setting.description;
            }
        }

        res.json(limits);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi tải cấu hình tiện ích' });
    }
};

exports.updateAmenityLimits = async (req, res) => {
    try {
        const limits = req.body;

        for (const type of AMENITY_TYPES) {
            if (limits[type] !== undefined) {
                const key = `AMENITY_LIMIT_${type}`;
                const monthlyLimit = parseInt(limits[type].monthlyLimit, 10) || 0;
                const description = limits[type].description || '';

                await prisma.system_settings.upsert({
                    where: { key },
                    update: {
                        value: String(monthlyLimit),
                        description: description || 'Amenity Usage Limit',
                    },
                    create: {
                        key,
                        value: String(monthlyLimit),
                        description: description || 'Amenity Usage Limit',
                    },
                });
            }
        }

        await logActivity(
            req.user,
            'CẬP_NHẬT_CẤU_HÌNH',
            'SYSTEM',
            'AMENITY_LIMITS',
            'Amenity Usage Limits',
            'Cập nhật cấu hình lượt sử dụng tiện ích'
        );
        res.json({ message: 'Cập nhật thành công' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi lưu cấu hình tiện ích' });
    }
};

// =============================================
// AI CONFIG (OpenAI-compatible)
// =============================================
exports.getAIConfig = async (req, res) => {
    try {
        const settings = await prisma.system_settings.findMany({
            where: { key: { in: ['AI_BASE_URL', 'AI_MODEL'] } },
        });
        const config = {};
        settings.forEach((s) => (config[s.key] = s.value));
        // Never return the actual key — mask it
        const keyRecord = await prisma.system_settings.findUnique({ where: { key: 'AI_API_KEY' } });
        config.AI_API_KEY = keyRecord?.value ? '********' : '';
        config.AI_HAS_KEY = !!(keyRecord?.value);
        res.json(config);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi tải cấu hình AI' });
    }
};

exports.updateAIConfig = async (req, res) => {
    try {
        const { AI_BASE_URL, AI_API_KEY, AI_MODEL } = req.body;

        const upsert = async (key, value, description) => {
            await prisma.system_settings.upsert({
                where: { key },
                update: { value: String(value) },
                create: { key, value: String(value), description },
            });
        };

        if (AI_BASE_URL !== undefined) await upsert('AI_BASE_URL', AI_BASE_URL, 'AI Base URL (OpenAI-compatible)');
        if (AI_MODEL !== undefined)    await upsert('AI_MODEL',    AI_MODEL,    'AI Model Name');
        if (AI_API_KEY && AI_API_KEY !== '********') {
            await upsert('AI_API_KEY', AI_API_KEY, 'AI API Key');
        }

        await logActivity(
            req.user,
            'CẬP_NHẬT_CẤU_HÌNH',
            'SYSTEM',
            'AI_CONFIG',
            'AI Config',
            'Cập nhật cấu hình AI phân tích đồng hồ'
        );
        res.json({ message: 'Cập nhật cấu hình AI thành công' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi lưu cấu hình AI' });
    }
};

// =============================================
// SEPAY WEBHOOK CONFIG
// =============================================
exports.getSepayConfig = async (req, res) => {
    try {
        const keys = [
            'SEPAY_ENABLED',
            'SEPAY_WEBHOOK_URL',
            'SEPAY_BANK_ACCOUNT',
            'SEPAY_BANK_NAME',
            'SEPAY_AUTO_MATCH_UTILITY',
            'SEPAY_AUTO_MATCH_UNIFIED',
            'SEPAY_AUTO_MATCH_MANAGEMENT',
            'SEPAY_SYNTAX_PREFIX',
        ];
        const settings = await prisma.system_settings.findMany({
            where: { key: { in: keys } },
        });
        const config = {
            SEPAY_ENABLED: true,
            SEPAY_AUTO_MATCH_UTILITY: true,
            SEPAY_AUTO_MATCH_UNIFIED: true,
            SEPAY_AUTO_MATCH_MANAGEMENT: true,
            SEPAY_SYNTAX_PREFIX: 'CAN,EW,UB,HD',
        };
        settings.forEach((s) => {
            if (s.key.startsWith('SEPAY_AUTO_MATCH_') || s.key === 'SEPAY_ENABLED') {
                config[s.key] = s.value === 'true';
            } else {
                config[s.key] = s.value;
            }
        });

        // Mask secret keys
        const apiKeyRecord = await prisma.system_settings.findUnique({ where: { key: 'SEPAY_API_KEY' } });
        config.SEPAY_API_KEY = apiKeyRecord?.value ? '********' : '';

        const secretKeyRecord = await prisma.system_settings.findUnique({ where: { key: 'SEPAY_WEBHOOK_SECRET' } });
        config.SEPAY_WEBHOOK_SECRET = secretKeyRecord?.value ? '********' : '';

        res.json(config);
    } catch (err) {
        console.error('Lỗi tải cấu hình SePay:', err);
        res.status(500).json({ message: 'Lỗi tải cấu hình SePay' });
    }
};

exports.updateSepayConfig = async (req, res) => {
    try {
        const config = req.body || {};
        const keys = [
            'SEPAY_ENABLED',
            'SEPAY_WEBHOOK_URL',
            'SEPAY_BANK_ACCOUNT',
            'SEPAY_BANK_NAME',
            'SEPAY_AUTO_MATCH_UTILITY',
            'SEPAY_AUTO_MATCH_UNIFIED',
            'SEPAY_AUTO_MATCH_MANAGEMENT',
            'SEPAY_SYNTAX_PREFIX',
        ];

        const upsert = async (key, value, description) => {
            await prisma.system_settings.upsert({
                where: { key },
                update: { value: String(value) },
                create: { key, value: String(value), description },
            });
        };

        for (const key of keys) {
            if (config[key] !== undefined) {
                await upsert(key, config[key], 'SePay Webhook Config');
            }
        }

        if (config.SEPAY_API_KEY && config.SEPAY_API_KEY !== '********') {
            await upsert('SEPAY_API_KEY', config.SEPAY_API_KEY, 'SePay API Key');
        }

        if (config.SEPAY_WEBHOOK_SECRET && config.SEPAY_WEBHOOK_SECRET !== '********') {
            await upsert('SEPAY_WEBHOOK_SECRET', config.SEPAY_WEBHOOK_SECRET, 'SePay Webhook Secret');
        }

        await logActivity(
            req.user,
            'CẬP_NHẬT_CẤU_HÌNH',
            'SYSTEM',
            'SEPAY_CONFIG',
            'SePay Config',
            'Cập nhật cấu hình SePay Webhooks gạch nợ tự động'
        );
        res.json({ message: 'Cập nhật cấu hình SePay thành công' });
    } catch (err) {
        console.error('Lỗi lưu cấu hình SePay:', err);
        res.status(500).json({ message: 'Lỗi lưu cấu hình SePay' });
    }
};


const DOC_DIR = path.join(__dirname, '../../uploads/documents');
const NGINX_DOC_DIR = 'D:/nginx/nginx-1.28.0/html/dist/documents';
if (!fs.existsSync(DOC_DIR)) fs.mkdirSync(DOC_DIR, { recursive: true });
if (!fs.existsSync(NGINX_DOC_DIR)) fs.mkdirSync(NGINX_DOC_DIR, { recursive: true });

exports.getHandbookInfo = async (req, res) => {
    try {
        const settings = await prisma.system_settings.findMany({
            where: {
                key: {
                    in: [
                        'HANDBOOK_TITLE',
                        'HANDBOOK_SUBTITLE',
                        'HANDBOOK_HOTLINE_SECURITY',
                        'HANDBOOK_HOTLINE_TECHNICAL',
                        'HANDBOOK_HOTLINE_FEEDBACK',
                        'HANDBOOK_FILENAME',
                        'HANDBOOK_FILESIZE',
                        'HANDBOOK_UPDATED_AT',
                    ],
                },
            },
        });
        const map = {};
        settings.forEach((s) => (map[s.key] = s.value));

        const destBackend = path.join(DOC_DIR, 'resident-handbook.pdf');
        const destNginx = path.join(NGINX_DOC_DIR, 'resident-handbook.pdf');
        const exists = fs.existsSync(destBackend) || fs.existsSync(destNginx);
        let stat = null;
        if (fs.existsSync(destBackend)) {
            stat = fs.statSync(destBackend);
        } else if (fs.existsSync(destNginx)) {
            stat = fs.statSync(destNginx);
        }

        res.json({
            title: map.HANDBOOK_TITLE || 'Sổ Tay Cư Dân - Khu Đô Thị Thành Phố Cà Phê',
            subtitle: map.HANDBOOK_SUBTITLE || 'Cẩm nang quy chuẩn nội quy khu đô thị, hướng dẫn sử dụng tiện ích cao cấp, chính sách tài chính & danh bạ cứu hộ khẩn cấp 24/7 do Ban Quản Lý ban hành.',
            hotlineSecurity: map.HANDBOOK_HOTLINE_SECURITY || '0262 3999 888',
            hotlineTechnical: map.HANDBOOK_HOTLINE_TECHNICAL || '0901 234 567',
            hotlineFeedback: map.HANDBOOK_HOTLINE_FEEDBACK || '0262 3999 999',
            fileName: map.HANDBOOK_FILENAME || 'So_Tay_Cu_Dan_TP_Ca_Phe_2026.pdf',
            fileSize: map.HANDBOOK_FILESIZE ? Number(map.HANDBOOK_FILESIZE) : (stat ? stat.size : 0),
            updatedAt: map.HANDBOOK_UPDATED_AT || (stat ? stat.mtime : new Date()),
            url: '/api/config/handbook/file',
            exists: Boolean(exists),
        });
    } catch (err) {
        console.error('Lỗi lấy thông tin Sổ Tay Cư Dân:', err);
        res.status(500).json({ message: 'Lỗi lấy thông tin Sổ Tay Cư Dân' });
    }
};

exports.updateHandbookSettings = async (req, res) => {
    try {
        const { title, subtitle, hotlineSecurity, hotlineTechnical, hotlineFeedback } = req.body;

        const upsert = async (key, value, description) => {
            if (value !== undefined) {
                await prisma.system_settings.upsert({
                    where: { key },
                    update: { value: String(value) },
                    create: { key, value: String(value), description },
                });
            }
        };

        await upsert('HANDBOOK_TITLE', title, 'Tiêu đề Sổ Tay Cư Dân');
        await upsert('HANDBOOK_SUBTITLE', subtitle, 'Mô tả Sổ Tay Cư Dân');
        await upsert('HANDBOOK_HOTLINE_SECURITY', hotlineSecurity, 'Hotline An Ninh 24/7');
        await upsert('HANDBOOK_HOTLINE_TECHNICAL', hotlineTechnical, 'Hotline Kỹ Thuật');
        await upsert('HANDBOOK_HOTLINE_FEEDBACK', hotlineFeedback, 'Hotline Tiếp Nhận Phản Ánh');

        await logActivity(
            req.user,
            'CẬP_NHẬT_CẤU_HÌNH',
            'SYSTEM',
            'HANDBOOK',
            'Hotlines',
            'Cập nhật thông tin hotline và tiêu đề Sổ Tay Cư Dân'
        );

        res.json({ message: 'Cập nhật thông tin Sổ Tay Cư Dân thành công' });
    } catch (err) {
        console.error('Lỗi cập nhật thông tin Sổ Tay:', err);
        res.status(500).json({ message: 'Lỗi cập nhật thông tin' });
    }
};

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
