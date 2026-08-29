const crypto = require('crypto');
const bcrypt = require('bcrypt');
const repo = require('../repositories/handoverRepository');

// Mọi logic nghiệp vụ của handover nằm ở đây.
// Service gọi repo.* (prisma thuần) — KHÔNG viết prisma query trực tiếp.
// Throw lỗi kèm `err.status` để controller format response.

// ===== 1. Create default handover checklist for a contract =====
async function createHandoverChecklist(contractId) {
  const contract = await repo.findContract(contractId);
  if (!contract) {
    const err = new Error('Hợp đồng không tồn tại');
    err.status = 404;
    throw err;
  }

  const defaultItems = [
    { name: 'Hoàn tất thanh toán ≥ 95%', order: 1, required: true },
    { name: 'Kiểm tra kỹ thuật căn hộ', order: 2, required: true },
    { name: 'Bàn giao chìa khóa', order: 3, required: true },
    { name: 'Ký biên bản bàn giao', order: 4, required: true },
    { name: 'Hướng dẫn sử dụng tiện ích', order: 5, required: false },
    { name: 'Cung cấp tài liệu bảo hành', order: 6, required: true },
  ];

  const checklistItems = defaultItems.map((item) => ({
    id: `chk_${crypto.randomBytes(4).toString('hex')}`,
    contract_id: contractId,
    item_name: item.name,
    item_order: item.order,
    is_required: item.required,
    is_completed: false,
  }));

  await repo.createManyChecklistItems(checklistItems);

  return {
    message: 'Đã tạo checklist bàn giao',
    itemsCreated: checklistItems.length,
  };
}

// ===== 2. Get handover checklist =====
async function getHandoverChecklist(contractId) {
  return repo.findChecklistByContractId(contractId);
}

// ===== 3. Update checklist item =====
async function updateChecklistItem(itemId, isCompleted, notes, actorId) {
  const item = await repo.findChecklistItem(itemId);
  if (!item) {
    const err = new Error('Mục checklist không tồn tại');
    err.status = 404;
    throw err;
  }

  await repo.updateChecklistItem(itemId, {
    is_completed: isCompleted,
    completed_at: isCompleted ? new Date() : null,
    completed_by: isCompleted ? actorId : null,
    notes: notes || item.notes,
  });

  return { message: 'Đã cập nhật checklist' };
}

// ===== 4. Check handover eligibility =====
async function checkHandoverEligibility(contractId) {
  const contract = await repo.findContractFull(contractId);
  if (!contract) {
    const err = new Error('Hợp đồng không tồn tại');
    err.status = 404;
    throw err;
  }

  const paymentSummary = await require('../services/paymentScheduleService').getContractPaymentSummary(contractId);
  const paymentPercentage = parseFloat(paymentSummary.paymentPercentage);
  const openCriticalSnags = (contract.snag_items || [])
    .filter((item) => item.status === 'OPEN' && item.severity === 'CRITICAL');

  const conditions = {
    paymentComplete: paymentPercentage >= 95,
    paymentPercentage,
    noDispute: contract.status !== 'CANCELLED',
    checklistComplete: contract.handover_checklists
      .filter((item) => item.is_required)
      .every((item) => item.is_completed),
    noCriticalSnags: openCriticalSnags.length === 0,
    openCriticalSnagsTotal: openCriticalSnags.length,
    requiredItemsTotal: contract.handover_checklists.filter((i) => i.is_required).length,
    completedItemsTotal: contract.handover_checklists.filter((i) => i.is_completed).length,
  };

  const eligible =
    conditions.paymentComplete && conditions.noDispute && conditions.checklistComplete && conditions.noCriticalSnags;

  return {
    eligible,
    conditions,
    message: eligible
      ? 'Đủ điều kiện bàn giao'
      : openCriticalSnags.length > 0
      ? `Chưa đủ điều kiện: Còn ${openCriticalSnags.length} lỗi kỹ thuật nghiêm trọng (CRITICAL) chưa sửa`
      : 'Chưa đủ điều kiện bàn giao',
  };
}

// ===== 5. Complete handover (cross-module automation) =====
async function completeHandover(contractId, handoverDate, notes, actor) {
  // Check eligibility first
  const eligibilityCheck = await checkHandoverEligibility(contractId);
  if (!eligibilityCheck.eligible) {
    const err = new Error('Chưa đủ điều kiện bàn giao');
    err.status = 400;
    err.conditions = eligibilityCheck.conditions;
    throw err;
  }

  const contract = await repo.findContractFull(contractId);

  // Update contract
  await repo.updateContract(contractId, {
    handover_completed: true,
    handover_date: handoverDate ? new Date(handoverDate) : new Date(),
    status: 'PAYING',
  });

  // AUTOMATION: Create/Link Resident & Occupancy (cross-module)
  if (contract.customers) {
    const customer = contract.customers;

    // 1. Check if resident exists
    let resident = await repo.findResidentByCriteria({
      id_number: customer.identity_card,
      phone: customer.phone,
    });

    // 2. Create if not exists
    if (!resident) {
      resident = await repo.createResident({
        name: customer.name,
        phone_number: customer.phone,
        email: customer.email,
        id_number: customer.identity_card,
        dob: customer.date_of_birth,
        gender: customer.gender,
        is_active: true,
        relationship_status: 'OWNER',
        can_use_amenities: true,
      });
    } else {
      // Update missing phone → gán lại biến để tạo account
      if (!resident.phone_number && customer.phone) {
        resident = await repo.updateResident(resident.id, {
          phone_number: customer.phone,
        });
      }
    }

    // 3. Create Account (if phone exists)
    if (resident.phone_number) {
      const existingAccount = await repo.findResidentAccount(resident.id);
      if (!existingAccount) {
        const defaultPassword = 'Abc@12345';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        await repo.createResidentAccount({
          resident_id: resident.id,
          password_hash: hashedPassword,
        });
      }
    }

    // 4. Create Occupancy (Owner)
    const existingOccupancy = await repo.findOccupancy(
      contract.apartment_id,
      resident.id,
      'RESIDING'
    );
    if (!existingOccupancy) {
      await repo.createOccupancy({
        apartment_id: contract.apartment_id,
        resident_id: resident.id,
        status: 'RESIDING',
        type: 'OWNER',
        start_date: handoverDate ? new Date(handoverDate) : new Date(),
      });
    }
  }

  // Create lifecycle event
  await repo.createLifecycleEvent({
    id: `evt_${crypto.randomBytes(4).toString('hex')}`,
    contract_id: contractId,
    event_type: 'HANDOVER',
    event_date: handoverDate ? new Date(handoverDate) : new Date(),
    performed_by: actor?.id || 'system',
    notes: notes || 'Hoàn tất bàn giao căn hộ',
  });
}

module.exports = {
  createHandoverChecklist,
  getHandoverChecklist,
  updateChecklistItem,
  checkHandoverEligibility,
  completeHandover,
};
