const prisma = require('../config/prisma');

// Chỉ chứa prisma query thuần — KHÔNG logic nghiệp vụ (Clean Architecture rule).
// Mọi hàm trả về dữ liệu từ model `apartments`.

// GET /api/apartments — list (where được build ở service, ở đây chỉ chứa query + include + orderBy)
async function listAll(where = {}) {
  return prisma.apartments.findMany({
    where,
    orderBy: [
      { phase_code: 'asc' },
      { block_code: 'asc' },
      { code: 'asc' },
    ],
    include: {
      occupancies: {
        include: {
          residents: {
            select: {
              id: true,
              name: true,
              phone_number: true,
              relationship_status: true,
              email: true,
              is_active: true,
            },
          },
        },
      },
      contracts: {
        select: {
          id: true,
          contract_code: true,
          status: true,
          customer_id: true,
          total_value: true,
          customers: {
            select: { id: true, name: true, phone_number: true },
          },
        },
      },
    },
  });
}

async function findById(id, include = {}) {
  return prisma.apartments.findUnique({ where: { id }, include });
}

async function findByCode(code) {
  return prisma.apartments.findUnique({ where: { code } });
}

async function create(data) {
  return prisma.apartments.create({ data });
}

async function update(id, data) {
  return prisma.apartments.update({ where: { id }, data });
}

async function remove(id) {
  return prisma.apartments.delete({ where: { id } });
}

module.exports = {
  listAll,
  findById,
  findByCode,
  create,
  update,
  remove,
};
