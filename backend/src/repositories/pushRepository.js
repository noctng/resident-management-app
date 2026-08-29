const prisma = require('../config/prisma');

// Push Repository — chỉ Prisma query thuần
module.exports = {
  findByEndpoint: (endpoint) => prisma.push_subscriptions.findUnique({ where: { endpoint } }),
  update: (endpoint, data) => prisma.push_subscriptions.update({ where: { endpoint }, data }),
  create: (data) => prisma.push_subscriptions.create({ data }),
  deleteMany: (endpoint) => prisma.push_subscriptions.deleteMany({ where: { endpoint } }),
  countByUser: (userId) => prisma.push_subscriptions.count({ where: { user_id: userId } }),
};
