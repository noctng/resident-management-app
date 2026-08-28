const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const validate = require('../middleware/validate');
const { createFeedbackSchema, resolveFeedbackSchema } = require('../schemas/featureSchemas');

const { auditLog } = require('../middleware/auditLogMiddleware');

router.get(
    '/',
    [authenticateToken, checkPermission('feedback')],
    feedbackController.getAllFeedback
);
router.get('/apartment/:apartmentId', authenticateToken, feedbackController.getFeedbackByApartment);
// Note: Validation mostly for non-file fields. Multer runs before body validation.
router.post(
    '/',
    [
        authenticateToken,
        upload.array('imageData', 5),
        validate(createFeedbackSchema),
        auditLog('CREATE_FEEDBACK', 'Feedback', (req, resBody) => ({
            targetId: resBody?.id,
            details: `Gửi phản ánh mới: "${(resBody?.content || '').slice(0, 100)}"`,
        })),
    ],
    feedbackController.createFeedback
);
router.put(
    '/:id/resolve',
    [
        authenticateToken,
        checkPermission('feedback'),
        upload.array('adminResponseImageData', 5),
        validate(resolveFeedbackSchema),
        auditLog('RESOLVE_FEEDBACK', 'Feedback', (req, resBody) => ({
            targetId: req.params.id,
            details: `Ban quản lý xử lý phản ánh (ID: ${req.params.id}): "${(req.body?.adminResponseContent || '').slice(0, 100)}"`,
        })),
    ],
    feedbackController.resolveFeedback
);

module.exports = router;
