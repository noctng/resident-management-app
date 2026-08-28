const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

const templateController = require('../controllers/templateController');

router.get('/email', authenticateToken, isAdmin, configController.getEmailConfig);
router.post('/email', authenticateToken, isAdmin, configController.updateEmailConfig);

router.get('/qr', authenticateToken, isAdmin, configController.getQRConfig);
router.post('/qr', authenticateToken, isAdmin, configController.updateQRConfig);

router.get('/templates', authenticateToken, isAdmin, templateController.getAllTemplates);
router.put('/templates/:code', authenticateToken, isAdmin, templateController.updateTemplate);

router.get('/amenity-limits', authenticateToken, isAdmin, configController.getAmenityLimits);
router.put('/amenity-limits', authenticateToken, isAdmin, configController.updateAmenityLimits);

// Public QR config for residents (no admin required)
router.get('/qr-public', authenticateToken, configController.getQRConfigPublic);

// AI Config (OpenAI-compatible vision model)
router.get('/ai', authenticateToken, isAdmin, configController.getAIConfig);
router.put('/ai', authenticateToken, isAdmin, configController.updateAIConfig);

// SePay Webhook Config
router.get('/sepay', authenticateToken, isAdmin, configController.getSepayConfig);
router.post('/sepay', authenticateToken, isAdmin, configController.updateSepayConfig);
router.put('/sepay', authenticateToken, isAdmin, configController.updateSepayConfig);


const multer = require('multer');
const uploadHandbookMiddleware = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// Resident Handbook (Sổ Tay Cư Dân)
router.get('/handbook', configController.getHandbookInfo);
router.get('/handbook/file', configController.viewHandbookFile);
router.get('/handbook/download', configController.downloadHandbook);
router.post(
    '/handbook',
    authenticateToken,
    isAdmin,
    uploadHandbookMiddleware.single('file'),
    express.json({ limit: '100mb' }),
    configController.uploadHandbook
);
router.put('/handbook', authenticateToken, isAdmin, express.json(), configController.updateHandbookSettings);
router.delete('/handbook', authenticateToken, isAdmin, configController.deleteHandbook);

module.exports = router;

