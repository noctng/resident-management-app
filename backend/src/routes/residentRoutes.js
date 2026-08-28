const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const residentController = require('../controllers/residentController');
const { authenticateToken, checkPermission, isAdmin } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { createResidentSchema, updateResidentSchema } = require('../schemas/coreSchemas');
const { auditLog } = require('../middleware/auditLogMiddleware');

// Resident Excel Template & Import
router.get('/residents/import/template', residentController.downloadResidentTemplate);
router.post(
    '/residents/import',
    [
        authenticateToken,
        checkPermission('residents'),
        upload.single('file'),
        auditLog('IMPORT_RESIDENTS', 'Resident', (req, resBody) => ({
            details: `Import danh sách cư dân từ file Excel (${resBody?.count || 0} bản ghi)`,
        })),
    ],
    residentController.importResidents
);

// Residents CRUD
router.get('/residents', authenticateToken, residentController.getAllResidents);
router.post(
    '/residents',
    [
        authenticateToken,
        checkPermission('residents'),
        validate(createResidentSchema),
        auditLog('CREATE_RESIDENT', 'Resident', (req, resBody) => ({
            targetId: resBody?.id,
            targetName: resBody?.name,
            details: `Thêm mới cư dân: "${resBody?.name}" (SĐT: ${resBody?.phoneNumber || resBody?.phone_number})`,
            newValue: req.body,
        })),
    ],
    residentController.createResident
);
router.put(
    '/residents/:id',
    [
        authenticateToken,
        checkPermission('residents'),
        validate(updateResidentSchema),
        auditLog('UPDATE_RESIDENT', 'Resident', (req, resBody) => ({
            targetId: req.params.id,
            targetName: resBody?.name,
            details: `Cập nhật thông tin cư dân: "${resBody?.name}"`,
            newValue: req.body,
        })),
    ],
    residentController.updateResident
);
router.delete(
    '/residents/:id',
    [
        authenticateToken,
        isAdmin,
        auditLog('DELETE_RESIDENT', 'Resident', (req) => ({
            targetId: req.params.id,
            details: `Xóa hồ sơ cư dân (ID: ${req.params.id})`,
        })),
    ],
    residentController.deleteResident
);
router.put(
    '/residents/:id/status',
    [
        authenticateToken,
        checkPermission('residents'),
        auditLog('UPDATE_RESIDENT_STATUS', 'Resident', (req, resBody) => ({
            targetId: req.params.id,
            targetName: resBody?.name,
            details: `Thay đổi trạng thái cư dân "${resBody?.name}" thành ${req.body?.isActive ? 'Hoạt động' : 'Tạm khóa'}`,
        })),
    ],
    residentController.updateResidentStatus
);
router.put(
    '/residents/:id/amenity-access',
    [
        authenticateToken,
        checkPermission('residents'),
        auditLog('UPDATE_AMENITY_ACCESS', 'Resident', (req, resBody) => ({
            targetId: req.params.id,
            targetName: resBody?.name,
            details: `Cập nhật quyền sử dụng tiện ích của "${resBody?.name}": ${req.body?.canUseAmenities ? 'Cho phép' : 'Chặn'}`,
        })),
    ],
    residentController.updateAmenityAccess
);

// Resident Accounts
router.get(
    '/resident-accounts',
    [authenticateToken, checkPermission('resident_accounts')],
    residentController.getAllResidentAccounts
);
router.post(
    '/resident-accounts/sync',
    [
        authenticateToken,
        checkPermission('resident_accounts'),
        auditLog('SYNC_RESIDENT_ACCOUNTS', 'ResidentAccount', () => ({
            details: 'Đồng bộ tạo tài khoản cho toàn bộ cư dân chưa có tài khoản',
        })),
    ],
    residentController.syncResidentAccounts
);
router.post(
    '/resident-accounts/:residentId/reset-password',
    [
        authenticateToken,
        checkPermission('resident_accounts'),
        auditLog('RESET_RESIDENT_PASSWORD', 'ResidentAccount', (req) => ({
            targetId: req.params.residentId,
            details: `Reset mật khẩu tài khoản cư dân (ID: ${req.params.residentId}) về mặc định (123456)`,
        })),
    ],
    residentController.resetResidentPassword
);

module.exports = router;
