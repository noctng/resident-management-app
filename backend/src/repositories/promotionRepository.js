const prisma = require('../config/prisma');

// Promotion Repository — chỉ Prisma query thuần
module.exports = {
  findAll: (where) =>
    prisma.promotions.findMany({
      where,
      include: { _count: { select: { contract_promotions: true } } },
      orderBy: { created_at: 'desc' },
    }),

  create: (data) => prisma.promotions.create({ data }),

  update: (id, data) =>
    prisma.promotions.update({
      where: { id },
      data: { ...data, updated_at: new Date() },
    }),

  findById: (id) => prisma.promotions.findUnique({ where: { id } }),

  updateStatus: (id, status) =>
    prisma.promotions.update({ where: { id }, data: { status, updated_at: new Date() } }),

  findActiveByIds: (ids) =>
    prisma.promotions.findMany({ where: { id: { in: ids }, status: 'ACTIVE' } }),
};
