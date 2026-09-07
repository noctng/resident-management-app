const prisma = require('../config/prisma');
const { logActivity } = require('../utils/logger');
const crypto = require('crypto');

/**
 * Default Approval Limits by Role (B.9)
 */
const DEFAULT_LIMITS = [
  { role: 'SALES_EXECUTIVE', roleName: 'Nhân viên Kinh doanh', maxDiscountPct: 2.0 },
  { role: 'SHEAD', roleName: 'Trưởng phòng Kinh doanh', maxDiscountPct: 3.0 },
  { role: 'SM', roleName: 'Giám đốc Kinh doanh', maxDiscountPct: 5.0 },
  { role: 'DIR', roleName: 'Giám đốc Khối', maxDiscountPct: 15.0 },
  { role: 'BOARD', roleName: 'Hội đồng Quản trị', maxDiscountPct: 100.0 },
];

let inMemoryLimits = [...DEFAULT_LIMITS];

async function getApprovalLimits() {
  return inMemoryLimits;
}

async function updateApprovalLimits(limits = []) {
  if (Array.isArray(limits) && limits.length > 0) {
    inMemoryLimits = limits.map((item) => ({
      role: item.role,
      roleName: item.roleName || item.role_name || item.role,
      maxDiscountPct: Number(item.maxDiscountPct || item.max_discount_pct || 0),
    }));
  }
  return inMemoryLimits;
}

function checkApprovalRequirement(userRole = 'SALES_EXECUTIVE', discountPct = 0) {
  const userLimit = inMemoryLimits.find((l) => l.role === userRole) || DEFAULT_LIMITS[0];
  const requiresApproval = discountPct > userLimit.maxDiscountPct;

  let requiredRole = userRole;
  if (requiresApproval) {
    const higherRole = inMemoryLimits.find((l) => l.maxDiscountPct >= discountPct);
    requiredRole = higherRole ? higherRole.role : 'BOARD';
  }

  return {
    requiresApproval,
    userMaxLimit: userLimit.maxDiscountPct,
    requestedPct: discountPct,
    requiredRole,
  };
}

async function requestPromotionApproval(promotionId, requestedPct, user) {
  const promotion = await prisma.promotions.findUnique({
    where: { id: promotionId },
  });

  if (!promotion) {
    const err = new Error('Chương trình ưu đãi không tồn tại');
    err.status = 404;
    throw err;
  }

  const roleCheck = checkApprovalRequirement(user?.role || 'SALES_EXECUTIVE', Number(requestedPct));

  const approvalId = 'appr_prm_' + crypto.randomBytes(6).toString('hex');
  const approvalRequest = await prisma.approval_workflows.create({
    data: {
      id: approvalId,
      workflow_type: 'PROMOTION_DISCOUNT_OVERRIDE',
      reference_id: promotionId,
      requested_by: user?.id || 'admin',
      target_role: roleCheck.requiredRole,
      status: 'PENDING',
      request_details: {
        promotionCode: promotion.code,
        promotionName: promotion.name,
        requestedDiscountPct: Number(requestedPct),
        userRole: user?.role || 'SALES_EXECUTIVE',
        userMaxLimit: roleCheck.userMaxLimit,
        requiredRole: roleCheck.requiredRole,
      },
    },
  });

  await logActivity(
    user,
    'YÊU_CẦU_DUYỆT_CHIẾT_KHẤU',
    'PROMOTION',
    promotionId,
    promotion.code,
    `Tạo yêu cầu duyệt chiết khấu ${requestedPct}% vượt hạn mức ${roleCheck.userMaxLimit}% (Cần cấp: ${roleCheck.requiredRole})`
  );

  return {
    success: true,
    message: `Đã gửi yêu cầu phê duyệt chiết khấu ${requestedPct}% cho cấp ${roleCheck.requiredRole}`,
    approval: approvalRequest,
    roleCheck,
  };
}

async function approvePromotionRequest(approvalId, user) {
  const approval = await prisma.approval_workflows.findUnique({
    where: { id: approvalId },
  });

  if (!approval) {
    const err = new Error('Yêu cầu phê duyệt không tồn tại');
    err.status = 404;
    throw err;
  }

  if (approval.status !== 'PENDING') {
    const err = new Error('Yêu cầu phê duyệt đã được xử lý trước đó');
    err.status = 400;
    throw err;
  }

  const updated = await prisma.approval_workflows.update({
    where: { id: approvalId },
    data: {
      status: 'APPROVED',
      approved_by: user?.id || 'admin',
      approved_at: new Date(),
    },
  });

  const details = approval.request_details || {};
  if (approval.reference_id && details.requestedDiscountPct) {
    await prisma.promotions.update({
      where: { id: approval.reference_id },
      data: {
        discount_value: details.requestedDiscountPct,
        updated_at: new Date(),
      },
    });
  }

  await logActivity(
    user,
    'PHÊ_DUYỆT_CHIẾT_KHẤU',
    'PROMOTION',
    approval.reference_id || approvalId,
    approval.id,
    `Phê duyệt vượt hạn mức chiết khấu ${details.requestedDiscountPct}%`
  );

  return {
    success: true,
    message: 'Đã phê duyệt yêu cầu chiết khấu thành công',
    approval: updated,
  };
}

async function rejectPromotionRequest(approvalId, reason, user) {
  const approval = await prisma.approval_workflows.findUnique({
    where: { id: approvalId },
  });

  if (!approval) {
    const err = new Error('Yêu cầu phê duyệt không tồn tại');
    err.status = 404;
    throw err;
  }

  if (approval.status !== 'PENDING') {
    const err = new Error('Yêu cầu phê duyệt đã được xử lý trước đó');
    err.status = 400;
    throw err;
  }

  const updated = await prisma.approval_workflows.update({
    where: { id: approvalId },
    data: {
      status: 'REJECTED',
      approved_by: user?.id || 'admin',
      approved_at: new Date(),
      rejection_reason: reason || 'Từ chối bởi cấp quản lý',
    },
  });

  await logActivity(
    user,
    'TỪ_CHỐI_CHIẾT_KHẤU',
    'PROMOTION',
    approval.reference_id || approvalId,
    approval.id,
    `Từ chối yêu cầu chiết khấu: ${reason || 'Không đủ điều kiện'}`
  );

  return {
    success: true,
    message: 'Đã từ chối yêu cầu chiết khấu',
    approval: updated,
  };
}

module.exports = {
  getApprovalLimits,
  updateApprovalLimits,
  checkApprovalRequirement,
  requestPromotionApproval,
  approvePromotionRequest,
  rejectPromotionRequest,
};
