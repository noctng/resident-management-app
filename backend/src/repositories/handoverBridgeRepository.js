/**
 * handoverBridgeRepository — CHỈ chứa truy vấn DB (Prisma).
 * KHÔNG logic nghiệp vụ. KHÔNG import crypto/bcrypt.
 * Tất cả giá trị computed (id, hash, area, deadline, v.v.) được tính trong
 * service và truyền vào dưới dạng tham số đã sẵn sàng.
 */
const prisma = require('../config/prisma');

/**
 * Tìm hồ sơ bàn giao theo contract id / contract_code / apartment_id.
 * Dùng cho GET /:id.
 */
async function findContractForHandover(id) {
  return prisma.contracts.findFirst({
    where: { OR: [{ id }, { contract_code: id }, { apartment_id: id }] },
    include: {
      apartments: true,
      customers: true,
      handover_checklists: { orderBy: { item_order: 'asc' } },
      snag_items: { orderBy: { created_at: 'desc' } },
    },
  });
}

/** Tìm contract theo id (không include). Dùng cho addSnagItem, complete. */
async function findContractById(id) {
  return prisma.contracts.findUnique({ where: { id } });
}

/** Tạo snag item. Dùng cho POST /:id/snags. */
async function createSnagItem(data) {
  return prisma.snag_items.create({ data });
}

/** Cập nhật snag item (resolve). Dùng cho POST /snags/:snagId/resolve. */
async function updateSnagItem(id, data) {
  return prisma.snag_items.update({ where: { id }, data });
}

/**
 * Thực thi Operations Bridge trong 1 transaction.
 * Nhận tất cả giá trị đã compute từ service (ids, hash, area, fee, v.v.)
 * và chỉ thực hiện prisma query thuần.
 * Dùng cho POST /:id/complete-bridge.
 */
async function executeCompleteHandover(params) {
  const {
    contractId,
    unitId,
    residentId,
    residentIdNumber,
    residentName,
    residentPhone,
    residentEmail,
    passwordHash,
    area,
    feePerSqm,
    initial_electricity_reading,
    initial_water_reading,
    month,
    year,
  } = params;

  return prisma.$transaction(async (tx) => {
    // 1. Update Apartment & Contract Status
    await tx.apartments.update({
      where: { id: unitId },
      data: { sales_status: 'HANDED_OVER' },
    });

    await tx.contracts.update({
      where: { id: contractId },
      data: {
        status: 'COMPLETED',
        handover_completed: true,
        handover_date_actual: new Date(),
      },
    });

    // 2. Tìm resident theo phone_number / id_number
    const existingResident = await tx.residents.findFirst({
      where: {
        OR: [
          { phone_number: residentPhone },
          ...(residentIdNumber ? [{ id_number: residentIdNumber }] : []),
        ],
      },
    });

    // 3. Tạo resident nếu chưa có
    const resident = existingResident || (await tx.residents.create({
      data: {
        id: residentId,
        name: residentName,
        phone_number: residentPhone,
        id_number: residentIdNumber,
        email: residentEmail || null,
      },
    }));

    // 4. Tạo Occupancy Record
    const existingOccupancy = await tx.occupancies.findFirst({
      where: { apartment_id: unitId, resident_id: resident.id },
    });

    if (!existingOccupancy) {
      await tx.occupancies.create({
        data: {
          apartment_id: unitId,
          resident_id: resident.id,
        },
      });
    }

    // 5. Tạo Resident Account
    const existingAccount = await tx.resident_accounts.findUnique({
      where: { resident_id: resident.id },
    });

    if (!existingAccount) {
      await tx.resident_accounts.create({
        data: {
          resident_id: resident.id,
          password_hash: passwordHash,
        },
      });
    }

    // 6. Tạo Utility Record (dùng ID đã tạo sẵn từ service để tránh import crypto trong repo)
    const existingUtility = await tx.utility_records.findFirst({
      where: { apartment_id: unitId, month, year },
    });

    if (!existingUtility) {
      await tx.utility_records.create({
        data: {
          id: params.utilityRecordId,
          apartment_id: unitId,
          month,
          year,
          electricity_old_reading: initial_electricity_reading,
          electricity_new_reading: initial_electricity_reading,
          water_old_reading: initial_water_reading,
          water_new_reading: initial_water_reading,
        },
      });
    }

    // 7. Tạo Management Fee Record
    const existingFee = await tx.management_fees.findFirst({
      where: { apartment_id: unitId, month, year },
    });

    if (!existingFee) {
      const mgmtFee = Math.round(area * feePerSqm);
      await tx.management_fees.create({
        data: {
          id: params.managementFeeRecordId,
          apartment_id: unitId,
          month,
          year,
          area,
          management_fee_per_sqm: feePerSqm,
          management_fee: mgmtFee,
          total_amount: mgmtFee,
          status: 'PENDING',
        },
      });
    }

    return { resident, unitId };
  });
}

/**
 * Lấy dữ liệu thô để tính Executive KPI metrics.
 * Bao gồm: apartments, contracts kèm payments, và các count từ CRM/sales.
 */
async function getExecutiveRawData() {
  const [allUnits, contracts, leadsCount, cartCount, bookingsCount, depositsCount] =
    await Promise.all([
      prisma.apartments.findMany(),
      prisma.contracts.findMany({ include: { contract_payments: true } }),
      prisma.crm_leads.count(),
      prisma.sales_cart_items.count(),
      prisma.sales_bookings.count({ where: { status: 'ACTIVE' } }),
      prisma.deposit_receipts.count({ where: { status: 'ACTIVE' } }),
    ]);

  return { allUnits, contracts, leadsCount, cartCount, bookingsCount, depositsCount };
}

module.exports = {
  findContractForHandover,
  findContractById,
  createSnagItem,
  updateSnagItem,
  executeCompleteHandover,
  getExecutiveRawData,
};
