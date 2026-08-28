const express = require('express');
const router = express.Router();
const apartmentController = require('../controllers/apartmentController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { createApartmentSchema, updateApartmentSchema } = require('../schemas/coreSchemas');
const upload = require('../middleware/uploadMiddleware');

// Apartment Excel Template & Import
router.get('/import/template', apartmentController.downloadApartmentTemplate);
router.post(
    '/import',
    [authenticateToken, checkPermission('apartments'), upload.single('file')],
    apartmentController.importApartments
);

router.get('/', authenticateToken, apartmentController.getAllApartments);
router.post(
    '/',
    [authenticateToken, checkPermission('apartments'), validate(createApartmentSchema)],
    apartmentController.createApartment
);
router.put(
    '/:id',
    [authenticateToken, checkPermission('apartments'), validate(updateApartmentSchema)],
    apartmentController.updateApartment
);

module.exports = router;
