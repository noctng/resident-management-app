const service = require('../services/pricebookService');
const prisma = require('../config/prisma');

exports.getPricebooks = async (req, res) => {
  try {
    const result = await service.getPricebooks(req.query);
    res.json(result);
  } catch (err) {
    console.error('Lỗi lấy danh sách bảng giá:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPricebookById = async (req, res) => {
  try {
    const result = await service.getPricebookById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    console.error('Lỗi lấy chi tiết bảng giá:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createPricebook = async (req, res) => {
  try {
    const result = await service.createPricebook(req.body, prisma, req.user);
    if (!result.success) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    console.error('Lỗi tạo bảng giá:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updatePricebook = async (req, res) => {
  try {
    const result = await service.updatePricebook(req.params.id, req.body, prisma);
    if (!result.success) {
      const status = result.message.includes('Không tìm thấy') ? 404 : 400;
      return res.status(status).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error('Lỗi cập nhật bảng giá:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.approvePricebook = async (req, res) => {
  try {
    const result = await service.approvePricebook(req.params.id, req.body, prisma, req.user);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    console.error('Lỗi phê duyệt bảng giá:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deletePricebook = async (req, res) => {
  try {
    const result = await service.deletePricebook(req.params.id);
    if (!result.success) {
      const status = result.message.includes('Không tìm thấy') ? 404 : 400;
      return res.status(status).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error('Lỗi xóa bảng giá:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
