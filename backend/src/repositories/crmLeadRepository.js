const prisma = require('../config/prisma');

// Chỉ chứa prisma query thuần — KHÔNG logic nghiệp vụ (Clean Architecture rule).
// Model chính: `crm_leads`. (Handler convertLead cross-module nằm ở controller,
// nên customers / crm_opportunities không đưa vào repo này.)

// GET /api/crm-leads — list leads có filter + include opportunities
async function listLeads(where) {
  return prisma.crm_leads.findMany({
    where,
    orderBy: { created_at: 'desc' },
    include: {
      crm_opportunities: true,
    },
  });
}

// GET /api/crm-leads/:id — find lead by id
async function findLeadById(id) {
  return prisma.crm_leads.findUnique({ where: { id } });
}

// POST /api/crm-leads — create lead
async function createLead(data) {
  return prisma.crm_leads.create({ data });
}

// PUT /api/crm-leads/:id — update lead
async function updateLead(id, data) {
  return prisma.crm_leads.update({ where: { id }, data });
}

// DELETE /api/crm-leads/:id — delete lead
async function deleteLead(id) {
  return prisma.crm_leads.delete({ where: { id } });
}

module.exports = {
  listLeads,
  findLeadById,
  createLead,
  updateLead,
  deleteLead,
};
