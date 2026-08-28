const prisma = require('../config/prisma');
const { logActivity } = require('../utils/logger');
const crypto = require('crypto');

/**
 * 1. Get all pricebooks
 */
exports.getPricebooks = async (req, res) => {
  try {
    const { phase, status } = req.query;

    const where = {};
    if (phase && phase !== 'ALL') where.phase_code = phase;
    if (status && status !== 'ALL') where.status = status;

    const pricebooks = await prisma.pricebooks.findMany({
      where,
      include: {
        _count: {
          select: { pricebook_items: true },
        },
      },
      orderBy: [{ version: 'desc' }, { created_at: 'desc' }],
    });

    res.json({ success: true, pricebooks, totalCount: pricebooks.length });
  } catch (err) {
    console.error('Lỗi lấy danh sách bảng giá:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2. Get Pricebook details by ID
 */
exports.getPricebookById = async (req, res) => {
  try {
    const { id } = req.params;
    const pricebook = await prisma.pricebooks.findUnique({
      where: { id },
      include: {
        pricebook_items: {
          include: {
            apartments: true,
          },
          orderBy: { apartments: { code: 'asc' } },
        },
      },
    });

    if (!pricebook) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bảng giá' });
    }

    res.json({ success: true, pricebook });
  } catch (err) {
    console.error('Lỗi lấy chi tiết bảng giá:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 3. Create a new Pricebook
 */
exports.createPricebook = async (req, res) => {
  try {
    const {
      name,
      phase_code = 'ALL',
      effective_from,
      effective_to,
      description,
      clone_from_id,
      populate_current_units = true,
    } = req.body;

    if (!name || !effective_from) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên bảng giá và ngày hiệu lực' });
    }

    // Determine version number for this phase
    const lastPb = await prisma.pricebooks.findFirst({
      where: { phase_code },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (lastPb?.version || 0) + 1;
    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const code = `PB-${phase_code}-${dateStr}-v${nextVersion}`;
    const id = 'pb_' + crypto.randomBytes(6).toString('hex');
    const createdBy = req.user?.username || req.user?.name || 'Admin';

    const result = await prisma.$transaction(async (tx) => {
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

      // Populate items
      if (clone_from_id) {
        const sourceItems = await tx.pricebook_items.findMany({
          where: { pricebook_id: clone_from_id },
        });
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
            const land = Number(u.land_price_before_vat || 0);
            const constr = Number(u.construction_price_before_vat || 0);
            const vatR = Number(u.vat_rate || 8);
            const beforeVat = land + constr;
            const vatAmt = (beforeVat * vatR) / 100;
            const afterVat = beforeVat + vatAmt;
            const maint = (beforeVat * 2) / 100;

            return {
              id: 'pbi_' + crypto.randomBytes(6).toString('hex'),
              pricebook_id: id,
              apartment_id: u.id,
              land_price_before_vat: land,
              construction_price_before_vat: constr,
              vat_rate: vatR,
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
      req.user,
      'TẠO_BẢNG_GIÁ',
      'PRICEBOOK',
      result.id,
      result.code,
      `Tạo bảng giá phiên bản mới: ${result.name} (${result.code})`
    );

    res.status(201).json({
      success: true,
      message: `Tạo bảng giá ${result.code} thành công`,
      pricebook: result,
    });
  } catch (err) {
    console.error('Lỗi tạo bảng giá:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 4. Update Pricebook header & items
 */
exports.updatePricebook = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, effective_from, effective_to, description, items } = req.body;

    const pb = await prisma.pricebooks.findUnique({ where: { id } });
    if (!pb) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bảng giá' });
    }

    if (pb.status === 'ARCHIVED') {
      return res.status(400).json({ success: false, message: 'Bảng giá đã lưu trữ không được chỉnh sửa' });
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
            const land = Number(it.land_price_before_vat || 0);
            const constr = Number(it.construction_price_before_vat || 0);
            const vatR = Number(it.vat_rate || 8);
            const beforeVat = land + constr;
            const vatAmt = (beforeVat * vatR) / 100;
            const afterVat = beforeVat + vatAmt;
            const maint = (beforeVat * 2) / 100;

            await tx.pricebook_items.upsert({
              where: {
                pricebook_id_apartment_id: {
                  pricebook_id: id,
                  apartment_id: it.apartment_id,
                },
              },
              create: {
                id: 'pbi_' + crypto.randomBytes(6).toString('hex'),
                pricebook_id: id,
                apartment_id: it.apartment_id,
                land_price_before_vat: land,
                construction_price_before_vat: constr,
                vat_rate: vatR,
                total_price_before_vat: beforeVat,
                total_price_after_vat: afterVat,
                maintenance_fee_2percent: maint,
                notes: it.notes,
              },
              update: {
                land_price_before_vat: land,
                construction_price_before_vat: constr,
                vat_rate: vatR,
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

    res.json({ success: true, message: 'Cập nhật bảng giá thành công' });
  } catch (err) {
    console.error('Lỗi cập nhật bảng giá:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 5. Approve & Activate Pricebook (BLUEPRINT B.9.1)
 */
exports.approvePricebook = async (req, res) => {
  try {
    const { id } = req.params;
    const { activate_now = true } = req.body;
    const approverName = req.user?.username || req.user?.name || 'Ban Giám Đốc';

    const pb = await prisma.pricebooks.findUnique({
      where: { id },
      include: { pricebook_items: true },
    });

    if (!pb) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bảng giá' });
    }

    await prisma.$transaction(async (tx) => {
      if (activate_now) {
        // Archive existing active pricebooks for this phase
        await tx.pricebooks.updateMany({
          where: {
            phase_code: pb.phase_code,
            status: 'ACTIVE',
            id: { not: id },
          },
          data: { status: 'ARCHIVED' },
        });
      }

      const targetStatus = activate_now ? 'ACTIVE' : 'APPROVED';

      await tx.pricebooks.update({
        where: { id },
        data: {
          status: targetStatus,
          approved_by: approverName,
          approved_at: new Date(),
        },
      });

      // If active, sync prices to apartments table for master data consistency
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
      req.user,
      'PHÊ_DUYỆT_BẢNG_GIÁ',
      'PRICEBOOK',
      pb.id,
      pb.code,
      `Phê duyệt & kích hoạt bảng giá ${pb.code} (${activate_now ? 'ACTIVE' : 'APPROVED'})`
    );

    res.json({
      success: true,
      message: `Đã phê duyệt và ${activate_now ? 'áp dụng chính thức' : 'chờ áp dụng'} bảng giá ${pb.code}`,
    });
  } catch (err) {
    console.error('Lỗi phê duyệt bảng giá:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 6. Delete Draft Pricebook
 */
exports.deletePricebook = async (req, res) => {
  try {
    const { id } = req.params;
    const pb = await prisma.pricebooks.findUnique({ where: { id } });

    if (!pb) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bảng giá' });
    }

    if (pb.status === 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Không thể xóa bảng giá đang kích hoạt chính thức' });
    }

    await prisma.pricebooks.delete({ where: { id } });

    res.json({ success: true, message: 'Đã xóa bảng giá thành công' });
  } catch (err) {
    console.error('Lỗi xóa bảng giá:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
