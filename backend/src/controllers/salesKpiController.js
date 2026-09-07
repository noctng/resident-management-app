const svc = require('../services/salesKpiService');

exports.getConversionFunnel = async (req, res) => {
  try {
    const result = await svc.getConversionFunnel(req.query);
    res.json(result);
  } catch (err) {
    console.error('Lỗi lấy phễu chuyển đổi sales:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getEmployeeKpiReport = async (req, res) => {
  try {
    const result = await svc.getEmployeeKpiReport(req.query);
    res.json(result);
  } catch (err) {
    console.error('Lỗi lấy báo cáo KPI nhân viên:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.exportSalesKpiExcel = async (req, res) => {
  try {
    await svc.exportSalesKpiExcel(res, req.query);
  } catch (err) {
    console.error('Lỗi xuát báo cáo KPI Excel:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
