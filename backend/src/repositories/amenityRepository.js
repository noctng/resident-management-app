const prisma = require('../config/prisma');

// Chỉ chứa prisma query thuần — KHÔNG logic nghiệp vụ (Clean Architecture rule).
// Mọi hàm trả về dữ liệu từ model `amenity_usage`, `residents`, `apartments`.

// GET /api/amenity/amenity-usage — list mọi lượt sử dụng tiện ích (mới nhất trước)
async function listAllUsage() {
  return prisma.amenity_usage.findMany({
    include: {
      residents: { select: { name: true } },
    },
    orderBy: [{ usage_date: 'desc' }, { start_time: 'desc' }],
  });
}

// Kiểm tra cư dân có được phép đặt (can_use_amenities) khi tạo booking
async function findResidentById(residentId) {
  return prisma.residents.findUnique({
    where: { id: residentId },
    select: { can_use_amenities: true, name: true },
  });
}

// Lấy 1 booking kèm apartment + occupancies (phục vụ check quyền resident)
async function findUsageById(id) {
  return prisma.amenity_usage.findUnique({
    where: { id },
    include: {
      apartments: {
        include: {
          occupancies: true,
        },
      },
    },
  });
}

// CREATE booking — include residents để map DTO (giữ nguyên shape controller cũ)
async function createUsage(data) {
  return prisma.amenity_usage.create({
    data,
    include: { residents: { select: { name: true } } },
  });
}

// UPDATE booking — include residents để map DTO
async function updateUsage(id, data) {
  return prisma.amenity_usage.update({
    where: { id },
    data,
    include: { residents: { select: { name: true } } },
  });
}

async function deleteUsage(id) {
  return prisma.amenity_usage.delete({ where: { id } });
}

// EXPORT — lấy usages trong khoảng tháng + toàn bộ apartments
async function findByDateRange(startDate, endDate) {
  return prisma.amenity_usage.findMany({
    where: {
      usage_date: {
        gte: startDate,
        lt: endDate,
      },
    },
    include: {
      apartments: { select: { code: true } },
      residents: { select: { name: true } },
    },
    orderBy: [{ apartments: { code: 'asc' } }, { usage_date: 'asc' }],
  });
}

async function listApartments() {
  return prisma.apartments.findMany({
    orderBy: { code: 'asc' },
    select: { id: true, code: true },
  });
}

module.exports = {
  listAllUsage,
  findResidentById,
  findUsageById,
  createUsage,
  updateUsage,
  deleteUsage,
  findByDateRange,
  listApartments,
};
