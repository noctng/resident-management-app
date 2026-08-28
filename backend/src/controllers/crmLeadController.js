const svc = require('../services/crmLeadService');
const prisma = require('../config/prisma'); // CHỈ dùng cho convertLead (cross-module, GIỮ NGUYÊN per task)
const crypto = require('crypto');

/**
 * 1. Get All Leads with filters (route → service → repo)
 */
exports.getLeads = async (req, res) => {
  try {
    const result = await svc.getLeads(req.query);
    res.json({ success: true, ...result });
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
    const newLead = await svc.createLead(req.body, req.user);
    res.status(201).json({
      success: true,
      message: 'Tạo khách hàng tiềm năng thành công',
      lead: newLead,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    console.error('Lỗi tạo lead:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 3. Update Lead Status & Details
 */
exports.updateLead = async (req, res) => {
  try {
    const updated = await svc.updateLead(req.params.id, req.body);
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
 * 4. Delete Lead
 */
exports.deleteLead = async (req, res) => {
  try {
    await svc.deleteLead(req.params.id);
    res.json({ success: true, message: 'Đã xóa lead thành công' });
  } catch (err) {
    console.error('Lỗi xóa lead:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 5. Convert Lead to Opportunity / Customer
 * ---------------------------------------------------------------------------
 * GIỮ NGUYÊN trong controller (KHÔNG chuyển sang service) vì là handler
 * CROSS-MODULE: chạm đồng thời 3 model (crm_leads + customers + crm_opportunities)
 * và tạo nhiều bản ghi liên đới. Theo REFACTOR-GUIDE §6 + convention module
 * `contract` (giữ $transaction cross-module ở controller), handler phức tạp
 * cross-module được phép giữ lại ở controller. Controller vẫn import `prisma`
 * DUY NHẤT cho handler này (xem báo cáo grep).
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
