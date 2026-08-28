const express = require('express');
const router = express.Router();
const feeConfigController = require('../controllers/feeConfigController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// All routes require admin authentication
router.use(authenticateToken);
router.use(isAdmin);

// Get current fee configuration
router.get('/current', feeConfigController.getCurrentConfig);

// Get fee configuration history
router.get('/history', feeConfigController.getConfigHistory);

// Get fee config at specific date
router.get('/at-date', feeConfigController.getConfigAtDate);

// Create/Update fee configuration
router.post('/', feeConfigController.updateConfig);

module.exports = router;
