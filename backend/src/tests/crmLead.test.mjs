import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Lấy singleton thật (CJS) để spyOn — repo & service require cùng instance này
const realPrisma = require('../config/prisma');
const prismaLeads = realPrisma.crm_leads;
const prismaCustomers = realPrisma.customers;
const prismaOpps = realPrisma.crm_opportunities;
const logger = require('../utils/logger');

function mockRes() {
  const res = {};
  res.status = (code) => { res._status = code; return res; };
  res.json = (body) => { res._json = body; return res; };
  return res;
}

describe('crmLeadService', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('getLeads returns grouped stages + totalCount', async () => {
    vi.spyOn(prismaLeads, 'findMany').mockResolvedValue([
      { id: 'l1', status: 'NEW', name: 'A', crm_opportunities: [] },
      { id: 'l2', status: 'CONTACTED', name: 'B', crm_opportunities: [] },
      { id: 'l3', status: 'UNKNOWN_STAGE', name: 'C', crm_opportunities: [] },
    ]);
    const svc = require('../services/crmLeadService');
    const r = await svc.getLeads({ phase: 'ALL', status: 'ALL', lead_score: 'ALL' });
    expect(r.totalCount).toBe(3);
    expect(r.stages.NEW).toHaveLength(2); // l1 + l3 (unknown → NEW)
    expect(r.stages.CONTACTED).toHaveLength(1); // l2
    expect(r.stages.QUALIFIED).toHaveLength(0);
    expect(r.leads).toHaveLength(3);
  });

  it('getLeads builds where from filters (search OR + phase)', async () => {
    vi.spyOn(prismaLeads, 'findMany').mockResolvedValue([]);
    const svc = require('../services/crmLeadService');
    await svc.getLeads({ phase: 'TESLA', status: 'NEW', search: 'Nguyen' });
    expect(prismaLeads.findMany).toHaveBeenCalledWith({
      where: {
        phase_interest: 'TESLA',
        status: 'NEW',
        OR: [
          { name: { contains: 'Nguyen', mode: 'insensitive' } },
          { phone_number: { contains: 'Nguyen' } },
          { email: { contains: 'Nguyen', mode: 'insensitive' } },
        ],
      },
      orderBy: { created_at: 'desc' },
      include: { crm_opportunities: true },
    });
  });

  it('createLead throws 400 when name/phone missing', async () => {
    const svc = require('../services/crmLeadService');
    await expect(svc.createLead({}, { name: 'Admin' })).rejects.toMatchObject({ status: 400 });
    await expect(svc.createLead({ name: 'A' }, { name: 'Admin' })).rejects.toMatchObject({ status: 400 });
  });

  it('createLead creates lead, defaults status NEW, logs activity', async () => {
    vi.spyOn(prismaLeads, 'create').mockImplementation(({ data }) =>
      Promise.resolve({ id: data.id, ...data })
    );
    vi.spyOn(logger, 'logActivity').mockResolvedValue();
    const svc = require('../services/crmLeadService');
    const r = await svc.createLead({ name: 'Nguyen', phone_number: '0901000000' }, { name: 'Admin' });
    expect(r.id).toMatch(/^lead_/);
    expect(r.status).toBe('NEW');
    expect(r.assigned_to).toBe('Admin');
    expect(r.source).toBe('WALK_IN');
    expect(r.phase_interest).toBe('TESLA');
    expect(prismaLeads.create).toHaveBeenCalled();
    expect(logger.logActivity).toHaveBeenCalled();
  });

  it('createLead uses assigned_to from body when provided', async () => {
    let captured;
    vi.spyOn(prismaLeads, 'create').mockImplementation(({ data }) => {
      captured = data;
      return Promise.resolve({ id: data.id, ...data });
    });
    vi.spyOn(logger, 'logActivity').mockResolvedValue();
    const svc = require('../services/crmLeadService');
    await svc.createLead(
      { name: 'Nguyen', phone_number: '0901', assigned_to: 'saler_1' },
      { name: 'Admin' }
    );
    expect(captured.assigned_to).toBe('saler_1');
  });

  it('updateLead builds data with conditional fields + timestamps', async () => {
    let captured;
    vi.spyOn(prismaLeads, 'update').mockImplementation(({ data }) => {
      captured = data;
      return Promise.resolve({ id: 'l1', ...data });
    });
    const svc = require('../services/crmLeadService');
    const r = await svc.updateLead('l1', { name: 'Moi', status: 'QUALIFIED' });
    expect(captured.name).toBe('Moi');
    expect(captured.status).toBe('QUALIFIED');
    expect(captured.last_contact_at).toBeInstanceOf(Date);
    expect(captured.updated_at).toBeInstanceOf(Date);
    expect(captured.email).toBeUndefined();
    expect(r.id).toBe('l1');
  });

  it('deleteLead calls repo.remove', async () => {
    vi.spyOn(prismaLeads, 'delete').mockResolvedValue({});
    const svc = require('../services/crmLeadService');
    await svc.deleteLead('l1');
    expect(prismaLeads.delete).toHaveBeenCalledWith({ where: { id: 'l1' } });
  });
});

