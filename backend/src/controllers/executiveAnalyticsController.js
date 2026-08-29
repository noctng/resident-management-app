const service = require('../services/executiveAnalyticsService');

exports.getOverview = async (req, res) => {
  try {
    const { phase, year = new Date().getFullYear() } = req.query;
    const data = await service.getOverview(phase, year);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Lỗi tổng quan điều hành:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSalesFunnel = async (req, res) => {
  try {
    const { phase } = req.query;
    const data = await service.getSalesFunnel(phase);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('Lỗi phễu bán hàng:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getFinancialAging = async (req, res) => {
  try {
    const { phase } = req.query;
    const data = await service.getFinancialAging(phase);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('Lỗi phân tích tuổi nợ:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getOperationsSla = async (req, res) => {
  try {
    const { phase } = req.query;
    const data = await service.getOperationsSla(phase);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('Lỗi phân tích vận hành SLA:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCommunityOccupancy = async (req, res) => {
  try {
    const { phase } = req.query;
    const data = await service.getCommunityOccupancy(phase);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('Lỗi phân tích cư dân đô thị:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.exportExecutiveReport = async (req, res) => {
  try {
    await service.exportExecutiveReport(res);
  } catch (err) {
    console.error('Lỗi xuất Excel điều hành:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
