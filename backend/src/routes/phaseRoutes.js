const express = require('express');
const router = express.Router();
const phaseController = require('../controllers/phaseController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// Phase management is admin-only (affects project structure and all apartments)
router.get('/', authenticateToken, phaseController.getPhases); // Staff can read phases
router.post('/', [authenticateToken, isAdmin], phaseController.createPhase);
router.put('/:id', [authenticateToken, isAdmin], phaseController.updatePhase);
router.delete('/:id', [authenticateToken, isAdmin], phaseController.deletePhase);

module.exports = router;
