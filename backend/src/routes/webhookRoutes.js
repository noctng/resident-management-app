const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// SePay Webhook endpoints
router.post('/sepay', webhookController.handleSepayWebhook);
router.get('/sepay', webhookController.handleSepayWebhookTest);

module.exports = router;
