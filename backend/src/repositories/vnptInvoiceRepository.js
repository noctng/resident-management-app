const prisma = require('../config/prisma');

// VNPT Invoice Repository — chỉ Prisma query thuần
module.exports = {
  findUtilityById: (id) =>
    prisma.utility_records.findUnique({
      where: { id },
      include: { apartments: { include: { occupancies: { include: { residents: true } } } } },
    }),

  findApartmentById: (id) =>
    prisma.apartments.findUnique({
      where: { id },
      include: { occupancies: { include: { residents: true } } },
    }),

  findApartmentByCode: (code) =>
    prisma.apartments.findUnique({
      where: { code },
      include: { occupancies: { include: { residents: true } } },
    }),

  findUtilityByApartment: (apartmentId, month, year) =>
    prisma.utility_records.findFirst({ where: { apartment_id: apartmentId, month, year } }),

  findUtilityByMonthYear: (apartmentId, month, year) =>
    prisma.utility_records.findFirst({
      where: {
        OR: [{ id: apartmentId }, { id: String(apartmentId) }],
      },
    }),

  findMgmtByApartment: (apartmentId, month, year) =>
    prisma.management_fees.findFirst({ where: { apartment_id: apartmentId, month, year } }),

  upsertSetting: (key, value, description) =>
    prisma.system_settings.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value), description },
    }),

  updateUtilityInvoiceState: (where, data) =>
    prisma.utility_records.updateMany({ where, data }),

  updateMgmtInvoiceState: (where, data) =>
    prisma.management_fees.updateMany({ where, data }),
};
