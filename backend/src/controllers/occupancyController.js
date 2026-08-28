const svc = require('../services/occupancyService');

// GET /api/occupancies — List all occupancies
exports.getAllOccupancies = async (req, res) => {
  try {
    const result = await svc.getOccupancies();
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi máy chủ' });
  }
};

// POST /api/occupancies — Create an occupancy
exports.addOccupancy = async (req, res) => {
  try {
    await svc.addOccupancy(req.body);
    res.status(201).json(req.body);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi máy chủ' });
  }
};

// DELETE /api/occupancies/:apartmentId/:residentId — Remove an occupancy
exports.removeOccupancy = async (req, res) => {
  try {
    await svc.removeOccupancy(req.params.apartmentId, req.params.residentId);
    res.status(204).send();
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi máy chủ' });
  }
};
