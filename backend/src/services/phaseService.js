const repo = require('../repositories/phaseRepository');
const logger = require('../utils/logger'); // object form → spy được trong test
const crypto = require('crypto');

// Map kết quả groupBy apartments → { PHASE_CODE: count } (uppercase key).
function buildCountMap(aptCounts) {
  const countMap = {};
  aptCounts.forEach((c) => {
    if (c.phase_code) countMap[c.phase_code.toUpperCase()] = c._count.id;
  });
  return countMap;
}

// 1. Lấy danh sách phân khu + apartment_count realtime từ apartments.
async function getPhases() {
  const phases = await repo.listAll();
  const aptCounts = await repo.countApartmentsByPhaseCode();
  const countMap = buildCountMap(aptCounts);

  return phases.map((p) => ({
    ...p,
    apartment_count: countMap[p.phase_code.toUpperCase()] || 0,
  }));
}

// 2. Tạo phân khu (validate, chống trùng code, sinh id, ghi log).
async function createPhase(dto, user) {
  const { phase_code, phase_name, description, display_order = 0 } = dto;

  if (!phase_code || !phase_name) {
    const err = new Error('Vui lòng nhập Mã phân khu (viết tắt) và Tên phân khu');
    err.status = 400;
    throw err;
  }

  const cleanCode = phase_code.trim().toUpperCase().replace(/\s+/g, '_');

  const existing = await repo.findByCode(cleanCode);
  if (existing) {
    const err = new Error(`Mã phân khu "${cleanCode}" đã tồn tại trên hệ thống`);
    err.status = 400;
    throw err;
  }

  const phaseId = 'phase_' + crypto.randomBytes(4).toString('hex');
  const phase = await repo.create({
    id: phaseId,
    phase_code: cleanCode,
    phase_name: phase_name.trim(),
    description: description?.trim() || null,
    display_order: Number(display_order) || 0,
    is_active: true,
  });

  await logger.logActivity(
    user,
    'TẠO_PHÂN_KHU',
    'PROJECT_PHASE',
    phase.id,
    phase.phase_name,
    `Thêm phân khu dự án mới: ${phase.phase_name} (${phase.phase_code})`
  );

  return phase;
}

// 3. Cập nhật phân khu (chỉ set field khi được truyền, trim string).
async function updatePhase(id, dto, user) {
  const { phase_name, description, display_order, is_active } = dto;

  const existing = await repo.findById(id);
  if (!existing) {
    const err = new Error('Không tìm thấy phân khu');
    err.status = 404;
    throw err;
  }

  const updated = await repo.update(id, {
    phase_name: phase_name ? phase_name.trim() : existing.phase_name,
    description:
      description !== undefined ? description?.trim() : existing.description,
    display_order:
      display_order !== undefined ? Number(display_order) : existing.display_order,
    is_active: is_active !== undefined ? Boolean(is_active) : existing.is_active,
    updated_at: new Date(),
  });

  await logger.logActivity(
    user,
    'CẬP_NHẬT_PHÂN_KHU',
    'PROJECT_PHASE',
    updated.id,
    updated.phase_name,
    `Cập nhật thông tin phân khu: ${updated.phase_name}`
  );

  return updated;
}

// 4. Xóa phân khu (chặn nếu có căn hộ trực thuộc).
async function deletePhase(id, user) {
  const phase = await repo.findById(id);
  if (!phase) {
    const err = new Error('Không tìm thấy phân khu');
    err.status = 404;
    throw err;
  }

  const count = await repo.countApartments(phase.phase_code);
  if (count > 0) {
    const err = new Error(
      `Không thể xóa phân khu "${phase.phase_name}" vì đang có ${count} căn hộ trực thuộc. Bạn có thể chọn ẩn/vô hiệu hóa phân khu.`
    );
    err.status = 400;
    throw err;
  }

  await repo.remove(id);

  await logger.logActivity(
    user,
    'XÓA_PHÂN_KHU',
    'PROJECT_PHASE',
    phase.id,
    phase.phase_name,
    `Xóa phân khu ${phase.phase_name} (${phase.phase_code})`
  );

  return phase;
}

module.exports = {
  getPhases,
  createPhase,
  updatePhase,
  deletePhase,
};
