const express = require('express');
const router = express.Router();
const occupancyController = require('../controllers/occupancyController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { occupancySchema } = require('../schemas/coreSchemas');

router.get('/', [authenticateToken, checkPermission('residents')], occupancyController.getAllOccupancies);
router.post(
    '/',
    [authenticateToken, checkPermission('residents'), validate(occupancySchema)],
    occupancyController.addOccupancy
);
router.delete(
    '/:apartmentId/:residentId',
    [authenticateToken, checkPermission('residents')],
    occupancyController.removeOccupancy
);

module.exports = router;
