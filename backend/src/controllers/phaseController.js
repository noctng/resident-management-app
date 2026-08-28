const prisma = require('../config/prisma');
const { logActivity } = require('../utils/logger');
const crypto = require('crypto');

/**
 * 1. Get All Project Phases
 */
exports.getPhases = async (req, res) => {
  try {
    const phases = await prisma.project_phases.findMany({
      orderBy: [{ display_order: 'asc' }, { created_at: 'asc' }],
    });

    // Calculate real-time counts from apartments table
    const aptCounts = await prisma.apartments.groupBy({
      by: ['phase_code'],
      _count: { id: true },
    });

    const countMap = {};
    aptCounts.forEach((c) => {
      if (c.phase_code) countMap[c.phase_code.toUpperCase()] = c._count.id;
    });

    const enriched = phases.map((p) => ({
      ...p,
      apartment_count: countMap[p.phase_code.toUpperCase()] || 0,
    }));

    res.json({ success: true, phases: enriched });
  } catch (err) {
    console.error('Lỗi lấy danh sách phân khu:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2. Create Project Phase
 */
exports.createPhase = async (req, res) => {
  try {
    const { phase_code, phase_name, description, display_order = 0 } = req.body;

    if (!phase_code || !phase_name) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập Mã phân khu (viết tắt) và Tên phân khu',
      });
    }

    const cleanCode = phase_code.trim().toUpperCase().replace(/\s+/g, '_');

    const existing = await prisma.project_phases.findUnique({
      where: { phase_code: cleanCode },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Mã phân khu "${cleanCode}" đã tồn tại trên hệ thống`,
      });
    }

    const phaseId = 'phase_' + crypto.randomBytes(4).toString('hex');
    const phase = await prisma.project_phases.create({
      data: {
        id: phaseId,
        phase_code: cleanCode,
        phase_name: phase_name.trim(),
        description: description?.trim() || null,
        display_order: Number(display_order) || 0,
        is_active: true,
      },
    });

    await logActivity(
      req.user,
      'TẠO_PHÂN_KHU',
      'PROJECT_PHASE',
      phase.id,
      phase.phase_name,
      `Thêm phân khu dự án mới: ${phase.phase_name} (${phase.phase_code})`
    );

    res.status(201).json({
      success: true,
      message: `Đã thêm phân khu ${phase.phase_name} thành công!`,
      phase,
    });
  } catch (err) {
    console.error('Lỗi tạo phân khu:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 3. Update Project Phase
 */
exports.updatePhase = async (req, res) => {
  try {
    const { id } = req.params;
    const { phase_name, description, display_order, is_active } = req.body;

    const existing = await prisma.project_phases.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phân khu' });
    }

    const updated = await prisma.project_phases.update({
      where: { id },
      data: {
        phase_name: phase_name ? phase_name.trim() : existing.phase_name,
        description: description !== undefined ? description?.trim() : existing.description,
        display_order: display_order !== undefined ? Number(display_order) : existing.display_order,
        is_active: is_active !== undefined ? Boolean(is_active) : existing.is_active,
        updated_at: new Date(),
      },
    });

    await logActivity(
      req.user,
      'CẬP_NHẬT_PHÂN_KHU',
      'PROJECT_PHASE',
      updated.id,
      updated.phase_name,
      `Cập nhật thông tin phân khu: ${updated.phase_name}`
    );

    res.json({
      success: true,
      message: 'Cập nhật phân khu thành công!',
      phase: updated,
    });
  } catch (err) {
    console.error('Lỗi cập nhật phân khu:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 4. Delete / Deactivate Project Phase
 */
exports.deletePhase = async (req, res) => {
  try {
    const { id } = req.params;
    const phase = await prisma.project_phases.findUnique({ where: { id } });

    if (!phase) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phân khu' });
    }

    // Check if any apartments belong to this phase
    const count = await prisma.apartments.count({
      where: { phase_code: phase.phase_code },
    });

    if (count > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa phân khu "${phase.phase_name}" vì đang có ${count} căn hộ trực thuộc. Bạn có thể chọn ẩn/vô hiệu hóa phân khu.`,
      });
    }

    await prisma.project_phases.delete({ where: { id } });

    await logActivity(
      req.user,
      'XÓA_PHÂN_KHU',
      'PROJECT_PHASE',
      phase.id,
      phase.phase_name,
      `Xóa phân khu ${phase.phase_name} (${phase.phase_code})`
    );

    res.json({
      success: true,
      message: `Đã xóa phân khu ${phase.phase_name} thành công!`,
    });
  } catch (err) {
    console.error('Lỗi xóa phân khu:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
