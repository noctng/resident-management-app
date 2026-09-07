const express = require('express');
const router = express.Router();
const feeConfigController = require('../controllers/feeConfigController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');
const { verifyExternalApiKey } = require('../services/externalIntegrationService');

// Normalize auth: accept internal JWT or external API key
function acceptExternalOrInternal(req, res, next) {
  const apiKey = (req.headers['x-api-key'] || '').toString().trim();
  if (apiKey) {
    return verifyExternalApiKey(req, res, next);
  }
  return authenticateToken(req, res, () => isAdmin(req, res, next));
}

// Get current fee configuration
router.get('/current', acceptExternalOrInternal, feeConfigController.getCurrentConfig);

// Get fee configuration history
router.get('/history', acceptExternalOrInternal, feeConfigController.getConfigHistory);

// Get fee config at specific date
router.get('/at-date', acceptExternalOrInternal, feeConfigController.getConfigAtDate);

// Create/Update fee configuration
router.post('/', acceptExternalOrInternal, feeConfigController.updateConfig);

module.exports = router;
