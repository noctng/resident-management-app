const prisma = require('../config/prisma');
const { logActivity } = require('../utils/logger');
const crypto = require('crypto');

/**
 * 1. Get Warranty Claims & 4 KPI Stats
 */
exports.getWarrantyClaims = async (req, res) => {
  try {
    const { phase, status, severity, contractor_id, apartment_id, search } = req.query;

    const where = {};
    if (status && status !== 'ALL') where.status = status;
    if (severity && severity !== 'ALL') where.severity = severity;
    if (contractor_id && contractor_id !== 'ALL') where.contractor_id = contractor_id;
    if (apartment_id) where.apartment_id = apartment_id;
    if (phase && phase !== 'ALL') {
      where.apartments = { phase_code: phase };
    }
    if (search) {
      where.OR = [
        { claim_code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location_detail: { contains: search, mode: 'insensitive' } },
        { apartments: { code: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const claims = await prisma.warranty_claims.findMany({
      where,
      include: {
        apartments: true,
        contracts: {
          include: { customers: true },
        },
        contractors: true,
      },
      orderBy: { created_at: 'desc' },
    });

    // KPI stats
    const now = new Date();
    const totalClaims = claims.length;
    const inProgressCount = claims.filter((c) => ['ASSIGNED', 'IN_PROGRESS'].includes(c.status)).length;
    const overdueSlaCount = claims.filter((c) => {
      if (['COMPLETED', 'CANCELLED'].includes(c.status)) return false;
      return c.sla_deadline && new Date(c.sla_deadline) < now;
    }).length;
    const completedList = claims.filter((c) => c.status === 'COMPLETED' && c.customer_rating);
    const avgRating = completedList.length > 0
      ? (completedList.reduce((sum, c) => sum + (c.customer_rating || 5), 0) / completedList.length).toFixed(1)
      : '5.0';

    res.json({
      success: true,
      claims,
      stats: {
        totalClaims,
        inProgressCount,
        overdueSlaCount,
        avgRating,
      },
    });
  } catch (err) {
    console.error('Lỗi lấy danh sách bảo hành:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2. Create Warranty Claim (Auto verifies warranty duration from handover)
 */
exports.createWarrantyClaim = async (req, res) => {
  try {
    const {
      apartment_id,
      contract_id,
      category = 'KY_THUAT',
      location_detail,
      description,
      severity = 'NORMAL',
      photo_urls = [],
      contractor_id,
      notes,
    } = req.body;

    if (!apartment_id || !description) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp căn hộ và mô tả sự cố bảo hành' });
    }

    // Check Handover date to verify warranty eligibility
    let isUnderWarranty = true;
    let finalContractId = contract_id;

    const contract = await prisma.contracts.findFirst({
      where: {
        apartment_id,
        ...(contract_id ? { id: contract_id } : {}),
      },
      orderBy: { created_at: 'desc' },
    });

    if (contract) {
      finalContractId = contract.id;
      const handoverDate = contract.handover_date_actual || contract.handover_date;
      if (handoverDate) {
        const now = new Date();
        const diffMonths = (now.getFullYear() - new Date(handoverDate).getFullYear()) * 12 +
          (now.getMonth() - new Date(handoverDate).getMonth());
        // Structural: 60m, Mechanical/Electrical: 24m, General: 12m
        const warrantyLimit = ['KET_CAU_THAM'].includes(category) ? 60 : 24;
        if (diffMonths > warrantyLimit) {
          isUnderWarranty = false;
        }
      }
    }

    // Calculate SLA Deadline
    const now = new Date();
    let slaHours = 48; // NORMAL: 48h
    if (severity === 'CRITICAL') slaHours = 4;
    else if (severity === 'HIGH') slaHours = 24;
    const slaDeadline = new Date(now.getTime() + slaHours * 60 * 60 * 1000);

    const year = new Date().getFullYear();
    const lastClaim = await prisma.warranty_claims.findFirst({
      where: { claim_code: { startsWith: `BH-TPCP-${year}-` } },
      orderBy: { claim_code: 'desc' },
      select: { claim_code: true },
    });

    let nextNum = 1;
    if (lastClaim) {
      const parts = lastClaim.claim_code.split('-');
      const lastNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1;
      }
    }
    const claimCode = `BH-TPCP-${year}-${String(nextNum).padStart(4, '0')}`;
    const claimId = 'claim_' + crypto.randomBytes(6).toString('hex');
    const uploader = req.user?.username || req.user?.name || req.resident?.name || 'Cư dân';

    const claim = await prisma.warranty_claims.create({
      data: {
        id: claimId,
        claim_code: claimCode,
        apartment_id,
        contract_id: finalContractId,
        contractor_id: contractor_id || null,
        category,
        location_detail: location_detail || 'Toàn căn hộ',
        description,
        severity,
        status: contractor_id ? 'ASSIGNED' : 'REPORTED',
        is_under_warranty: isUnderWarranty,
        sla_deadline: slaDeadline,
        photo_urls,
        notes,
        created_by: uploader,
      },
      include: {
        apartments: true,
        contractors: true,
      },
    });

    await logActivity(
      req.user,
      'TIẾP_NHẬN_BẢO_HÀNH',
      'WARRANTY_CLAIM',
      claim.id,
      claim.claim_code,
      `Tiếp nhận sự cố bảo hành ${claim.claim_code} - Căn ${claim.apartments?.code}`
    );

    res.status(201).json({
      success: true,
      message: 'Tiếp nhận sự cố bảo hành thành công!',
      claim,
    });
  } catch (err) {
    console.error('Lỗi tạo yêu cầu bảo hành:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 3. Assign Contractor & Schedule Repair
 */
exports.assignContractor = async (req, res) => {
  try {
    const { id } = req.params;
    const { contractor_id, scheduled_at, resolution_notes } = req.body;

    const claim = await prisma.warranty_claims.update({
      where: { id },
      data: {
        contractor_id,
        scheduled_at: scheduled_at ? new Date(scheduled_at) : undefined,
        resolution_notes: resolution_notes || undefined,
        status: 'IN_PROGRESS',
        updated_at: new Date(),
      },
      include: {
        apartments: true,
        contractors: true,
      },
    });

    await logActivity(
      req.user,
      'ĐIỀU_PHỐI_NHÀ_THẦU_BH',
      'WARRANTY_CLAIM',
      claim.id,
      claim.claim_code,
      `Điều phối nhà thầu ${claim.contractors?.name} xử lý sự cố ${claim.claim_code}`
    );

    res.json({
      success: true,
      message: 'Đã điều phối nhà thầu và lên lịch sửa chữa thành công!',
      claim,
    });
  } catch (err) {
    console.error('Lỗi điều phối nhà thầu:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 4. Complete Warranty Claim (Acceptance & Rating)
 */
exports.completeWarrantyClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_signature, customer_rating = 5, resolution_notes } = req.body;

    const claim = await prisma.warranty_claims.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completed_at: new Date(),
        customer_signature: customer_signature || undefined,
        customer_rating: Number(customer_rating),
        resolution_notes: resolution_notes || undefined,
        updated_at: new Date(),
      },
      include: {
        apartments: true,
        contractors: true,
      },
    });

    // Update contractor average rating
    if (claim.contractor_id) {
      const allDone = await prisma.warranty_claims.findMany({
        where: { contractor_id: claim.contractor_id, status: 'COMPLETED' },
        select: { customer_rating: true },
      });
      const avg = allDone.reduce((sum, c) => sum + (c.customer_rating || 5), 0) / allDone.length;
      await prisma.contractors.update({
        where: { id: claim.contractor_id },
        data: { rating: Number(avg.toFixed(2)) },
      });
    }

    await logActivity(
      req.user,
      'NGHIỆM_THU_BẢO_HÀNH',
      'WARRANTY_CLAIM',
      claim.id,
      claim.claim_code,
      `Nghiệm thu đóng ticket bảo hành ${claim.claim_code} - Đánh giá: ${customer_rating} sao`
    );

    res.json({
      success: true,
      message: 'Nghiệm thu và đóng hồ sơ bảo hành thành công!',
      claim,
    });
  } catch (err) {
    console.error('Lỗi nghiệm thu bảo hành:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 5. Get Contractors Directory & Quality Score
 */
exports.getContractors = async (req, res) => {
  try {
    const contractors = await prisma.contractors.findMany({
      where: { is_active: true },
      include: {
        _count: {
          select: {
            warranty_claims: true,
          },
        },
      },
      orderBy: { rating: 'desc' },
    });

    res.json({ success: true, contractors });
  } catch (err) {
    console.error('Lỗi lấy danh mục nhà thầu:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 6. Create Contractor
 */
exports.createContractor = async (req, res) => {
  try {
    const { name, code, contact_person, phone, email, trade_type } = req.body;
    const cId = 'ctr_' + crypto.randomBytes(4).toString('hex');
    const contractor = await prisma.contractors.create({
      data: {
        id: cId,
        code: code || `NT-${Date.now().toString().slice(-4)}`,
        name,
        contact_person,
        phone,
        email,
        trade_type: trade_type || 'GENERAL',
      },
    });

    res.status(201).json({ success: true, contractor });
  } catch (err) {
    console.error('Lỗi tạo nhà thầu:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 7. Update Contractor
 */
exports.updateContractor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact_person, phone, email, trade_type, is_active } = req.body;

    const existing = await prisma.contractors.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhà thầu' });
    }

    const updated = await prisma.contractors.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        contact_person: contact_person !== undefined ? contact_person?.trim() : existing.contact_person,
        phone: phone !== undefined ? phone?.trim() : existing.phone,
        email: email !== undefined ? email?.trim() : existing.email,
        trade_type: trade_type !== undefined ? trade_type : existing.trade_type,
        is_active: is_active !== undefined ? Boolean(is_active) : existing.is_active,
      },
    });

    res.json({ success: true, message: 'Cập nhật nhà thầu thành công!', contractor: updated });
  } catch (err) {
    console.error('Lỗi cập nhật nhà thầu:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 8. Delete / Deactivate Contractor
 */
exports.deleteContractor = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.contractors.findUnique({
      where: { id },
      include: {
        _count: {
          select: { warranty_claims: true },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhà thầu' });
    }

    if (existing._count?.warranty_claims > 0) {
      // Soft-delete / deactivate
      await prisma.contractors.update({
        where: { id },
        data: { is_active: false },
      });
      return res.json({
        success: true,
        message: `Đã vô hiệu hóa nhà thầu "${existing.name}" (giữ lại lịch sử ${existing._count.warranty_claims} ticket bảo hành).`,
      });
    }

    await prisma.contractors.delete({ where: { id } });
    res.json({ success: true, message: `Đã xóa nhà thầu "${existing.name}" thành công!` });
  } catch (err) {
    console.error('Lỗi xóa nhà thầu:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
