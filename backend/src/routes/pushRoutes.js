const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const pushController = require('../controllers/pushController');

// Public — frontend needs VAPID key before auth
router.get('/vapid-public-key', pushController.getVapidPublicKey);

// Authenticated
router.post('/subscribe', authenticateToken, pushController.subscribe);
router.post('/unsubscribe', authenticateToken, pushController.unsubscribe);
router.get('/status', authenticateToken, pushController.getStatus);

module.exports = router;
