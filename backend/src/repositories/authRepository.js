const prisma = require('../config/prisma');

// Auth Repository — chỉ Prisma query thuần
module.exports = {
  findUserByUsername: (username) => prisma.users.findUnique({ where: { username } }),

  findUserById: (id) =>
    prisma.users.findUnique({
      where: { id },
      select: { id: true, username: true, role: true, permissions: true },
    }),

  findResidentByPhone: (phone) => prisma.residents.findFirst({ where: { phone_number: phone?.trim() } }),

  findResidentById: (id) =>
    prisma.residents.findUnique({
      where: { id },
      include: {
        occupancies: { include: { apartments: { select: { id: true, code: true } } } },
      },
    }),

  findResidentAccount: (resident_id) => prisma.resident_accounts.findUnique({ where: { resident_id } }),

  findOccupancies: (resident_id) =>
    prisma.occupancies.findMany({
      where: { resident_id },
      include: { apartments: { select: { id: true, code: true } } },
    }),

  updateResidentPassword: (resident_id, password_hash) =>
    prisma.resident_accounts.update({ where: { resident_id }, data: { password_hash } }),

  updateUserPassword: (id, password_hash) =>
    prisma.users.update({ where: { id }, data: { password_hash } }),

  findUserByIdRaw: (id) => prisma.users.findUnique({ where: { id } }),
};
