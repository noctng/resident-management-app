const prisma = require('../config/prisma');
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

// Report Repository — Prisma + raw PG query thuần
module.exports = {
  // Dashboard unified billing export
  getApartmentsForBilling: () =>
    prisma.apartments.findMany({
      include: {
        occupancies: {
          include: { residents: true },
          where: { residents: { is_active: true } },
        },
      },
      orderBy: { code: 'asc' },
    }),

  getUtilityRecord: (apartment_id, month, year) =>
    prisma.utility_records.findFirst({ where: { apartment_id, month, year } }),

  getManagementFee: (apartment_id, month, year) =>
    pool.query(
      `SELECT * FROM management_fees WHERE apartment_id = $1 AND month = $2 AND year = $3`,
      [apartment_id, month, year]
    ),

  // Residents / apartments / contracts exports
  getResidents: () =>
    prisma.residents.findMany({ include: { occupancies: { include: { apartments: true } } } }),

  getApartments: () =>
    prisma.apartments.findMany({
      include: {
        occupancies: {
          where: { residents: { is_active: true } },
          include: { residents: true },
        },
      },
      orderBy: { code: 'asc' },
    }),

  getUtilityRecords: (month, year) =>
    prisma.utility_records.findMany({
      where: { month: Number(month), year: Number(year) },
      include: { apartments: true },
      orderBy: { apartments: { code: 'asc' } },
    }),

  getContracts: () =>
    prisma.contracts.findMany({
      include: { customers: true, apartments: true },
      orderBy: { created_at: 'desc' },
    }),

  // Revenue report
  getContractPaymentsRange: (startDate, endDate) =>
    prisma.contract_payments.findMany({
      where: { created_at: { gte: startDate, lte: endDate } },
      include: { contracts: { include: { customers: true, apartments: true } } },
    }),

  getContractPaymentsRangeSimple: (startDate, endDate) =>
    prisma.contract_payments.findMany({
      where: { created_at: { gte: startDate, lte: endDate } },
    }),
};
