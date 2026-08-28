const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/salesBookingController');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');

const auth = [authenticateToken, checkPermission('crm')];

router.get('/cart', auth, bookingController.getCart);
router.post('/cart', auth, bookingController.addToCart);
router.delete('/cart/:id', auth, bookingController.removeFromCart);

router.get('/', auth, bookingController.getBookings);
router.post('/', auth, bookingController.createBooking);
router.post('/:id/cancel', auth, bookingController.cancelBooking);
router.post('/:id/extend', auth, bookingController.extendBooking);

module.exports = router;
