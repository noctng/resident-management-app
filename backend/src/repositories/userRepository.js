const prisma = require('../config/prisma');

// User Repository — chỉ Prisma query thuần
module.exports = {
  findAll: () =>
    prisma.users.findMany({
      select: { id: true, username: true, role: true, permissions: true, created_at: true, userRoles: { select: { roles: true } } },
      orderBy: { username: 'asc' },
    }),

  findByUsername: (username) => prisma.users.findUnique({ where: { username } }),

  findById: (id) =>
    prisma.users.findUnique({
      where: { id },
      select: { id: true, username: true, role: true, permissions: true },
    }),

  findByIdRaw: (id) => prisma.users.findUnique({ where: { id } }),

  create: (data) =>
    prisma.users.create({
      data,
      select: { id: true, username: true, role: true, permissions: true },
    }),

  update: (id, data) =>
    prisma.users.update({
      where: { id },
      data,
      select: { id: true, username: true, role: true, permissions: true },
    }),

  delete: (id) => prisma.users.delete({ where: { id } }),

  updatePassword: (id, password_hash) =>
    prisma.users.update({ where: { id }, data: { password_hash } }),
};
