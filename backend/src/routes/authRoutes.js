const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const {
    loginSchema,
    residentLoginSchema,
    changeUserPasswordSchema,
    changeResidentPasswordSchema,
} = require('../schemas/authAndUserSchemas');

// Public routes
router.post('/login', validate(loginSchema), authController.login);
router.post('/resident-portal/login', validate(residentLoginSchema), authController.residentLogin);

// Protected routes
router.get('/auth/session', authenticateToken, authController.getSession);
router.post('/auth/logout', authController.logout);
router.post(
    '/users/change-password',
    [authenticateToken, validate(changeUserPasswordSchema)],
    authController.changeUserPassword
);
router.put(
    '/resident-portal/change-password/:residentId',
    [authenticateToken, validate(changeResidentPasswordSchema)],
    authController.changeResidentPassword
);

module.exports = router;
