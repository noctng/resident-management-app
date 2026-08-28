const express = require('express');
const router = express.Router();
const pricebookController = require('../controllers/pricebookController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');

const auth = [authenticateToken, checkPermission('crm')];

router.get('/', auth, pricebookController.getPricebooks);
router.get('/:id', auth, pricebookController.getPricebookById);
router.post('/', auth, pricebookController.createPricebook);
router.put('/:id', auth, pricebookController.updatePricebook);
router.post('/:id/approve', auth, pricebookController.approvePricebook);
router.delete('/:id', auth, pricebookController.deletePricebook);

module.exports = router;
