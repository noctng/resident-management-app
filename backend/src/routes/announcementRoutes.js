const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/announcementController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');

// Public (resident-facing): published posts only
router.get('/', ctrl.getPublished);
router.get('/:id', ctrl.getById);

// Admin-only routes
router.get('/admin/all', authenticateToken, checkPermission('announcements'), ctrl.getAll);
router.post('/upload-media', authenticateToken, checkPermission('announcements'), express.json({ limit: '50mb' }), ctrl.uploadMedia);
router.post('/', authenticateToken, checkPermission('announcements'), express.json({ limit: '50mb' }), ctrl.create);
router.put('/:id', authenticateToken, checkPermission('announcements'), express.json({ limit: '50mb' }), ctrl.update);
router.post('/:id/publish', authenticateToken, checkPermission('announcements'), ctrl.publish);
router.post('/:id/unpublish', authenticateToken, checkPermission('announcements'), ctrl.unpublish);
router.delete('/:id', authenticateToken, checkPermission('announcements'), ctrl.remove);

module.exports = router;
