const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');

const auth = [authenticateToken, checkPermission('crm')];

router.get('/', auth, promotionController.getPromotions);
router.post('/', auth, promotionController.createPromotion);
router.put('/:id', auth, promotionController.updatePromotion);
router.post('/:id/toggle-status', auth, promotionController.togglePromotionStatus);
router.post('/calculate-discount', auth, promotionController.calculateDiscount);

module.exports = router;
