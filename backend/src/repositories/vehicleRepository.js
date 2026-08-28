const prisma = require('../config/prisma');

// Chỉ chứa prisma query thuần — KHÔNG logic nghiệp vụ (Clean Architecture rule).
// Mọi hàm trả về dữ liệu từ model `vehicles`.

// GET /api/vehicles — list với owner info (apartment + occupant OWNER)
async function listAll() {
  return prisma.vehicles.findMany({
    include: {
      apartments: {
        include: {
          occupancies: {
            where: { residents: { relationship_status: 'OWNER' } },
            include: { residents: true },
          },
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });
}

// GET /api/vehicles/apartment/:apartmentId — list theo căn hộ
async function listByApartment(apartmentId) {
  return prisma.vehicles.findMany({
    where: { apartment_id: apartmentId },
    orderBy: { created_at: 'desc' },
  });
}

async function findById(id) {
  return prisma.vehicles.findUnique({ where: { id } });
}

async function findByLicensePlate(licensePlate) {
  return prisma.vehicles.findUnique({ where: { license_plate: licensePlate } });
}

// Tìm bản ghi trùng biển số nhưng KHÔNG PHẢI bản ghi đang sửa (update)
async function findDuplicate(licensePlate, excludeId) {
  return prisma.vehicles.findFirst({
    where: { license_plate: licensePlate, NOT: { id: excludeId } },
  });
}

async function create(data) {
  return prisma.vehicles.create({ data });
}

async function update(id, data) {
  return prisma.vehicles.update({ where: { id }, data });
}

async function remove(id) {
  return prisma.vehicles.delete({ where: { id } });
}

module.exports = {
  listAll,
  listByApartment,
  findById,
  findByLicensePlate,
  findDuplicate,
  create,
  update,
  remove,
};
