const prisma = require('../config/prisma');

// Executive Analytics Repository — chỉ Prisma query thuần
module.exports = {
  // Overview
  getContracts: (aptWhere) =>
    prisma.contracts.findMany({
      where: { apartments: aptWhere, status: { not: 'CANCELLED' } },
      include: { contract_payments: true },
    }),
  getOverduePayments: (aptWhere) =>
    prisma.contract_payments.findMany({
      where: { contracts: { apartments: aptWhere, status: { not: 'CANCELLED' } }, status: 'PENDING', due_date: { lt: new Date() } },
    }),
  getConstructionRegs: (aptWhere) =>
    prisma.construction_registrations.findMany({ where: { apartments: aptWhere, deposit_status: 'DEPOSITED' } }),
  getWarrantyClaims: (aptWhere) => prisma.warranty_claims.findMany({ where: { apartments: aptWhere } }),
  countApartments: (aptWhere) => prisma.apartments.count({ where: aptWhere }),

  // Sales funnel
  countLeads: () => prisma.crm_opportunities.count(),
  countBookings: (aptWhere) => prisma.sales_bookings.count({ where: { apartments: aptWhere } }),
  countDeposits: (aptWhere) => prisma.deposit_receipts.count({ where: { apartments: aptWhere } }),
  countContracts: (aptWhere) => prisma.contracts.count({ where: { apartments: aptWhere, status: { not: 'CANCELLED' } } }),
  countTransfers: (aptWhere) => prisma.contract_transfers.count({ where: { contracts: { apartments: aptWhere } } }),
  getPhaseContracts: (phase) => prisma.contracts.findMany({ where: { apartments: { phase_code: phase }, status: { not: 'CANCELLED' } } }),
  getCommissions: (aptWhere) => prisma.commissions.findMany({ where: { contracts: { apartments: aptWhere } } }),

  // Financial aging
  getPendingPayments: (aptWhere) =>
    prisma.contract_payments.findMany({
      where: { contracts: { apartments: aptWhere, status: { not: 'CANCELLED' } }, status: 'PENDING' },
      include: { contracts: { include: { apartments: true, customers: true } } },
      orderBy: { due_date: 'asc' },
    }),

  // Operations SLA
  getWarrantyClaimsFull: (aptWhere) => prisma.warranty_claims.findMany({ where: { apartments: aptWhere }, include: { contractors: true, apartments: true } }),
  getContractors: (aptWhere) =>
    prisma.contractors.findMany({ include: { warranty_claims: { where: { apartments: aptWhere } } } }),
  getFitouts: (aptWhere) =>
    prisma.construction_registrations.findMany({ where: { apartments: aptWhere }, include: { construction_violations: true } }),

  // Community occupancy
  getApartmentsFull: (aptWhere) =>
    prisma.apartments.findMany({ where: aptWhere, include: { occupancies: { include: { residents: true } }, vehicles: true, contracts: true } }),

  // Export
  getContractsExport: () =>
    prisma.contracts.findMany({ include: { apartments: true, customers: true, contract_payments: true }, take: 100 }),
  getOverdueExport: () =>
    prisma.contract_payments.findMany({
      where: { status: 'PENDING', due_date: { lt: new Date() } },
      include: { contracts: { include: { apartments: true, customers: true } } },
    }),
  getWarrantyClaimsExport: () => prisma.warranty_claims.findMany({ include: { apartments: true, contractors: true } }),
};
