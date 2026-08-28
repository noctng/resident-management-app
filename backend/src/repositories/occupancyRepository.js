const prisma = require('../config/prisma');

// Chỉ chứa prisma query thuần — KHÔNG logic nghiệp vụ (Clean Architecture rule).
// Mọi hàm thao tác trên model `occupancies` (composite PK apartment_id + resident_id).

// GET /api/occupancies — toàn bộ bản ghi occupancy
async function listAll() {
  return prisma.occupancies.findMany();
}

// POST /api/occupancies — tạo mới 1 occupancy
async function create(data) {
  return prisma.occupancies.create({ data });
}

// DELETE /api/occupancies/:apartmentId/:residentId — xóa theo composite key
async function remove(apartmentId, residentId) {
  return prisma.occupancies.delete({
    where: {
      apartment_id_resident_id: {
        apartment_id: apartmentId,
        resident_id: residentId,
      },
    },
  });
}

module.exports = { listAll, create, remove };
