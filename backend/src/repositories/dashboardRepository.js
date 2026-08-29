const prisma = require('../config/prisma');

// Dashboard Repository — chỉ Prisma query thuần
module.exports = {
  getStats: () =>
    Promise.all([
      prisma.apartments.count(),
      prisma.residents.count(),
      prisma.occupancies.count(),
      prisma.resident_feedback.count({ where: { status: 'SUBMITTED' } }),
      prisma.resident_feedback.count({ where: { status: 'RESOLVED' } }),
    ]),
};
