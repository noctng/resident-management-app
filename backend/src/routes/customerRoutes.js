const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { customerSchema } = require('../schemas/crmSchemas');

router.get('/', authenticateToken, customerController.getAllCustomers);
router.get('/:id', authenticateToken, customerController.getCustomerById);
router.post(
    '/',
    [authenticateToken, checkPermission('crm'), validate(customerSchema)],
    customerController.createCustomer
);
router.put(
    '/:id',
    [authenticateToken, checkPermission('crm'), validate(customerSchema)],
    customerController.updateCustomer
);
router.post(
    '/:id/convert-to-resident',
    [authenticateToken, checkPermission('crm')],
    customerController.convertToResident
);

module.exports = router;
