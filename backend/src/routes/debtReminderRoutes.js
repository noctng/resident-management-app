const express = require('express');
const router = express.Router();
const debtReminderController = require('../controllers/debtReminderController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// All routes require admin authentication
router.use(authenticateToken);
router.use(isAdmin);

// Send debt reminder email for a specific fee
router.post('/send/:feeId', debtReminderController.sendDebtReminder);

// Send bulk debt reminder emails
router.post('/send-bulk', debtReminderController.sendBulkDebtReminders);

// Get email sending history
router.get('/history', debtReminderController.getEmailHistory);

module.exports = router;
