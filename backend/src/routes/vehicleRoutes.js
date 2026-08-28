const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { authenticateToken, isManagerOrAdmin } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { vehicleSchema, updateVehicleSchema } = require('../schemas/featureSchemas');

router.get('/', [authenticateToken, isManagerOrAdmin], vehicleController.getVehicles);
router.get('/apartment/:apartmentId', authenticateToken, vehicleController.getVehiclesByApartment);
router.post('/register', authenticateToken, vehicleController.registerResidentVehicle);
router.post('/', [authenticateToken, isManagerOrAdmin, validate(vehicleSchema)], vehicleController.createVehicle);
router.put('/:id', [authenticateToken, isManagerOrAdmin, validate(updateVehicleSchema)], vehicleController.updateVehicle);
router.delete('/:id', [authenticateToken, isManagerOrAdmin], vehicleController.deleteVehicle);

module.exports = router;
