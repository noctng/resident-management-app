const repo = require('../repositories/occupancyRepository');

// Map entity (snake_case từ Prisma) → DTO (camelCase trả frontend).
function toDTO(o) {
  return { apartmentId: o.apartment_id, residentId: o.resident_id };
}

// GET /api/occupancies — trả mảng DTO { apartmentId, residentId }
async function getOccupancies() {
  const list = await repo.listAll();
  return list.map(toDTO);
}

// POST /api/occupancies — tạo occupancy mới
async function addOccupancy(dto) {
  const { apartmentId, residentId } = dto || {};

  if (!apartmentId || !residentId) {
    const err = new Error('Vui lòng cung cấp apartmentId và residentId.');
    err.status = 400;
    throw err;
  }

  await repo.create({
    apartment_id: apartmentId,
    resident_id: residentId,
  });
}

// DELETE /api/occupancies/:apartmentId/:residentId — xóa occupancy
async function removeOccupancy(apartmentId, residentId) {
  await repo.remove(apartmentId, residentId);
}

module.exports = { getOccupancies, addOccupancy, removeOccupancy };
