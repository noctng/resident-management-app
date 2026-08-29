const service = require('../services/reportService');

exports.exportUnifiedBilling = async (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) {
    return res.status(400).json({ message: 'Thiếu thông tin tháng/năm' });
  }
  try {
    await service.exportUnifiedBilling(res, month, year);
  } catch (error) {
    console.error('Export Unified Billing Error:', error);
    res.status(500).json({ message: 'Lỗi xuất báo cáo tổng hợp' });
  }
};

exports.exportResidents = async (req, res) => {
  try {
    await service.exportResidents(res);
  } catch (error) {
    console.error('Export Residents Error:', error);
    res.status(500).json({ message: 'Lỗi xuất báo cáo cư dân' });
  }
};

exports.exportApartments = async (req, res) => {
  try {
    await service.exportApartments(res);
  } catch (error) {
    console.error('Export Apartments Error:', error);
    res.status(500).json({ message: 'Lỗi xuất báo cáo căn hộ' });
  }
};

exports.exportUtility = async (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) {
    return res.status(400).json({ message: 'Thiếu thông tin tháng/năm' });
  }
  try {
    await service.exportUtility(res, month, year);
  } catch (error) {
    console.error('Export Utility Error:', error);
    res.status(500).json({ message: 'Lỗi xuất báo cáo điện nước' });
  }
};

exports.exportContracts = async (req, res) => {
  try {
    await service.exportContracts(res);
  } catch (error) {
    console.error('Export Contracts Error:', error);
    res.status(500).json({ message: 'Lỗi xuất báo cáo hợp đồng' });
  }
};

exports.getRevenueReport = async (req, res) => {
  const { period, year, month, quarter } = req.query;
  if (!period || !year) {
    return res.status(400).json({ message: 'Thiếu thông tin period/year' });
  }
  if (period === 'month' && !month) {
    return res.status(400).json({ message: 'Thiếu thông tin tháng' });
  }
  if (period === 'quarter' && !quarter) {
    return res.status(400).json({ message: 'Thiếu thông tin quý' });
  }
  if (!['month', 'quarter', 'year'].includes(period)) {
    return res.status(400).json({ message: 'Period không hợp lệ (month/quarter/year)' });
  }
  try {
    const result = await service.getRevenueReport(period, year, month, quarter);
    res.json(result);
  } catch (error) {
    console.error('Get Revenue Report Error:', error);
    res.status(500).json({ message: 'Lỗi lấy báo cáo doanh thu', error: error.message });
  }
};

exports.exportRevenueReport = async (req, res) => {
  const { period, year, month, quarter } = req.body;
  if (!period || !year) {
    return res.status(400).json({ message: 'Thiếu thông tin period/year' });
  }
  if (period === 'month' && !month) {
    return res.status(400).json({ message: 'Thiếu thông tin tháng' });
  }
  if (period === 'quarter' && !quarter) {
    return res.status(400).json({ message: 'Thiếu thông tin quý' });
  }
  if (!['month', 'quarter', 'year'].includes(period)) {
    return res.status(400).json({ message: 'Period không hợp lệ' });
  }
  try {
    await service.exportRevenueReport(res, period, year, month, quarter);
  } catch (error) {
    console.error('Export Revenue Report Error:', error);
    res.status(500).json({ message: 'Lỗi xuất báo cáo doanh thu', error: error.message });
  }
};
