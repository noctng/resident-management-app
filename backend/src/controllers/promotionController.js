const service = require('../services/promotionService');

exports.getPromotions = async (req, res) => {
  try {
    const result = await service.getPromotions(req.query);
    res.json(result);
  } catch (err) {
    console.error('Lỗi lấy danh sách chương trình ưu đãi:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createPromotion = async (req, res) => {
  try {
    const result = await service.createPromotion(req.body, req.user);
    if (!result.success) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (err) {
    console.error('Lỗi tạo chương trình ưu đãi:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updatePromotion = async (req, res) => {
  try {
    const result = await service.updatePromotion(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    console.error('Lỗi cập nhật ưu đãi:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.togglePromotionStatus = async (req, res) => {
  try {
    const result = await service.togglePromotionStatus(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    console.error('Lỗi đổi trạng thái ưu đãi:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.calculateDiscount = async (req, res) => {
  try {
    const { base_price, promotion_ids = [] } = req.body;
    const result = await service.calculateDiscount(base_price, promotion_ids);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error('Lỗi tính chiết khấu ưu đãi:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
