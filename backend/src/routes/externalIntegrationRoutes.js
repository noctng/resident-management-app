const express = require('express');
const router = express.Router();
const externalIntegrationController = require('../controllers/externalIntegrationController');
const { verifyExternalApiKey } = require('../services/externalIntegrationService');

// External API access only by API key, no internal auth cookie/JWT
router.use((req, res, next) => verifyExternalApiKey(req, res, next));

router.get('/amenity/active', externalIntegrationController.getActiveAmenityUsage);
router.get('/amenity/history', externalIntegrationController.getAllAmenityHistory);

module.exports = router;
