const svc = require('../services/phaseService');

// Controller MỎNG: parse req → gọi service → format response.
// KHÔNG import prisma trực tiếp (mọi DB query nằm ở repository/service).

// 1. GET /api/phases — danh sách phân khu (kèm apartment_count)
exports.getPhases = async (req, res) => {
  try {
    const phases = await svc.getPhases();
    res.json({ success: true, phases });
  } catch (err) {
    console.error('Lỗi lấy danh sách phân khu:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 2. POST /api/phases — tạo phân khu (admin)
exports.createPhase = async (req, res) => {
  try {
    const phase = await svc.createPhase(req.body, req.user);
    res.status(201).json({
      success: true,
      message: `Đã thêm phân khu ${phase.phase_name} thành công!`,
      phase,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

// 3. PUT /api/phases/:id — cập nhật phân khu (admin)
exports.updatePhase = async (req, res) => {
  try {
    const phase = await svc.updatePhase(req.params.id, req.body, req.user);
    res.json({
      success: true,
      message: 'Cập nhật phân khu thành công!',
      phase,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

// 4. DELETE /api/phases/:id — xóa/vô hiệu hóa phân khu (admin)
exports.deletePhase = async (req, res) => {
  try {
    const phase = await svc.deletePhase(req.params.id, req.user);
    res.json({
      success: true,
      message: `Đã xóa phân khu ${phase.phase_name} thành công!`,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message });
  }
};
