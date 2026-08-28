const express = require('express');
const router = express.Router();
const vnptInvoiceController = require('../controllers/vnptInvoiceController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// Config endpoints (Admin only)
router.get('/config', authenticateToken, isAdmin, vnptInvoiceController.getVnptConfig);
router.post('/config', authenticateToken, isAdmin, vnptInvoiceController.updateVnptConfig);
router.put('/config', authenticateToken, isAdmin, vnptInvoiceController.updateVnptConfig);
router.post('/test-connection', authenticateToken, isAdmin, vnptInvoiceController.testConnection);
router.post('/preview-xml', authenticateToken, isAdmin, vnptInvoiceController.previewXml);

// Invoice View & Download (Accessible by both Residents & Admins)
router.get('/view', authenticateToken, vnptInvoiceController.getInvoiceView);
router.get('/download-pdf', authenticateToken, vnptInvoiceController.downloadInvoicePdf);
router.get('/download-xml', authenticateToken, vnptInvoiceController.downloadInvoiceXml);
router.post('/publish', authenticateToken, isAdmin, vnptInvoiceController.publishInvoice);

module.exports = router;
