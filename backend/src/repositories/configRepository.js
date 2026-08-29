const prisma = require('../config/prisma');

// Config Repository — chỉ Prisma query thuần cho system_settings
module.exports = {
  findByKeys: (keys) => prisma.system_settings.findMany({ where: { key: { in: keys } } }),

  findByKey: (key) => prisma.system_settings.findUnique({ where: { key } }),

  findByPrefix: (prefix) => prisma.system_settings.findMany({ where: { key: { startsWith: prefix } } }),

  upsert: (key, value, description) =>
    prisma.system_settings.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value), description },
    }),

  deleteMany: (keys) => prisma.system_settings.deleteMany({ where: { key: { in: keys } } }),
};
