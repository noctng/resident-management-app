const prisma = require('../config/prisma');
const { logActivity } = require('../utils/logger');
const crypto = require('crypto');

/**
 * 1. Get all promotions
 */
exports.getPromotions = async (req, res) => {
  try {
    const { phase, status, type } = req.query;

    const where = {};
    if (phase && phase !== 'ALL') where.applies_to_phase = phase;
    if (status && status !== 'ALL') where.status = status;
    if (type && type !== 'ALL') where.promo_type = type;

    const promotions = await prisma.promotions.findMany({
      where,
      include: {
        _count: {
          select: { contract_promotions: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    res.json({ success: true, promotions, totalCount: promotions.length });
  } catch (err) {
    console.error('Lỗi lấy danh sách chương trình ưu đãi:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2. Create Promotion
 */
exports.createPromotion = async (req, res) => {
  try {
    const {
      name,
      promo_type = 'DIRECT_DISCOUNT',
      discount_type = 'PERCENTAGE',
      discount_value = 0,
      gift_description,
      applies_to_phase = 'ALL',
      min_units_required = 1,
      max_discount_cap_percent = 10,
      requires_approval_above_percent = 2,
      start_date,
      end_date,
      terms_conditions,
    } = req.body;

    if (!name || !start_date) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên chương trình và ngày bắt đầu' });
    }

    const code = 'KM-' + new Date().getFullYear() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const id = 'prm_' + crypto.randomBytes(6).toString('hex');
    const createdBy = req.user?.username || req.user?.name || 'Admin';

    const promotion = await prisma.promotions.create({
      data: {
        id,
        code,
        name,
        promo_type,
        discount_type,
        discount_value: Number(discount_value),
        gift_description,
        applies_to_phase,
        min_units_required: Number(min_units_required) || 1,
        max_discount_cap_percent: Number(max_discount_cap_percent) || 10,
        requires_approval_above_percent: Number(requires_approval_above_percent) || 2,
        status: 'ACTIVE',
        start_date: new Date(start_date),
        end_date: end_date ? new Date(end_date) : null,
        terms_conditions,
        created_by: createdBy,
      },
    });

    await logActivity(
      req.user,
      'TẠO_CHƯƠNG_TRÌNH_ƯU_ĐÃI',
      'PROMOTION',
      promotion.id,
      promotion.code,
      `Tạo chương trình ưu đãi: ${promotion.name} (${promotion.code})`
    );

    res.status(201).json({
      success: true,
      message: `Tạo chương trình ưu đãi ${promotion.code} thành công`,
      promotion,
    });
  } catch (err) {
    console.error('Lỗi tạo chương trình ưu đãi:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 3. Update Promotion
 */
exports.updatePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      promo_type,
      discount_type,
      discount_value,
      gift_description,
      applies_to_phase,
      min_units_required,
      max_discount_cap_percent,
      requires_approval_above_percent,
      status,
      start_date,
      end_date,
      terms_conditions,
    } = req.body;

    const promotion = await prisma.promotions.update({
      where: { id },
      data: {
        name,
        promo_type,
        discount_type,
        discount_value: discount_value !== undefined ? Number(discount_value) : undefined,
        gift_description,
        applies_to_phase,
        min_units_required: min_units_required !== undefined ? Number(min_units_required) : undefined,
        max_discount_cap_percent: max_discount_cap_percent !== undefined ? Number(max_discount_cap_percent) : undefined,
        requires_approval_above_percent: requires_approval_above_percent !== undefined ? Number(requires_approval_above_percent) : undefined,
        status,
        start_date: start_date ? new Date(start_date) : undefined,
        end_date: end_date ? new Date(end_date) : null,
        terms_conditions,
        updated_at: new Date(),
      },
    });

    res.json({ success: true, message: 'Cập nhật chương trình ưu đãi thành công', promotion });
  } catch (err) {
    console.error('Lỗi cập nhật ưu đãi:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 4. Toggle status (ACTIVE <-> INACTIVE)
 */
exports.togglePromotionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const promo = await prisma.promotions.findUnique({ where: { id } });
    if (!promo) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy chương trình ưu đãi' });
    }

    const nextStatus = promo.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated = await prisma.promotions.update({
      where: { id },
      data: { status: nextStatus, updated_at: new Date() },
    });

    res.json({ success: true, message: `Đã chuyển trạng thái thành ${nextStatus}`, promotion: updated });
  } catch (err) {
    console.error('Lỗi đổi trạng thái ưu đãi:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 5. Calculate applicable promotions & check approval caps (B.9.2)
 */
exports.calculateDiscount = async (req, res) => {
  try {
    const { base_price, promotion_ids = [] } = req.body;
    const numBase = Number(base_price || 0);

    if (numBase <= 0) {
      return res.status(400).json({ success: false, message: 'Giá gốc không hợp lệ' });
    }

    const activePromos = await prisma.promotions.findMany({
      where: {
        id: { in: promotion_ids },
        status: 'ACTIVE',
      },
    });

    let totalDiscountAmount = 0;
    let gifts = [];
    const breakdown = [];

    for (const p of activePromos) {
      let discountAmt = 0;
      if (p.discount_type === 'PERCENTAGE') {
        discountAmt = (numBase * Number(p.discount_value)) / 100;
      } else if (p.discount_type === 'FIXED_AMOUNT') {
        discountAmt = Number(p.discount_value);
      } else if (p.discount_type === 'GIFT') {
        if (p.gift_description) gifts.push(p.gift_description);
      }

      totalDiscountAmount += discountAmt;
      breakdown.push({
        promotion_id: p.id,
        code: p.code,
        name: p.name,
        discount_amount: discountAmt,
        gift: p.gift_description || null,
      });
    }

    const discountPercent = numBase > 0 ? (totalDiscountAmount / numBase) * 100 : 0;
    const requiresApproval = discountPercent > 2.0; // BLUEPRINT limit
    const exceedsCap = discountPercent > 10.0;

    res.json({
      success: true,
      base_price: numBase,
      total_discount_amount: totalDiscountAmount,
      final_price: numBase - totalDiscountAmount,
      discount_percent: discountPercent,
      requires_approval: requiresApproval,
      exceeds_cap: exceedsCap,
      gifts,
      breakdown,
    });
  } catch (err) {
    console.error('Lỗi tính chiết khấu ưu đãi:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
