const prisma = require('../config/prisma');

// Push Repository — chỉ Prisma query thuần
module.exports = {
  findByEndpoint: (endpoint) => prisma.push_subscriptions.findUnique({ where: { endpoint } }),
  update: (endpoint, data) => prisma.push_subscriptions.update({ where: { endpoint }, data }),
  create: (data) => prisma.push_subscriptions.create({ data }),
  deleteMany: (endpoint) => prisma.push_subscriptions.deleteMany({ where: { endpoint } }),
  countByUser: (userId) => prisma.push_subscriptions.count({ where: { user_id: userId } }),
  findByUser: (userId) => prisma.push_subscriptions.findMany({ where: { user_id: userId } }),
  findResidentIdsByApartment: (apartmentId) =>
    prisma.occupancies.findMany({ where: { apartment_id: apartmentId }, select: { resident_id: true } }),
  findByApartmentOrResidents: (apartmentId, residentIds) =>
    prisma.push_subscriptions.findMany({
      where: {
        OR: [
          { apartment_id: apartmentId },
          ...(residentIds.length > 0 ? [{ user_id: { in: residentIds } }] : []),
        ],
      },
    }),
  findResidentSubs: () => prisma.push_subscriptions.findMany({ where: { user_type: 'resident' } }),
  deleteById: (id) => prisma.push_subscriptions.delete({ where: { id } }),
};
