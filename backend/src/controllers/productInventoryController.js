const service = require('../services/productInventoryService');

exports.getSalesMatrix = async (req, res) => {
  try {
    const result = await service.getSalesMatrix(req.query);
    res.json(result);
  } catch (err) {
    console.error('Lỗi lấy ma trận bán hàng:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProductDetail = async (req, res) => {
  try {
    const result = await service.getProductDetail(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    console.error('Lỗi lấy chi tiết sản phẩm:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createProductUnit = async (req, res) => {
  try {
    const result = await service.createProductUnit(req.body, req.user);
    if (!result.success) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    console.error('Lỗi thêm sản phẩm:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateProductUnit = async (req, res) => {
  try {
    const result = await service.updateProductUnit(req.params.id, req.body, req.user);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    console.error('Lỗi cập nhật sản phẩm:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteProductUnit = async (req, res) => {
  try {
    const result = await service.deleteProductUnit(req.params.id, req.user);
    if (!result.success) {
      const status = result.message.includes('Không tìm thấy') ? 404 : 400;
      return res.status(status).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error('Lỗi xóa sản phẩm:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.batchUpdateStatus = async (req, res) => {
  try {
    const result = await service.batchUpdateStatus(req.body.unit_ids, req.body.sales_status, req.user);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error('Lỗi cập nhật hàng loạt:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
