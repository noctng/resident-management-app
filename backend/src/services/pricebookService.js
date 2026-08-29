const crypto = require('crypto');
const { logActivity } = require('../utils/logger');
const repo = require('../repositories/pricebookRepository');

// Helper: tính giá từ land + construction
const computePriceComponents = (land, constr, vatR) => {
  const beforeVat = Number(land || 0) + Number(constr || 0);
  const vatAmt = (beforeVat * Number(vatR || 8)) / 100;
  const afterVat = beforeVat + vatAmt;
  const maint = (beforeVat * 2) / 100;
  return { beforeVat, vatAmt, afterVat, maint };
};

const buildWhereClause = (filters) => {
  const where = {};
  if (filters.phase && filters.phase !== 'ALL') where.phase_code = filters.phase;
  if (filters.status && filters.status !== 'ALL') where.status = filters.status;
  return where;
};

const getPricebooks = async (filters) => {
  const where = buildWhereClause(filters);
  const pricebooks = await repo.findAll(where);
  return { success: true, pricebooks, totalCount: pricebooks.length };
};

const getPricebookById = async (id) => {
  const pricebook = await repo.findById(id);
  if (!pricebook) return { success: false, message: 'Không tìm thấy bảng giá' };
  return { success: true, pricebook };
};

const createPricebook = async (body, prisma, user) => {
  const {
    name,
    phase_code = 'ALL',
    effective_from,
    effective_to,
    description,
    clone_from_id,
    populate_current_units = true,
  } = body;

  if (!name || !effective_from) {
    return { success: false, message: 'Vui lòng nhập tên bảng giá và ngày hiệu lực' };
  }

  const lastPb = await repo.findLastByPhase(phase_code);
  const nextVersion = (lastPb?.version || 0) + 1;
  const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
  const code = `PB-${phase_code}-${dateStr}-v${nextVersion}`;
  const id = 'pb_' + crypto.randomBytes(6).toString('hex');
  const createdBy = user?.username || user?.name || 'Admin';

  const result = await prisma.$transaction(async (tx) => {
    // Use tx-bound repo methods via direct prisma
    const newPb = await tx.pricebooks.create({
      data: {
        id,
        code,
        name,
        phase_code,
        version: nextVersion,
        status: 'DRAFT',
        effective_from: new Date(effective_from),
        effective_to: effective_to ? new Date(effective_to) : null,
        description,
        created_by: createdBy,
      },
    });

    if (clone_from_id) {
      const sourceItems = await tx.pricebook_items.findMany({ where: { pricebook_id: clone_from_id } });
      if (sourceItems.length > 0) {
        await tx.pricebook_items.createMany({
          data: sourceItems.map((item) => ({
            id: 'pbi_' + crypto.randomBytes(6).toString('hex'),
            pricebook_id: id,
            apartment_id: item.apartment_id,
            land_price_before_vat: item.land_price_before_vat,
            construction_price_before_vat: item.construction_price_before_vat,
            vat_rate: item.vat_rate,
            total_price_before_vat: item.total_price_before_vat,
            total_price_after_vat: item.total_price_after_vat,
            maintenance_fee_2percent: item.maintenance_fee_2percent,
            notes: item.notes,
          })),
        });
      }
    } else if (populate_current_units) {
      const unitWhere = phase_code !== 'ALL' ? { phase_code } : {};
      const units = await tx.apartments.findMany({ where: unitWhere });

      if (units.length > 0) {
        const itemsData = units.map((u) => {
          const { beforeVat, afterVat, maint } = computePriceComponents(
            u.land_price_before_vat,
            u.construction_price_before_vat,
            u.vat_rate
          );
          return {
            id: 'pbi_' + crypto.randomBytes(6).toString('hex'),
            pricebook_id: id,
            apartment_id: u.id,
            land_price_before_vat: Number(u.land_price_before_vat || 0),
            construction_price_before_vat: Number(u.construction_price_before_vat || 0),
            vat_rate: Number(u.vat_rate || 8),
            total_price_before_vat: beforeVat,
            total_price_after_vat: afterVat,
            maintenance_fee_2percent: maint,
          };
        });

        await tx.pricebook_items.createMany({ data: itemsData });
      }
    }

    return newPb;
  });

  await logActivity(
    user,
    'TẠO_BẢNG_GIÁ',
    'PRICEBOOK',
    result.id,
    result.code,
    `Tạo bảng giá phiên bản mới: ${result.name} (${result.code})`
  );

  return { success: true, message: `Tạo bảng giá ${result.code} thành công`, pricebook: result };
};

