const repo = require('../repositories/unifiedBillingRepository');
const { logActivity } = require('../utils/logger');
const { getPricingConfig } = require('../utils/pricing');

// Mọi logic nghiệp vụ của module unifiedBilling nằm ở đây.
// Service gọi repo.* (prisma thuần) — KHÔNG viết prisma query trực tiếp.
// Throw lỗi kèm `err.status` để controller format response.

// Helpers
function determineCombinedStatus(utilityRecord, managementFee) {
  if (!utilityRecord && !managementFee) return 'NO_DATA';
  if (!utilityRecord) return managementFee.status || 'PENDING';
  if (!managementFee) return utilityRecord.payment_status || 'UNPAID';

  const utilityPaid = utilityRecord.payment_status === 'PAID';
  const mgmtPaid = managementFee.status === 'PAID';

  if (utilityPaid && mgmtPaid) return 'PAID';
  if (!utilityPaid && !mgmtPaid) return 'UNPAID';
  return 'PARTIAL';
}

function calcTaxes(electricityCost, waterCost) {
  const config = getPricingConfig();
  const elecVatRate = (config.vat?.electricity || 0) / 100;
  const waterVatRate = (config.vat?.water || 0) / 100;
  return {
    electricityTax: Math.round(electricityCost - electricityCost / (1 + elecVatRate)),
    waterTax: Math.round(waterCost - waterCost / (1 + waterVatRate)),
  };
}

function buildBillingRow(apartment, utilityRecord, managementFee, parsedMonth, parsedYear) {
  const electricityCost = Number(utilityRecord?.electricity_cost || 0);
  const waterCost = Number(utilityRecord?.water_cost || 0);
  const managementFeeCost = Number(managementFee?.total_amount || 0);
  const grandTotal = electricityCost + waterCost + managementFeeCost;
  const { electricityTax, waterTax } = calcTaxes(electricityCost, waterCost);

  return {
    apartment_id: apartment.id,
    apartment_code: apartment.code,
    house_type: apartment.house_type,
    floor: apartment.floor,
    area: apartment.area,
    utility_id: utilityRecord?.id || null,
    electricity_cost: electricityCost,
    electricity_tax: electricityTax,
    water_cost: waterCost,
    water_tax: waterTax,
    utility_total: electricityCost + waterCost,
    utility_status: utilityRecord?.payment_status || null,
    utility_paid_date: utilityRecord?.paid_date || null,
    electricity_old_reading: utilityRecord?.electricity_old_reading || null,
    electricity_new_reading: utilityRecord?.electricity_new_reading || null,
    electricity_usage: utilityRecord?.electricity_consumption || null,
    water_old_reading: utilityRecord?.water_old_reading || null,
    water_new_reading: utilityRecord?.water_new_reading || null,
    water_usage: utilityRecord?.water_consumption || null,
    management_fee_id: managementFee?.id || null,
    management_fee_cost: managementFeeCost,
    management_fee_status: managementFee?.status || null,
    management_fee_paid_date: managementFee?.payment_date || null,
    management_fee_breakdown: managementFee
      ? {
          management_fee: parseFloat(managementFee.management_fee) || 0,
          internet_fee: parseFloat(managementFee.internet_fee) || 0,
          cable_tv_fee: parseFloat(managementFee.cable_tv_fee) || 0,
          parking_car_fee: parseFloat(managementFee.parking_car_fee) || 0,
          parking_motorbike_fee: parseFloat(managementFee.parking_motorbike_fee) || 0,
          security_fee: parseFloat(managementFee.security_fee) || 0,
          cleaning_fee: parseFloat(managementFee.cleaning_fee) || 0,
        }
      : null,
    grand_total: grandTotal,
    combined_status: determineCombinedStatus(utilityRecord, managementFee),
    month: parsedMonth,
    year: parsedYear,
  };
}

