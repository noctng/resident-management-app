const prisma = require('../config/prisma');

// Pricebook Repository — chỉ Prisma query thuần
module.exports = {
  findAll: (where) =>
    prisma.pricebooks.findMany({
      where,
      include: { _count: { select: { pricebook_items: true } } },
      orderBy: [{ version: 'desc' }, { created_at: 'desc' }],
    }),

  findById: (id) =>
    prisma.pricebooks.findUnique({
      where: { id },
      include: {
        pricebook_items: { include: { apartments: true }, orderBy: { apartments: { code: 'asc' } } },
      },
    }),

  findLastByPhase: (phase_code) =>
    prisma.pricebooks.findFirst({ where: { phase_code }, orderBy: { version: 'desc' } }),

  create: (data) => prisma.pricebooks.create({ data }),

  updateHeader: (id, data) =>
    prisma.pricebooks.update({
      where: { id },
      data: { ...data, updated_at: new Date() },
    }),

  deleteById: (id) => prisma.pricebooks.delete({ where: { id } }),

  findItems: (pricebook_id) => prisma.pricebook_items.findMany({ where: { pricebook_id } }),

  createManyItems: (data) => prisma.pricebook_items.createMany({ data }),

  upsertItem: (where, create, update) =>
    prisma.pricebook_items.upsert({ where, create, update }),

  updateManyStatus: (where, data) => prisma.pricebooks.updateMany({ where, data }),

  updateApartmentPrices: (id, data) => prisma.apartments.update({ where: { id }, data }),

  findUnitsByPhase: (phase_code) =>
    prisma.apartments.findMany({ where: phase_code !== 'ALL' ? { phase_code } : {} }),
};
