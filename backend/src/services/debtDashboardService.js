const repo = require('../repositories/debtDashboardRepository');

const withDefault = (value, def) => (value === undefined || value === null ? def : Number(value));

const getApartmentDebtSummary = async (limit = 100) => (await repo.getApartmentDebtSummary(limit)).rows;

const getMonthlyRevenueSummary = async (limit = 12) => (await repo.getMonthlyRevenueSummary(limit)).rows;

const getOverallStats = async () => {
  const rows = (await repo.getOverallStats()).rows;
  const s = rows[0] || {};
  return {
    total_apartments: withDefault(s.total_apartments, 0),
    total_invoices: withDefault(s.total_invoices, 0),
    paid_invoices: withDefault(s.paid_invoices, 0),
    pending_invoices: withDefault(s.pending_invoices, 0),
    overdue_invoices: withDefault(s.overdue_invoices, 0),
    total_amount: withDefault(s.total_amount, 0),
    collected_amount: withDefault(s.collected_amount, 0),
    debt_amount: withDefault(s.debt_amount, 0),
    collection_rate: withDefault(s.collection_rate, 0),
  };
};

const getTopDebtors = async (limit = 10) => (await repo.getTopDebtors(limit)).rows;

const getPaymentTrends = async () => (await repo.getPaymentTrends()).rows;

const getDebtHeatmap = async () =>
  (await repo.getDebtHeatmap()).rows.map((r) => ({
    house_type: r.house_type,
    floor: r.floor,
    total_fees: withDefault(r.total_fees, 0),
    unpaid_count: withDefault(r.unpaid_count, 0),
    debt_amount: withDefault(r.debt_amount, 0),
  }));

const getRecentPayments = async (limit = 20) => (await repo.getRecentPayments(limit)).rows;

module.exports = {
  getApartmentDebtSummary,
  getMonthlyRevenueSummary,
  getOverallStats,
  getTopDebtors,
  getPaymentTrends,
  getDebtHeatmap,
  getRecentPayments,
};