const updatePricebook = async (id, body, prisma) => {
  const { name, effective_from, effective_to, description, items } = body;

  const pb = await repo.findById(id);
  if (!pb) return { success: false, message: 'Không tìm thấy bảng giá' };
  if (pb.status === 'ARCHIVED') {
    return { success: false, message: 'Bảng giá đã lưu trữ không được chỉnh sửa' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.pricebooks.update({
      where: { id },
      data: {
        name: name !== undefined ? name : pb.name,
        effective_from: effective_from ? new Date(effective_from) : pb.effective_from,
        effective_to: effective_to ? new Date(effective_to) : pb.effective_to,
        description: description !== undefined ? description : pb.description,
        updated_at: new Date(),
      },
    });

    if (Array.isArray(items)) {
      for (const it of items) {
        if (it.apartment_id) {
          const { beforeVat, afterVat, maint } = computePriceComponents(
            it.land_price_before_vat,
            it.construction_price_before_vat,
            it.vat_rate
          );
          await tx.pricebook_items.upsert({
            where: {
              pricebook_id_apartment_id: { pricebook_id: id, apartment_id: it.apartment_id },
            },
            create: {
              id: 'pbi_' + crypto.randomBytes(6).toString('hex'),
              pricebook_id: id,
              apartment_id: it.apartment_id,
              land_price_before_vat: Number(it.land_price_before_vat || 0),
              construction_price_before_vat: Number(it.construction_price_before_vat || 0),
              vat_rate: Number(it.vat_rate || 8),
              total_price_before_vat: beforeVat,
              total_price_after_vat: afterVat,
              maintenance_fee_2percent: maint,
              notes: it.notes,
            },
            update: {
              land_price_before_vat: Number(it.land_price_before_vat || 0),
              construction_price_before_vat: Number(it.construction_price_before_vat || 0),
              vat_rate: Number(it.vat_rate || 8),
              total_price_before_vat: beforeVat,
              total_price_after_vat: afterVat,
              maintenance_fee_2percent: maint,
              notes: it.notes,
            },
          });
        }
      }
    }
  });

  return { success: true, message: 'Cập nhật bảng giá thành công' };
};

const approvePricebook = async (id, body, prisma, user) => {
  const { activate_now = true } = body;
  const approverName = user?.username || user?.name || 'Ban Giám Đốc';

  const pb = await prisma.pricebooks.findUnique({
    where: { id },
    include: { pricebook_items: true },
  });
  if (!pb) return { success: false, message: 'Không tìm thấy bảng giá' };

  await prisma.$transaction(async (tx) => {
    if (activate_now) {
      await tx.pricebooks.updateMany({
        where: { phase_code: pb.phase_code, status: 'ACTIVE', id: { not: id } },
        data: { status: 'ARCHIVED' },
      });
    }

    const targetStatus = activate_now ? 'ACTIVE' : 'APPROVED';
    await tx.pricebooks.update({
      where: { id },
      data: { status: targetStatus, approved_by: approverName, approved_at: new Date() },
    });

    if (activate_now && pb.pricebook_items.length > 0) {
      for (const item of pb.pricebook_items) {
        await tx.apartments.update({
          where: { id: item.apartment_id },
          data: {
            land_price_before_vat: item.land_price_before_vat,
            construction_price_before_vat: item.construction_price_before_vat,
            vat_rate: item.vat_rate,
            maintenance_fee_2pct: item.maintenance_fee_2percent,
          },
        });
      }
    }
  });

  await logActivity(
    user,
    'PHÊ_DUYỆT_BẢNG_GIÁ',
    'PRICEBOOK',
    pb.id,
    pb.code,
    `Phê duyệt & kích hoạt bảng giá ${pb.code} (${activate_now ? 'ACTIVE' : 'APPROVED'})`
  );

  return {
    success: true,
    message: `Đã phê duyệt và ${activate_now ? 'áp dụng chính thức' : 'chờ áp dụng'} bảng giá ${pb.code}`,
  };
};

const deletePricebook = async (id) => {
  const pb = await repo.findById(id);
  if (!pb) return { success: false, message: 'Không tìm thấy bảng giá' };
  if (pb.status === 'ACTIVE') {
    return { success: false, message: 'Không thể xóa bảng giá đang kích hoạt chính thức' };
  }
  await repo.deleteById(id);
  return { success: true, message: 'Đã xóa bảng giá thành công' };
};

module.exports = {
  computePriceComponents,
  buildWhereClause,
  getPricebooks,
  getPricebookById,
  createPricebook,
  updatePricebook,
  approvePricebook,
  deletePricebook,
};
