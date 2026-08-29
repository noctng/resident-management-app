const crypto = require('crypto');
const { logActivity } = require('../utils/logger');
const repo = require('../repositories/promotionRepository');

const buildWhereClause = (filters) => {
  const where = {};
  if (filters.phase && filters.phase !== 'ALL') where.applies_to_phase = filters.phase;
  if (filters.status && filters.status !== 'ALL') where.status = filters.status;
  if (filters.type && filters.type !== 'ALL') where.promo_type = filters.type;
  return where;
};

const getPromotions = async (filters) => {
  const where = buildWhereClause(filters);
  const promotions = await repo.findAll(where);
  return { success: true, promotions, totalCount: promotions.length };
};

const createPromotion = async (body, user) => {
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
  } = body;

  if (!name || !start_date) {
    return { success: false, message: 'Vui lòng nhập tên chương trình và ngày bắt đầu' };
  }

  const code = 'KM-' + new Date().getFullYear() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  const id = 'prm_' + crypto.randomBytes(6).toString('hex');
  const createdBy = user?.username || user?.name || 'Admin';

  const promotion = await repo.create({
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
  });

  await logActivity(
    user,
    'TẠO_CHƯƠNG_TRÌNH_ƯU_ĐÃI',
    'PROMOTION',
    promotion.id,
    promotion.code,
    `Tạo chương trình ưu đãi: ${promotion.name} (${promotion.code})`
  );

  return { success: true, message: `Tạo chương trình ưu đãi ${promotion.code} thành công`, promotion };
};

const updatePromotion = async (id, body) => {
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
  } = body;

  const promotion = await repo.update(id, {
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
  });

  return { success: true, message: 'Cập nhật chương trình ưu đãi thành công', promotion };
};

const togglePromotionStatus = async (id) => {
  const promo = await repo.findById(id);
  if (!promo) return { success: false, message: 'Không tìm thấy chương trình ưu đãi' };

  const nextStatus = promo.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  const updated = await repo.updateStatus(id, nextStatus);
  return { success: true, message: `Đã chuyển trạng thái thành ${nextStatus}`, promotion: updated };
};

// Pure business logic: tính chiết khấu từ danh sách promotion_ids
const calculateDiscount = async (base_price, promotion_ids = []) => {
  const numBase = Number(base_price || 0);
  if (numBase <= 0) return { success: false, message: 'Giá gốc không hợp lệ' };

  const activePromos = await repo.findActiveByIds(promotion_ids);

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

  return {
    success: true,
    base_price: numBase,
    total_discount_amount: totalDiscountAmount,
    final_price: numBase - totalDiscountAmount,
    discount_percent: discountPercent,
    requires_approval: requiresApproval,
    exceeds_cap: exceedsCap,
    gifts,
    breakdown,
  };
};

module.exports = {
  buildWhereClause,
  getPromotions,
  createPromotion,
  updatePromotion,
  togglePromotionStatus,
  calculateDiscount,
};
