const service = require('../services/activityLogService');

exports.getAllLogs = async (req, res) => {
  try {
    const result = await service.getAllLogs(req.query);
    res.json(result);
  } catch (err) {
    console.error('Error fetching activity logs:', err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

exports.getLogFilters = async (req, res) => {
  try {
    const result = await service.getLogFilters();
    res.json(result);
  } catch (err) {
    console.error('Error fetching log filters:', err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

exports.createLog = async (req, res) => {
  try {
    const result = await service.createLog(req);
    res.status(201).json(result);
  } catch (err) {
    console.error('Error saving log:', err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};
