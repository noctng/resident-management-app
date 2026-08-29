const prisma = require('../config/prisma');

// Chỉ chứa prisma query thuần — KHÔNG logic nghiệp vụ (Clean Architecture rule).
// Module unifiedBilling dùng Prisma ORM 100% (không raw SQL / pg Pool).

const ACTIVE_OCCUPANCY_INCLUDE = {
    occupancies: {
        include: { residents: true },
        where: { residents: { is_active: true } },
    },
};

const QR_KEYS = ['QR_BANK_ACCOUNT', 'QR_ACCOUNT_NAME', 'QR_BANK_CODE'];

// --- apartments ---
async function listApartments(where = {}) {
    return prisma.apartments.findMany({ where, orderBy: { code: 'asc' } });
}

async function listApartmentsWithResidents() {
    return prisma.apartments.findMany({
        include: ACTIVE_OCCUPANCY_INCLUDE,
        orderBy: { code: 'asc' },
    });
}

async function getApartmentById(id) {
    return prisma.apartments.findUnique({ where: { id } });
}

async function getApartmentWithResidents(id) {
    return prisma.apartments.findUnique({
        where: { id },
        include: ACTIVE_OCCUPANCY_INCLUDE,
    });
}

// --- utility_records ---
async function listUtilityRecordsByPeriod(month, year, apartmentIds) {
    return prisma.utility_records.findMany({
        where: { month, year, apartment_id: { in: apartmentIds } },
    });
}

async function listUtilityRecordsByApartment(apartmentId, take) {
    return prisma.utility_records.findMany({
        where: { apartment_id: apartmentId },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take,
    });
}

async function findUtilityRecord(apartmentId, month, year) {
    return prisma.utility_records.findFirst({
        where: { apartment_id: apartmentId, month, year },
    });
}

async function updateUtilityRecord(id, data) {
    return prisma.utility_records.update({ where: { id }, data });
}

// --- management_fees ---
async function listManagementFeesByPeriod(month, year, apartmentIds) {
    return prisma.management_fees.findMany({
        where: { month, year, apartment_id: { in: apartmentIds } },
    });
}

async function listManagementFeesByApartment(apartmentId, take) {
    return prisma.management_fees.findMany({
        where: { apartment_id: apartmentId },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take,
    });
}

async function findManagementFee(apartmentId, month, year) {
    return prisma.management_fees.findFirst({
        where: { apartment_id: apartmentId, month, year },
    });
}

async function updateManagementFee(id, data) {
    return prisma.management_fees.update({ where: { id }, data });
}

// --- system_settings (QR config) ---
async function listQrSettings() {
    return prisma.system_settings.findMany({ where: { key: { in: QR_KEYS } } });
}

module.exports = {
    listApartments,
    listApartmentsWithResidents,
    getApartmentById,
    getApartmentWithResidents,
    listUtilityRecordsByPeriod,
    listUtilityRecordsByApartment,
    findUtilityRecord,
    updateUtilityRecord,
    listManagementFeesByPeriod,
    listManagementFeesByApartment,
    findManagementFee,
    updateManagementFee,
    listQrSettings,
};
