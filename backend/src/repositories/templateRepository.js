const prisma = require('../config/prisma');

// Template Repository — chỉ Prisma query thuần
module.exports = {
  findAll: () => prisma.email_templates.findMany({ orderBy: { code: 'asc' } }),
  update: (code, data) => prisma.email_templates.update({ where: { code }, data }),
};
