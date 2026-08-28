const prisma = require('../config/prisma');

// Chỉ chứa prisma query thuần — KHÔNG logic nghiệp vụ (Clean Architecture rule).
// Mọi hàm trả về dữ liệu từ model `resident_feedback`.

const feedbackInclude = {
  residents: { select: { name: true } },
  apartments: { select: { code: true } },
  users: { select: { username: true } },
};

// GET /api/feedback — list tất cả, mới nhất trước
async function listAll() {
  return prisma.resident_feedback.findMany({
    include: feedbackInclude,
    orderBy: { submitted_at: 'desc' },
  });
}

// GET /api/feedback/apartment/:apartmentId — list theo căn hộ
async function listByApartment(apartmentId) {
  return prisma.resident_feedback.findMany({
    where: { apartment_id: apartmentId },
    include: feedbackInclude,
    orderBy: { submitted_at: 'desc' },
  });
}

async function getById(id) {
  return prisma.resident_feedback.findUnique({ where: { id }, include: feedbackInclude });
}

// CREATE — include residents+apartments để map DTO (giữ nguyên shape controller cũ)
async function create(data) {
  return prisma.resident_feedback.create({
    data,
    include: {
      residents: { select: { name: true } },
      apartments: { select: { code: true } },
    },
  });
}

async function update(id, data) {
  return prisma.resident_feedback.update({
    where: { id },
    data,
    include: feedbackInclude,
  });
}

async function remove(id) {
  return prisma.resident_feedback.delete({ where: { id } });
}

module.exports = {
  listAll,
  listByApartment,
  getById,
  create,
  update,
  remove,
};
