const prisma = require('../config/prisma');

// Chỉ chứa prisma query thuần — KHÔNG logic nghiệp vụ (Clean Architecture rule).
// Mọi hàm làm việc với model `utility_records`.

// GET /api/utility/utility-records — list tất cả, mới nhất (năm/tháng) trước
async function listAll() {
  return prisma.utility_records.findMany({
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
}

// GET /api/utility/utility-records/apartment/:apartmentId — list theo căn hộ
async function listByApartment(apartmentId) {
  return prisma.utility_records.findMany({
    where: { apartment_id: apartmentId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
}

async function findById(id) {
  return prisma.utility_records.findUnique({ where: { id } });
}

// Tìm bản ghi trùng kỳ (apartment_id + month + year) — unique composite key
async function findByApartmentMonthYear(apartmentId, month, year) {
  return prisma.utility_records.findUnique({
    where: {
      apartment_id_month_year: { apartment_id: apartmentId, month, year },
    },
  });
}

// Bản ghi gần nhất của căn hộ (để lấy chỉ số cũ làm old reading)
async function findLastByApartment(apartmentId) {
  return prisma.utility_records.findFirst({
    where: { apartment_id: apartmentId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
}

async function create(data) {
  return prisma.utility_records.create({ data });
}

async function updateById(id, data) {
  return prisma.utility_records.update({ where: { id }, data });
}

async function deleteById(id) {
  return prisma.utility_records.delete({ where: { id } });
}

// Recalculate: bản ghi UNPAID của kỳ hiện tại kèm electricity_type của căn hộ
async function findUnpaidByMonthYear(month, year) {
  return prisma.utility_records.findMany({
    where: { month, year, payment_status: 'UNPAID' },
    include: { apartments: { select: { electricity_type: true } } },
  });
}

module.exports = {
  listAll,
  listByApartment,
  findById,
  findByApartmentMonthYear,
  findLastByApartment,
  create,
  updateById,
  deleteById,
  findUnpaidByMonthYear,
};
