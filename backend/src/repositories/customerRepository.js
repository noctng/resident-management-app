const prisma = require('../config/prisma');

// Customer Repository — chỉ Prisma query thuần
module.exports = {
  findAll: () => prisma.customers.findMany({ orderBy: { created_at: 'desc' } }),

  findById: (id) =>
    prisma.customers.findUnique({
      where: { id },
      include: {
        contracts: { include: { apartments: true } },
      },
    }),

  create: (data) => prisma.customers.create({ data }),

  findRawById: (id) => prisma.customers.findUnique({ where: { id } }),

  update: (id, data) =>
    prisma.customers.update({
      where: { id },
      data: { ...data, updated_at: new Date() },
    }),
};
