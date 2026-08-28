const express = require('express');
const router = express.Router();
const productController = require('../controllers/productInventoryController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');

const auth = [authenticateToken, checkPermission('crm')];

router.get('/matrix', auth, productController.getSalesMatrix);
router.get('/units/:id', auth, productController.getProductDetail);
router.post('/units', auth, productController.createProductUnit);
router.put('/units/:id', auth, productController.updateProductUnit);
router.delete('/units/:id', auth, productController.deleteProductUnit);
router.post('/units/batch-status', auth, productController.batchUpdateStatus);

module.exports = router;
