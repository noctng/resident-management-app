const repo = require('../repositories/crmLeadRepository');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Service: chuyển logic nghiệp vụ của crm_leads từ controller cũ vào đây.
// KHÔNG import prisma trực tiếp — chỉ gọi repo.*.
// Giữ NGUYÊN response shape / status code của các endpoint hiện có.

const STAGES = ['NEW', 'CONTACTED', 'INTERESTED', 'SITE_VISIT', 'QUALIFIED', 'LOST', 'CONVERTED'];

// Build `where` từ query param (filter danh sách leads).
function buildWhere(query = {}) {
  const { phase, status, search, lead_score } = query;
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
  return where;
}

// GET /api/crm-leads — list + group Kanban stages
async function getLeads(query = {}) {
  const where = buildWhere(query);
  const leads = await repo.listLeads(where);

  const stages = {};
  STAGES.forEach((s) => {
    stages[s] = [];
  });

  leads.forEach((l) => {
    const st = l.status || 'NEW';
    if (stages[st]) stages[st].push(l);
    else stages.NEW.push(l);
  });

  return {
    leads,
    stages,
    totalCount: leads.length,
  };
}

// POST /api/crm-leads — tạo lead mới (+ ghi log activity)
async function createLead(body = {}, user) {
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
  } = body;

  if (!name || !phone_number) {
    const err = new Error('Tên và số điện thoại là bắt buộc');
    err.status = 400;
    throw err;
  }

  const id = 'lead_' + crypto.randomBytes(6).toString('hex');
  const newLead = await repo.createLead({
    id,
    name,
    phone_number,
    email,
    source,
    phase_interest,
    budget_range,
    lead_score,
    assigned_to: assigned_to || user?.name || 'Admin',
    notes,
    status: 'NEW',
  });

  await logger.logActivity(
    user,
    'TẠO_LEAD_CRM',
    'LEAD',
    id,
    name,
    `Tạo lead mới quan tâm phân khu ${phase_interest} nguồn ${source}`
  );

  return newLead;
}

// PUT /api/crm-leads/:id — cập nhật lead (chỉ set field được truyền + timestamps)
async function updateLead(id, body = {}) {
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
  } = body;

  const data = {
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
  };

  return repo.updateLead(id, data);
}

// DELETE /api/crm-leads/:id
async function deleteLead(id) {
  await repo.deleteLead(id);
}

module.exports = {
  getLeads,
  createLead,
  updateLead,
  deleteLead,
};
