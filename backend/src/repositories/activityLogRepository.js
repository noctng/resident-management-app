const prisma = require('../config/prisma');

// Activity Log Repository — chỉ Prisma query thuần
module.exports = {
  countLogs: (where) => prisma.activity_logs.count({ where }),
  findLogs: (where, limit, offset) =>
    prisma.activity_logs.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    }),
  findUsers: () => prisma.users.findMany({ select: { id: true, username: true, role: true }, orderBy: { username: 'asc' } }),
  findActions: () =>
    prisma.activity_logs.findMany({ select: { action: true }, distinct: ['action'], where: { action: { not: null } } }),
  findTargetTypes: () =>
    prisma.activity_logs.findMany({ select: { target_type: true }, distinct: ['target_type'], where: { target_type: { not: null } } }),
  createLog: (data) => prisma.activity_logs.create({ data }),
};
