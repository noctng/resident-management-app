const prisma = require('../config/prisma');
const { logActivity } = require('../utils/logger');
const crypto = require('crypto');

/**
 * 1. Get All Leads with filters
 */
exports.getLeads = async (req, res) => {
  try {
    const { phase, status, search, lead_score } = req.query;

    const where = {};
    if (phase && phase !== 'ALL') where.phase_interest = phase;
    if (status && status !== 'ALL') where.status = status;
    if (lead_score && lead_score !== 'ALL') where.lead_score = lead_score;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone_number: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const leads = await prisma.crm_leads.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        crm_opportunities: true,
      },
    });

    // Group leads by stage for Kanban
    const stages = {
      NEW: [],
      CONTACTED: [],
      INTERESTED: [],
      SITE_VISIT: [],
      QUALIFIED: [],
      LOST: [],
      CONVERTED: [],
    };

    leads.forEach((l) => {
      const st = l.status || 'NEW';
      if (stages[st]) {
        stages[st].push(l);
      } else {
        stages.NEW.push(l);
      }
    });

    res.json({
      success: true,
      leads,
      stages,
      totalCount: leads.length,
    });
  } catch (err) {
    console.error('Lỗi lấy danh sách leads:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2. Create New Lead
 */
exports.createLead = async (req, res) => {
  try {
    const {
      name,
      phone_number,
      email,
      source = 'WALK_IN',
      phase_interest = 'TESLA',
      budget_range,
      lead_score = 'WARM',
      assigned_to,
      notes,
    } = req.body;

    if (!name || !phone_number) {
      return res.status(400).json({ success: false, message: 'Tên và số điện thoại là bắt buộc' });
    }

    const id = 'lead_' + crypto.randomBytes(6).toString('hex');
    const newLead = await prisma.crm_leads.create({
      data: {
        id,
        name,
        phone_number,
        email,
        source,
        phase_interest,
        budget_range,
        lead_score,
        assigned_to: assigned_to || req.user?.name || 'Admin',
        notes,
        status: 'NEW',
      },
    });

    await logActivity(
      req.user,
      'TẠO_LEAD_CRM',
      'LEAD',
      id,
      name,
      `Tạo lead mới quan tâm phân khu ${phase_interest} nguồn ${source}`
    );

    res.status(201).json({
      success: true,
      message: 'Tạo khách hàng tiềm năng thành công',
      lead: newLead,
    });
  } catch (err) {
    console.error('Lỗi tạo lead:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 3. Update Lead Status & Details
 */
exports.updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      phone_number,
      email,
      source,
      phase_interest,
      budget_range,
      status,
      lead_score,
      assigned_to,
      notes,
    } = req.body;

    const updated = await prisma.crm_leads.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone_number && { phone_number }),
        ...(email !== undefined && { email }),
        ...(source && { source }),
        ...(phase_interest && { phase_interest }),
        ...(budget_range !== undefined && { budget_range }),
        ...(status && { status }),
        ...(lead_score && { lead_score }),
        ...(assigned_to !== undefined && { assigned_to }),
        ...(notes !== undefined && { notes }),
        last_contact_at: new Date(),
        updated_at: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Cập nhật lead thành công',
      lead: updated,
    });
  } catch (err) {
    console.error('Lỗi cập nhật lead:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 4. Convert Lead to Opportunity / Customer
 */
exports.convertLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { apartment_id, estimated_value, title, address, id_number } = req.body;

    const lead = await prisma.crm_leads.findUnique({ where: { id } });
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lead' });
    }

    // 1. Create or Find Customer
    let customer = await prisma.customers.findFirst({
      where: { phone_number: lead.phone_number },
    });

    if (!customer) {
      customer = await prisma.customers.create({
        data: {
          id: 'cust_' + crypto.randomBytes(6).toString('hex'),
          name: lead.name,
          phone_number: lead.phone_number,
          email: lead.email,
          address: address || '',
          id_number: id_number || '',
        },
      });
    }

    // 2. Create Opportunity
    const oppId = 'opp_' + crypto.randomBytes(6).toString('hex');
    const opp = await prisma.crm_opportunities.create({
      data: {
        id: oppId,
        lead_id: lead.id,
        customer_id: customer.id,
        apartment_id: apartment_id || null,
        title: title || `Cơ hội: ${lead.name} - ${lead.phase_interest}`,
        estimated_value: estimated_value ? Number(estimated_value) : 0,
        stage: 'PRESENTATION',
        assigned_to: lead.assigned_to,
      },
    });

    // 3. Mark Lead as CONVERTED
    await prisma.crm_leads.update({
      where: { id },
      data: { status: 'CONVERTED' },
    });

    res.json({
      success: true,
      message: 'Chuyển đổi Lead sang Khách hàng & Cơ hội thành công',
      customer,
      opportunity: opp,
    });
  } catch (err) {
    console.error('Lỗi chuyển đổi lead:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 5. Delete Lead
 */
exports.deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.crm_leads.delete({ where: { id } });
    res.json({ success: true, message: 'Đã xóa lead thành công' });
  } catch (err) {
    console.error('Lỗi xóa lead:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
