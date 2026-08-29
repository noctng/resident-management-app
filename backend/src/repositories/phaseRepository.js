const prisma = require('../config/prisma');

// Chỉ chứa prisma query thuần — KHÔNG logic nghiệp vụ (Clean Architecture rule).
// Model: project_phases (phân khu dự án). KHÔNG đổi schema/column.

// GET /api/phases — list tất cả phân khu, sắp xếp display_order → created_at.
async function listAll() {
  return prisma.project_phases.findMany({
    orderBy: [{ display_order: 'asc' }, { created_at: 'asc' }],
  });
}

// Đếm số căn hộ theo phase_code (groupBy) để enrich apartment_count realtime.
async function countApartmentsByPhaseCode() {
  return prisma.apartments.groupBy({
    by: ['phase_code'],
    _count: { id: true },
  });
}

// Tìm phân khu theo phase_code (kiểm tra trùng khi tạo).
async function findByCode(phaseCode) {
  return prisma.project_phases.findUnique({ where: { phase_code: phaseCode } });
}

// Tìm phân khu theo id.
async function findById(id) {
  return prisma.project_phases.findUnique({ where: { id } });
}

async function create(data) {
  return prisma.project_phases.create({ data });
}

async function update(id, data) {
  return prisma.project_phases.update({ where: { id }, data });
}

// Đếm căn hộ trực thuộc 1 phase_code (dùng khi xóa để chặn nếu có căn hộ).
async function countApartments(phaseCode) {
  return prisma.apartments.count({ where: { phase_code: phaseCode } });
}

async function remove(id) {
  return prisma.project_phases.delete({ where: { id } });
}

module.exports = {
  listAll,
  countApartmentsByPhaseCode,
  findByCode,
  findById,
  create,
  update,
  countApartments,
  remove,
};
