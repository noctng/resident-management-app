const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { createUserSchema, updateUserSchema } = require('../schemas/authAndUserSchemas');

router.get('/', [authenticateToken, checkPermission('users')], userController.getAllUsers);
router.post(
    '/',
    [authenticateToken, checkPermission('users'), validate(createUserSchema)],
    userController.createUser
);
router.put(
    '/:id',
    [authenticateToken, checkPermission('users'), validate(updateUserSchema)],
    userController.updateUser
);
router.delete('/:id', [authenticateToken, checkPermission('users')], userController.deleteUser);

// Reset password route (Admin only via frontend check)
router.post(
    '/:id/reset-password',
    [authenticateToken, checkPermission('users')],
    userController.resetPassword
);

// Gán vai trò RBAC (1 user nhiều vai trò) — chỉ Admin/Manager
router.put(
    '/:id/roles',
    [authenticateToken, checkPermission('users')],
    userController.updateUserRoles
);

module.exports = router;
