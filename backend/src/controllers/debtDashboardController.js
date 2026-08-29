const service = require('../services/debtDashboardService');

// Get apartment debt summary using the view
exports.getApartmentDebtSummary = async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const rows = await service.getApartmentDebtSummary(limit);
    res.json(rows);
  } catch (error) {
    console.error('Error getting apartment debt summary:', error);
    res.status(500).json({ error: 'Failed to get apartment debt summary' });
  }
};

// Get monthly revenue summary using the view
exports.getMonthlyRevenueSummary = async (req, res) => {
  try {
    const { limit = 12 } = req.query;
    const rows = await service.getMonthlyRevenueSummary(limit);
    res.json(rows);
  } catch (error) {
    console.error('Error getting monthly revenue summary:', error);
    res.status(500).json({ error: 'Failed to get monthly revenue summary' });
  }
};

// Get overall statistics
exports.getOverallStats = async (req, res) => {
  try {
    const stats = await service.getOverallStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting overall stats:', error);
    res.status(500).json({ error: 'Failed to get overall stats' });
  }
};

// Get top debtors (apartments with highest debt)
exports.getTopDebtors = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const rows = await service.getTopDebtors(limit);
    res.json(rows);
  } catch (error) {
    console.error('Error getting top debtors:', error);
    res.status(500).json({ error: 'Failed to get top debtors' });
  }
};

// Get payment trends (last 12 months)
exports.getPaymentTrends = async (req, res) => {
  try {
    const rows = await service.getPaymentTrends();
    res.json(rows);
  } catch (error) {
    console.error('Error getting payment trends:', error);
    res.status(500).json({ error: 'Failed to get payment trends' });
  }
};

// Get debt heatmap data (by building and floor)
exports.getDebtHeatmap = async (req, res) => {
  try {
    const rows = await service.getDebtHeatmap();
    res.json(rows);
  } catch (error) {
    console.error('Error getting debt heatmap:', error);
    res.status(500).json({ error: 'Failed to get debt heatmap' });
  }
};

// Get recent payment activities
exports.getRecentPayments = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const rows = await service.getRecentPayments(limit);
    res.json(rows);
  } catch (error) {
    console.error('Error getting recent payments:', error);
    res.status(500).json({ error: 'Failed to get recent payments' });
  }
};
