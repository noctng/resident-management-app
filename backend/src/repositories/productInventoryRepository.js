const prisma = require('../config/prisma');

// ProductInventory Repository — chỉ Prisma query thuần
module.exports = {
  findUnits: (where) =>
    prisma.apartments.findMany({
      where,
      orderBy: [
        { phase_code: 'asc' },
        { block_code: 'asc' },
        { floor: 'asc' },
        { code: 'asc' },
      ],
      include: {
        contracts: {
          select: {
            id: true,
            contract_code: true,
            status: true,
            customer_id: true,
            customers: { select: { id: true, name: true, phone_number: true } },
          },
        },
        sales_bookings: {
          where: { status: 'ACTIVE' },
          select: { id: true, booking_code: true, expires_at: true, sales_person_id: true },
        },
      },
    }),

  findUnitByCodeOrId: (id) =>
    prisma.apartments.findFirst({
      where: { OR: [{ id }, { code: id }] },
      include: {
        contracts: { include: { customers: true, contract_payments: true } },
        sales_bookings: { where: { status: 'ACTIVE' } },
        deposit_receipts: { where: { status: 'ACTIVE' } },
        occupancies: { include: { residents: true } },
      },
    }),

  findUnitById: (id) => prisma.apartments.findUnique({ where: { id } }),

  findUnitByCode: (code) => prisma.apartments.findUnique({ where: { code } }),

  createUnit: (data) => prisma.apartments.create({ data }),

  updateUnit: (id, data) => prisma.apartments.update({ where: { id }, data }),

  deleteUnit: (id) => prisma.apartments.delete({ where: { id } }),

  // Safety check before delete
  findUnitForDelete: (id) =>
    prisma.apartments.findUnique({
      where: { id },
      include: {
        contracts: true,
        sales_bookings: { where: { status: 'ACTIVE' } },
        deposit_receipts: { where: { status: 'ACTIVE' } },
        occupancies: true,
      },
    }),

  batchUpdateStatus: (unit_ids, sales_status) =>
    prisma.apartments.updateMany({ where: { id: { in: unit_ids } }, data: { sales_status } }),
};
