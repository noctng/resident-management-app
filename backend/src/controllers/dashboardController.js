const service = require('../services/dashboardService');

exports.getDashboardStats = async (req, res) => {
  try {
    const result = await service.getDashboardStats();
    res.json(result);
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ message: 'Lỗi lấy dữ liệu dashboard' });
  }
};
