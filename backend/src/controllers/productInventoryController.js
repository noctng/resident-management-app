const prisma = require('../config/prisma');
const { logActivity } = require('../utils/logger');
const crypto = require('crypto');

/**
 * 1. Get Real Estate Inventory and Sales Matrix grouped by Phase, Block, Floor/Lot
 */
exports.getSalesMatrix = async (req, res) => {
  try {
    const { phase = 'ALL', status, search } = req.query;

    const where = {};
    if (phase && phase !== 'ALL') {
      where.phase_code = phase;
    }
    if (status && status !== 'ALL') {
      where.sales_status = status;
    }
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { block_code: { contains: search, mode: 'insensitive' } },
        { lot_number: { contains: search, mode: 'insensitive' } },
      ];
    }

    const units = await prisma.apartments.findMany({
      where,
      orderBy: [
        { phase_code: 'asc' },
        { block_code: 'asc' },
        { floor: 'asc' },
        { code: 'asc' },
      ],
      include: {
        contracts: {
          select: {
            id: true,
            contract_code: true,
            status: true,
            customer_id: true,
            customers: {
              select: { id: true, name: true, phone_number: true },
            },
          },
        },
        sales_bookings: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            booking_code: true,
            expires_at: true,
            sales_person_id: true,
          },
        },
      },
    });

    // Grouping structure by Phase -> Block -> Units
    const matrix = {
      TESLA: {},
      CANTATA: {},
      NOXH: {},
    };

    const stats = {
      total: units.length,
      available: 0,
      booked: 0,
      deposited: 0,
      contracted: 0,
      handedOver: 0,
      locked: 0,
    };

    units.forEach((u) => {
      const p = u.phase_code || 'CANTATA';
      const b = u.block_code || 'Dãy 01';

      if (!matrix[p]) matrix[p] = {};
      if (!matrix[p][b]) matrix[p][b] = [];

      // Determine dynamic sales status
      let currentStatus = u.sales_status || 'AVAILABLE';
      if (u.contracts && u.contracts.length > 0) {
        const c = u.contracts[0];
        if (c.status === 'COMPLETED') currentStatus = 'HANDED_OVER';
        else if (c.status === 'SIGNED' || c.status === 'PAYING') currentStatus = 'CONTRACTED';
        else if (c.status === 'DEPOSIT') currentStatus = 'DEPOSITED';
      } else if (u.sales_bookings && u.sales_bookings.length > 0) {
        currentStatus = 'BOOKED';
      }

      switch (currentStatus) {
        case 'AVAILABLE': stats.available++; break;
        case 'BOOKED': stats.booked++; break;
        case 'DEPOSITED': stats.deposited++; break;
        case 'CONTRACTED': stats.contracted++; break;
        case 'HANDED_OVER': stats.handedOver++; break;
        case 'LOCKED': stats.locked++; break;
        default: stats.available++; break;
      }

      matrix[p][b].push({
        ...u,
        effectiveStatus: currentStatus,
      });
    });

    res.json({
      success: true,
      stats,
      matrix,
      units, // Also return flat list for inventory table
      totalUnits: units.length,
    });
  } catch (err) {
    console.error('Lỗi lấy ma trận bán hàng:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2. Get Single Product Unit Full Detail
 */
exports.getProductDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const unit = await prisma.apartments.findFirst({
      where: {
        OR: [{ id }, { code: id }],
      },
      include: {
        contracts: {
          include: {
            customers: true,
            contract_payments: true,
          },
        },
        sales_bookings: {
          where: { status: 'ACTIVE' },
        },
        deposit_receipts: {
          where: { status: 'ACTIVE' },
        },
        occupancies: {
          include: { residents: true },
        },
      },
    });

    if (!unit) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }

    const landPrice = Number(unit.land_price_before_vat || 0);
    const constructionPrice = Number(unit.construction_price_before_vat || 0);
    const subtotal = landPrice + constructionPrice;
    const vatRate = Number(unit.vat_rate || 8);
    const vatAmount = Math.round((subtotal * vatRate) / 100);
    const maintenanceFee2Pct = Math.round(subtotal * 0.02);
    const grandTotal = subtotal + vatAmount + maintenanceFee2Pct;

    res.json({
      success: true,
      unit: {
        ...unit,
        priceBreakdown: {
          landPrice,
          constructionPrice,
          subtotal,
          vatRate,
          vatAmount,
          maintenanceFee2Pct,
          grandTotal,
        },
      },
    });
  } catch (err) {
    console.error('Lỗi lấy chi tiết sản phẩm:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 3. Create New Real Estate Product Unit (Thêm mới sản phẩm căn hộ / lô đất)
 */
exports.createProductUnit = async (req, res) => {
  try {
    const {
      code,
      phase_code = 'CANTATA', // TESLA | CANTATA | NOXH
      block_code,
      lot_number,
      house_type = 'SHOPHOUSE',
      floor = 1,
      area,
      land_area,
      construction_area,
      usable_area,
      certificate_area,
      land_price_before_vat = 0,
      construction_price_before_vat = 0,
      vat_rate = 8.00,
      direction = 'Đông Nam',
      view_description,
      bedroom_count = 3,
      bathroom_count = 3,
      svg_coordinates,
      sales_status = 'AVAILABLE',
    } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập Mã Căn / Lô' });
    }

    // Check duplicate code
    const existing = await prisma.apartments.findUnique({ where: { code } });
    if (existing) {
      return res.status(400).json({ success: false, message: `Mã căn ${code} đã tồn tại trong hệ thống!` });
    }

    const landArea = Number(land_area || area || 100);
    const constArea = Number(construction_area || (landArea * 0.85).toFixed(1));
    const subtotal = Number(land_price_before_vat || 0) + Number(construction_price_before_vat || 0);
    const maintFee = Math.round(subtotal * 0.02);

    const unit = await prisma.apartments.create({
      data: {
        code,
        phase_code,
        block_code: block_code || 'Dãy 01',
        lot_number: lot_number || code,
        house_type,
        floor: Number(floor || 1),
        area: landArea,
        land_area: landArea,
        construction_area: constArea,
        usable_area: Number(usable_area || constArea),
        certificate_area: Number(certificate_area || landArea),
        land_price_before_vat: Number(land_price_before_vat || 0),
        construction_price_before_vat: Number(construction_price_before_vat || 0),
        vat_rate: Number(vat_rate || (phase_code === 'NOXH' ? 5.00 : 8.00)),
        maintenance_fee_2pct: maintFee,
        direction,
        view_description,
        bedroom_count: Number(bedroom_count || 3),
        bathroom_count: Number(bathroom_count || 3),
        svg_coordinates,
        sales_status,
      },
    });

    await logActivity(
      req.user,
      'THÊM_SẢN_PHẨM_BĐS',
      'APARTMENT',
      unit.id,
      unit.code,
      `Thêm mới sản phẩm ${unit.code} phân khu ${phase_code}. Giá: ${subtotal.toLocaleString('vi-VN')} VNĐ`
    );

    res.status(201).json({
      success: true,
      message: `Thêm mới sản phẩm ${unit.code} thành công!`,
      unit,
    });
  } catch (err) {
    console.error('Lỗi thêm sản phẩm:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 4. Update Product Unit (Chỉnh sửa toàn diện thông tin căn hộ)
 */
exports.updateProductUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      phase_code,
      block_code,
      lot_number,
      house_type,
      floor,
      area,
      land_area,
      construction_area,
      usable_area,
      certificate_area,
      land_price_before_vat,
      construction_price_before_vat,
      vat_rate,
      direction,
      view_description,
      bedroom_count,
      bathroom_count,
      svg_coordinates,
      sales_status,
    } = req.body;

    const existing = await prisma.apartments.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }

    const landArea = land_area !== undefined ? Number(land_area) : (area !== undefined ? Number(area) : existing.land_area);
    const constArea = construction_area !== undefined ? Number(construction_area) : existing.construction_area;
    const landPrice = land_price_before_vat !== undefined ? Number(land_price_before_vat) : Number(existing.land_price_before_vat || 0);
    const constPrice = construction_price_before_vat !== undefined ? Number(construction_price_before_vat) : Number(existing.construction_price_before_vat || 0);
    const subtotal = landPrice + constPrice;
    const maintFee = Math.round(subtotal * 0.02);

    const updated = await prisma.apartments.update({
      where: { id },
      data: {
        ...(code ? { code } : {}),
        ...(phase_code ? { phase_code } : {}),
        ...(block_code !== undefined ? { block_code } : {}),
        ...(lot_number !== undefined ? { lot_number } : {}),
        ...(house_type ? { house_type } : {}),
        ...(floor !== undefined ? { floor: Number(floor) } : {}),
        ...(landArea !== undefined ? { area: landArea, land_area: landArea } : {}),
        ...(constArea !== undefined ? { construction_area: constArea } : {}),
        ...(usable_area !== undefined ? { usable_area: Number(usable_area) } : {}),
        ...(certificate_area !== undefined ? { certificate_area: Number(certificate_area) } : {}),
        ...(land_price_before_vat !== undefined ? { land_price_before_vat: landPrice } : {}),
        ...(construction_price_before_vat !== undefined ? { construction_price_before_vat: constPrice } : {}),
        ...(vat_rate !== undefined ? { vat_rate: Number(vat_rate) } : {}),
        maintenance_fee_2pct: maintFee,
        ...(direction !== undefined ? { direction } : {}),
        ...(view_description !== undefined ? { view_description } : {}),
        ...(bedroom_count !== undefined ? { bedroom_count: Number(bedroom_count) } : {}),
        ...(bathroom_count !== undefined ? { bathroom_count: Number(bathroom_count) } : {}),
        ...(svg_coordinates !== undefined ? { svg_coordinates } : {}),
        ...(sales_status ? { sales_status } : {}),
      },
    });

    await logActivity(
      req.user,
      'CẬP_NHẬT_SẢN_PHẨM_BĐS',
      'APARTMENT',
      updated.id,
      updated.code,
      `Cập nhật thông số sản phẩm ${updated.code}`
    );

    res.json({
      success: true,
      message: `Cập nhật sản phẩm ${updated.code} thành công!`,
      unit: updated,
    });
  } catch (err) {
    console.error('Lỗi cập nhật sản phẩm:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 5. Delete Product Unit (Xóa sản phẩm khỏi kho hàng có kiểm tra an toàn)
 */
exports.deleteProductUnit = async (req, res) => {
  try {
    const { id } = req.params;

    const unit = await prisma.apartments.findUnique({
      where: { id },
      include: {
        contracts: true,
        sales_bookings: { where: { status: 'ACTIVE' } },
        deposit_receipts: { where: { status: 'ACTIVE' } },
        occupancies: true,
      },
    });

    if (!unit) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }

    if (unit.contracts && unit.contracts.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa căn ${unit.code} vì đã phát sinh ${unit.contracts.length} Hợp Đồng Mua Bán!`,
      });
    }

    if (unit.deposit_receipts && unit.deposit_receipts.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa căn ${unit.code} vì đang có Phiếu Đặt Cọc còn hiệu lực!`,
      });
    }

    if (unit.occupancies && unit.occupancies.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa căn ${unit.code} vì đang có cư dân đăng ký cư trú!`,
      });
    }

    // Safe delete
    await prisma.apartments.delete({ where: { id } });

    await logActivity(
      req.user,
      'XÓA_SẢN_PHẨM_BĐS',
      'APARTMENT',
      id,
      unit.code,
      `Xóa sản phẩm ${unit.code} khỏi kho hàng BĐS`
    );

    res.json({
      success: true,
      message: `Đã xóa sản phẩm ${unit.code} khỏi kho hàng!`,
    });
  } catch (err) {
    console.error('Lỗi xóa sản phẩm:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 6. Batch Update Status (Mở bán / Khóa bán hàng loạt)
 */
exports.batchUpdateStatus = async (req, res) => {
  try {
    const { unit_ids = [], sales_status } = req.body;

    if (!unit_ids.length || !sales_status) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn danh sách căn và trạng thái' });
    }

    const updated = await prisma.apartments.updateMany({
      where: { id: { in: unit_ids } },
      data: { sales_status },
    });

    await logActivity(
      req.user,
      'CẬP_NHẬT_KHO_HÀNG_LOẠT',
      'APARTMENT',
      'BATCH',
      `${unit_ids.length} căn`,
      `Chuyển trạng thái ${unit_ids.length} căn sang ${sales_status}`
    );

    res.json({
      success: true,
      message: `Đã cập nhật trạng thái ${updated.count} sản phẩm sang ${sales_status}!`,
      count: updated.count,
    });
  } catch (err) {
    console.error('Lỗi cập nhật hàng loạt:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
