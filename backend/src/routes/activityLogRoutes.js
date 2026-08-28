const express = require('express');
const router = express.Router();
const activityLogController = require('../controllers/activityLogController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { createLogSchema } = require('../schemas/featureSchemas');

router.get('/filters', [authenticateToken, checkPermission('logs')], activityLogController.getLogFilters);
router.get('/', [authenticateToken, checkPermission('logs')], activityLogController.getAllLogs);
router.post('/', [authenticateToken, validate(createLogSchema)], activityLogController.createLog);

module.exports = router;
