const repo = require('../repositories/utilityRepository');
const {
  calculateWaterCost,
  calculateResidentialElectricityCost,
  calculateBusinessElectricityCost,
  getPricingConfig,
} = require('../utils/pricing');

// --- Helper: normalize pricing snapshot for backward compatibility ---
// Old snapshots may lack 'vat' field or use different water format
const normalizePricingSnapshot = (snapshot, currentConfig) => {
  if (!snapshot) return currentConfig;
  return {
    ...snapshot,
    vat: snapshot.vat || currentConfig.vat || { electricity: 8, water: 5 },
    water: snapshot.water || currentConfig.water,
    businessElectricity: snapshot.businessElectricity || currentConfig.businessElectricity,
    residentialElectricity: snapshot.residentialElectricity || currentConfig.residentialElectricity,
  };
};

// --- Helper format (entity snake_case → DTO camelCase trả frontend) ---
// KHÔNG import prisma — chỉ format + reverse-calc thuế từ cost đã bao gồm VAT.
const formatUtilityRecord = (r) => {
  const elecCost = parseFloat(r.electricity_cost);
  const waterCost = parseFloat(r.water_cost);
  // Use pricing snapshot from record if available, otherwise fall back to current config
  const rawConfig = r.pricing_snapshot || getPricingConfig();
  const config = normalizePricingSnapshot(rawConfig, getPricingConfig());
  const elecVatRate = (config.vat?.electricity || 0) / 100;
  const waterVatRate = (config.vat?.water || 0) / 100;
  // Reverse-calculate tax from tax-inclusive cost: baseCost = totalCost / (1 + vatRate), tax = totalCost - baseCost
  const elecTax = Math.round(elecCost - elecCost / (1 + elecVatRate));
  const waterTax = Math.round(waterCost - waterCost / (1 + waterVatRate));

  return {
    id: r.id,
    apartmentId: r.apartment_id,
    month: r.month,
    year: r.year,
    electricity: {
      oldReading: parseFloat(r.electricity_old_reading),
      newReading: parseFloat(r.electricity_new_reading),
      consumption: parseFloat(r.electricity_new_reading) - parseFloat(r.electricity_old_reading),
      cost: elecCost,
      tax: elecTax,
    },
    water: {
      oldReading: parseFloat(r.water_old_reading),
      newReading: parseFloat(r.water_new_reading),
      consumption: parseFloat(r.water_new_reading) - parseFloat(r.water_old_reading),
      cost: waterCost,
      tax: waterTax,
    },
    paymentStatus: r.payment_status || 'UNPAID',
    paidDate: r.paid_date ? r.paid_date.toISOString().split('T')[0] : null,
    emailSentAt: r.email_sent_at ? r.email_sent_at.toISOString() : null,
    pricingSnapshot: r.pricing_snapshot || null,
  };
};

// GET /api/utility/utility-records
async function getAllUtilityRecords() {
  const records = await repo.listAll();
  return records.map(formatUtilityRecord);
}

// GET /api/utility/utility-records/apartment/:apartmentId
async function getUtilityRecordsByApartment(apartmentId) {
  const records = await repo.listByApartment(apartmentId);
  return records.map(formatUtilityRecord);
}

// POST /api/utility/utility-records/recalculate
// Tính lại tiền điện/nước cho bản ghi UNPAID của kỳ hiện tại (bảo toàn dữ liệu lịch sử).
// Chỉ đọc/ghi utility_records + dùng pricing util — KHÔNG file I/O, KHÔNG email, KHÔNG cross-module.
async function recalculateUtilityCosts() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Only find UNPAID records for the current month
  const records = await repo.findUnpaidByMonthYear(currentMonth, currentYear);

  let updatedCount = 0;
  const results = [];
  const currentPricing = getPricingConfig();

  for (const record of records) {
    const elecOld = parseFloat(record.electricity_old_reading);
    const elecNew = parseFloat(record.electricity_new_reading);
    const waterOld = parseFloat(record.water_old_reading);
    const waterNew = parseFloat(record.water_new_reading);

    const elecConsumption = elecNew - elecOld;
    const waterConsumption = waterNew - waterOld;

    // Skip if no consumption
    if (elecConsumption <= 0 && waterConsumption <= 0) continue;

    const electricityType = record.apartments?.electricity_type || 'RESIDENTIAL';

    // Calculate costs using current pricing config
    const newElecCost =
      elecConsumption > 0
        ? electricityType === 'BUSINESS'
          ? calculateBusinessElectricityCost(elecConsumption)
          : calculateResidentialElectricityCost(elecConsumption)
        : 0;

    const newWaterCost =
      waterConsumption > 0 ? calculateWaterCost(waterConsumption, electricityType) : 0;

    // Update if costs changed
    if (
      parseFloat(record.electricity_cost) !== newElecCost ||
      parseFloat(record.water_cost) !== newWaterCost
    ) {
      await repo.updateById(record.id, {
        electricity_cost: newElecCost,
        water_cost: newWaterCost,
        pricing_snapshot: currentPricing,
      });

      updatedCount++;
      results.push({
        id: record.id,
        apartment_id: record.apartment_id,
        month: record.month,
        year: record.year,
        old_elec_cost: parseFloat(record.electricity_cost),
        new_elec_cost: newElecCost,
        old_water_cost: parseFloat(record.water_cost),
        new_water_cost: newWaterCost,
      });
    }
  }

  return {
    message: `Đã cập nhật ${updatedCount} bản ghi (chỉ kỳ ${currentMonth}/${currentYear} chưa thanh toán)`,
    updatedCount,
    details: results,
  };
}

module.exports = {
  getAllUtilityRecords,
  getUtilityRecordsByApartment,
  recalculateUtilityCosts,
  formatUtilityRecord,
};
