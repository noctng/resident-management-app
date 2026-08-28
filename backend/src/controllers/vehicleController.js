const svc = require('../services/vehicleService');

// GET /api/vehicles — List all vehicles with owner info
exports.getVehicles = async (req, res) => {
  try {
    const result = await svc.getVehicles();
    res.json(result);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách phương tiện.' });
  }
};

// POST /api/vehicles — Create a vehicle (Manager/Admin)
exports.createVehicle = async (req, res) => {
  try {
    const vehicle = await svc.createVehicle(req.body);
    res.status(201).json(vehicle);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi khi thêm phương tiện.' });
  }
};

// PUT /api/vehicles/:id — Update a vehicle (Manager/Admin)
exports.updateVehicle = async (req, res) => {
  try {
    const vehicle = await svc.updateVehicle(req.params.id, req.body);
    res.json(vehicle);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi khi cập nhật phương tiện.' });
  }
};

// DELETE /api/vehicles/:id — Delete a vehicle (Manager/Admin)
exports.deleteVehicle = async (req, res) => {
  try {
    await svc.deleteVehicle(req.params.id);
    res.json({ message: 'Đã xóa phương tiện.' });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ message: 'Lỗi khi xóa phương tiện.' });
  }
};

// GET /api/vehicles/apartment/:apartmentId — List vehicles for a specific apartment (Resident Portal)
exports.getVehiclesByApartment = async (req, res) => {
  try {
    const result = await svc.getVehiclesByApartment(req.params.apartmentId);
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      message: err.message || 'Lỗi khi lấy danh sách phương tiện căn hộ.',
    });
  }
};

// POST /api/vehicles/register — Resident registers a new vehicle online
exports.registerResidentVehicle = async (req, res) => {
  try {
    const vehicle = await svc.registerResidentVehicle(req.body);
    res.status(201).json({
      success: true,
      message: 'Đăng ký phương tiện thành công! Thẻ xe đang được BQL kích hoạt.',
      vehicle,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      message: err.message || 'Lỗi khi đăng ký phương tiện.',
    });
  }
};