// ===== 1. getUnifiedBilling =====
async function getUnifiedBilling({ month, year, apartment_code }) {
  if (!month || !year) {
    const err = new Error('Month and year are required');
    err.status = 400;
    throw err;
  }
  const parsedMonth = parseInt(month);
  const parsedYear = parseInt(year);

  const whereClause = apartment_code ? { code: apartment_code } : {};
  const apartments = await repo.listApartments(whereClause);
  const apartmentIds = apartments.map((a) => a.id);

  const [utilityRecords, managementFees] = await Promise.all([
    repo.listUtilityRecordsByPeriod(parsedMonth, parsedYear, apartmentIds),
    repo.listManagementFeesByPeriod(parsedMonth, parsedYear, apartmentIds),
  ]);

  const utilityMap = new Map(utilityRecords.map((r) => [r.apartment_id, r]));
  const feeMap = new Map(managementFees.map((f) => [f.apartment_id, f]));

  const billingData = apartments.map((apartment) =>
    buildBillingRow(apartment, utilityMap.get(apartment.id) || null, feeMap.get(apartment.id) || null, parsedMonth, parsedYear)
  );

  const summary = {
    total_invoices: billingData.length,
    total_electricity: billingData.reduce((s, b) => s + b.electricity_cost, 0),
    total_electricity_tax: billingData.reduce((s, b) => s + b.electricity_tax, 0),
    total_water: billingData.reduce((s, b) => s + b.water_cost, 0),
    total_water_tax: billingData.reduce((s, b) => s + b.water_tax, 0),
    total_management_fee: billingData.reduce((s, b) => s + b.management_fee_cost, 0),
    grand_total: billingData.reduce((s, b) => s + b.grand_total, 0),
    paid_count: billingData.filter((b) => b.combined_status === 'PAID').length,
    unpaid_count: billingData.filter((b) => b.combined_status === 'UNPAID').length,
    partial_count: billingData.filter((b) => b.combined_status === 'PARTIAL').length,
  };

  return { data: billingData, summary, month: parsedMonth, year: parsedYear };
}

// ===== 2. getUnifiedBillingHistory =====
async function getUnifiedBillingHistory(apartment_id, limit = 12) {
  if (!apartment_id) {
    const err = new Error('Apartment ID is required');
    err.status = 400;
    throw err;
  }
  const apartment = await repo.getApartmentById(apartment_id);
  if (!apartment) {
    const err = new Error('Apartment not found');
    err.status = 404;
    throw err;
  }

  const take = parseInt(limit) || 12;
  const [utilityRecords, mgmtFees] = await Promise.all([
    repo.listUtilityRecordsByApartment(apartment_id, take),
    repo.listManagementFeesByApartment(apartment_id, take),
  ]);

  const mergedData = new Map();
  utilityRecords.forEach((rec) => {
    mergedData.set(`${rec.month}-${rec.year}`, { month: rec.month, year: rec.year, utilityRecord: rec, managementFee: null });
  });
  mgmtFees.forEach((fee) => {
    const key = `${fee.month}-${fee.year}`;
    if (mergedData.has(key)) mergedData.get(key).managementFee = fee;
    else mergedData.set(key, { month: fee.month, year: fee.year, utilityRecord: null, managementFee: fee });
  });

  const history = Array.from(mergedData.values())
    .sort((a, b) => (a.year !== b.year ? b.year - a.year : b.month - a.month))
    .map((item) => buildBillingRow(apartment, item.utilityRecord, item.managementFee, item.month, item.year));

  return { data: history };
}

// ===== 3. updateCombinedPaymentStatus =====
async function updateCombinedPaymentStatus({ apartment_id, month, year, status }, actor) {
  if (!['PAID', 'UNPAID'].includes(status)) {
    const err = new Error('Invalid status. Must be PAID or UNPAID.');
    err.status = 400;
    throw err;
  }
  if (!apartment_id || !month || !year) {
    const err = new Error('Missing required fields');
    err.status = 400;
    throw err;
  }

  const parsedMonth = parseInt(month);
  const parsedYear = parseInt(year);
  const paidDate = status === 'PAID' ? new Date() : null;

  const utilityRecord = await repo.findUtilityRecord(apartment_id, parsedMonth, parsedYear);
  if (utilityRecord) {
    await repo.updateUtilityRecord(utilityRecord.id, { payment_status: status, paid_date: paidDate });
  }

  const managementFee = await repo.findManagementFee(apartment_id, parsedMonth, parsedYear);
  if (managementFee) {
    await repo.updateManagementFee(managementFee.id, {
      status: status === 'PAID' ? 'PAID' : 'PENDING',
      payment_date: paidDate,
      updated_at: new Date(),
    });
  }

  const apt = await repo.getApartmentById(apartment_id);
  await logActivity(
    actor,
    'UPDATE_STATUS',
    'UNIFIED_BILL',
    apt?.code,
    `${month}/${year}`,
    `Updated combined status to ${status}`
  );

  let totalPaid = 0;
  if (status === 'PAID') {
    const utilityCost = utilityRecord
      ? Number(utilityRecord.electricity_cost || 0) + Number(utilityRecord.water_cost || 0)
      : 0;
    const feeCost = managementFee ? Number(managementFee.total_amount || 0) : 0;
    totalPaid = utilityCost + feeCost;
  }

  return { message: 'Update success', status, totalPaid: status === 'PAID' ? totalPaid : 0 };
}

module.exports = {
  determineCombinedStatus,
  getUnifiedBilling,
  getUnifiedBillingHistory,
  updateCombinedPaymentStatus,
};
