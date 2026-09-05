const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const contractLifecycleController = require('../controllers/contractLifecycleController');
const handoverController = require('../controllers/handoverController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const auth = [authenticateToken, checkPermission('crm')];

// Stats (must be before /:id to avoid conflict)
router.get('/stats', auth, contractController.getCrmStats);

router.get('/', auth, contractController.getAllContracts);
router.post('/', auth, contractController.createContract);
router.get('/:id', auth, contractController.getContractById);
router.put('/:id', auth, contractController.updateContract);

// Payment management
router.post('/payments', auth, contractController.addPayment);
router.put('/payments/:id', auth, contractController.updatePaymentStatus);

// Document management
router.post('/:id/documents', auth, upload.single('file'), contractController.uploadContractDocument);
router.get('/:id/documents', auth, contractController.getContractDocuments);

// Transfer
router.post('/:id/transfer', auth, contractController.transferContract);
router.get('/:id/history/transfers', auth, contractController.getContractTransferHistory);

// Email notifications
router.post('/payments/:id/remind', auth, contractController.sendPaymentReminder);
router.get('/payments/:id/preview-remind', auth, contractController.previewPaymentReminder);
router.post('/:id/notify', auth, contractController.sendContractNotification);

// Restructure
router.post('/:id/restructure', auth, contractController.restructureContractPayments);

// Lifecycle & Handover routes
router.get('/:id/lifecycle/history', auth, contractLifecycleController.getLifecycleHistory);
router.post('/:id/lifecycle/events', auth, contractLifecycleController.addManualEvent);

router.get('/:id/handover/checklist', auth, handoverController.getHandoverChecklist);
router.put('/:id/handover/checklist/:itemId', auth, handoverController.updateChecklistItem);
router.get('/:id/handover/eligibility', auth, handoverController.checkHandoverEligibility);
router.post('/:id/handover/complete', auth, handoverController.completeHandover);

module.exports = router;
