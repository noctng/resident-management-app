const express = require('express');
const router = express.Router();
const contractDocumentController = require('../controllers/contractDocumentController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');

const auth = [authenticateToken, checkPermission('crm')];

router.get('/', auth, contractDocumentController.getDocuments);
router.post(
  '/upload',
  auth,
  (req, res, next) => {
    contractDocumentController.upload.single('file')(req, res, (err) => {
      if (err) {
        console.error('Multer upload error:', err);
        return res.status(400).json({ success: false, message: err.message || 'Lỗi xử lý file upload' });
      }
      next();
    });
  },
  contractDocumentController.uploadDocument
);
// File serving is public (no auth) — URL is opaque and contains unique filename
router.get('/file/:filename', contractDocumentController.serveFile);
router.delete('/:id', auth, contractDocumentController.deleteDocument);

module.exports = router;