describe('crmLeadController.convertLead (cross-module — kept in controller)', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('returns 404 when lead not found', async () => {
    vi.spyOn(prismaLeads, 'findUnique').mockResolvedValue(null);
    const ctrl = require('../controllers/crmLeadController');
    const res = mockRes();
    await ctrl.convertLead({ params: { id: 'missing' }, body: {} }, res);
    expect(res._status).toBe(404);
    expect(res._json.success).toBe(false);
    expect(res._json.message).toContain('Không tìm thấy');
  });

  it('creates customer + opportunity and marks lead CONVERTED', async () => {
    const lead = {
      id: 'l1', name: 'Nguyen', phone_number: '0901000000', email: 'e@x.com',
      phase_interest: 'TESLA', assigned_to: 'Admin',
    };
    vi.spyOn(prismaLeads, 'findUnique').mockResolvedValue(lead);
    vi.spyOn(prismaCustomers, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prismaCustomers, 'create').mockImplementation(({ data }) =>
      Promise.resolve({ id: 'c1', ...data })
    );
    vi.spyOn(prismaOpps, 'create').mockImplementation(({ data }) =>
      Promise.resolve({ id: 'o1', ...data })
    );
    vi.spyOn(prismaLeads, 'update').mockResolvedValue({ id: 'l1', status: 'CONVERTED' });

    const ctrl = require('../controllers/crmLeadController');
    const res = mockRes();
    await ctrl.convertLead(
      { params: { id: 'l1' }, body: { apartment_id: 'a1', estimated_value: 100 } },
      res
    );

    expect(res._status).toBeUndefined(); // 200 default
    expect(res._json.success).toBe(true);
    expect(res._json.customer.id).toMatch(/^cust_/);
    expect(res._json.opportunity.id).toMatch(/^opp_/);
    expect(prismaOpps.create).toHaveBeenCalled();
    expect(prismaLeads.update).toHaveBeenCalledWith({
      where: { id: 'l1' },
      data: { status: 'CONVERTED' },
    });
  });

  it('reuses existing customer when phone matches', async () => {
    const lead = {
      id: 'l1', name: 'Nguyen', phone_number: '0901000000', email: 'e@x.com',
      phase_interest: 'TESLA', assigned_to: 'Admin',
    };
    vi.spyOn(prismaLeads, 'findUnique').mockResolvedValue(lead);
    vi.spyOn(prismaCustomers, 'findFirst').mockResolvedValue({ id: 'existing_c' });
    vi.spyOn(prismaCustomers, 'create').mockResolvedValue({ id: 'should_not_use' });
    vi.spyOn(prismaOpps, 'create').mockImplementation(({ data }) =>
      Promise.resolve({ id: 'o1', ...data })
    );
    vi.spyOn(prismaLeads, 'update').mockResolvedValue({ id: 'l1', status: 'CONVERTED' });

    const ctrl = require('../controllers/crmLeadController');
    const res = mockRes();
    await ctrl.convertLead({ params: { id: 'l1' }, body: {} }, res);

    expect(prismaCustomers.create).not.toHaveBeenCalled();
    expect(res._json.customer.id).toBe('existing_c');
  });
});
