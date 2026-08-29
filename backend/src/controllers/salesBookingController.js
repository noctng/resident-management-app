const service = require('../services/salesBookingService');
const prisma = require('../config/prisma');

// Cart operations
exports.getCart = async (req, res) => {
  try {
    const result = await service.getCart(req, prisma);
    res.json(result);
  } catch (err) {
    console.error('Lỗi lấy giỏ hàng:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const result = await service.addToCart(req.body, req, prisma);
    if (!result.success) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    console.error('Lỗi thêm giỏ hàng:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports['removeFromCart'] = async (req, res) => {
  try {
    const result = await service.removeFromCart(req.params.id);
    res.json(result);
  } catch (err) {
    console.error('Lỗi xóa giỏ hàng:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Booking operations
exports.getBookings = async (req, res) => {
  try {
    const result = await service.getBookings(req.query);
    res.json(result);
  } catch (err) {
    console.error('Lỗi lấy danh sách giữ chỗ:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createBooking = async (req, res) => {
  try {
    const result = await service.createBooking({ ...req.body, user: req.user }, prisma);
    if (!result.success) return res.status(result.message.includes('đều') ? 400 : 500).json({ success: false, message: result.message });
    res.status(201).json(result);
  } catch (err) {
    console.error('Lỗi tạo giữ chỗ:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const result = await service.cancelBooking({ id: req.params.id, reason: req.body.reason, user: req.user }, prisma);
    res.json(result);
  } catch (err) {
    console.error('Lỗi hủy giữ chỗ:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.extendBooking = async (req, res) => {
  try {
    const result = await service.extendBooking({ id: req.params.id, user: req.user, extra_days: req.body.extra_days, notes: req.body.notes }, prisma);
    res.json(result);
  } catch (err) {
    console.error('Lỗi gia hạn giữ chỗ:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};