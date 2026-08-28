const prisma = require('../backend/src/config/prisma');

// Mock request and response
const mockReq = (body, params, user) => ({
  body,
  params,
  user: user || { id: 'admin_test', name: 'Admin Test' },
});

const mockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.data = data;
    return res;
  };
  return res;
};

// Import controller
const contractController = require('../backend/src/controllers/contractController');

async function runTest() {
  console.log('--- Starting Payment Restructure Verification ---');

  // 1. Create a dummy contract
  const contractId = `test_cont_${Date.now()}`;
  const customerId = `test_cust_${Date.now()}`;

  try {
    // We need a customer first presumably, or maybe we can skip if constraints allow.
    // Let's see if we can just create a contract with dummy customer_id if FK constraints exist.
    // Usually relational DBs enforce FK.
    // Let's try to find an existing customer or just skip creating one if possible.
    // Or actually, create a customer.

    await prisma.customers.create({
      data: {
        id: customerId,
        name: 'Test Customer',
        phone_number: '0000000000',
        email: 'test@example.com',
      },
    });

    const apartment = await prisma.apartments.findFirst();
    if (!apartment) {
      console.log('No apartment found, skipping test or creating dummy apartment (might fail)');
      // Attempt create if needed, or just fail
      throw new Error('No apartments in DB to link to test contract');
    }

    // Create contract
    await prisma.contracts.create({
      data: {
        id: contractId,
        contract_code: `TEST-${Date.now()}`,
        // customer_id: customerId, // Prisma might prefer connect
        customers: { connect: { id: customerId } },
        apartments: { connect: { id: apartment.id } },
        total_value: 10000000, // 10 mil
        vat_amount: 0,
        maintenance_fee: 0,
        status: 'DEPOSIT',
        created_at: new Date(),
      },
    });

    console.log(`[PASS] Created contract ${contractId}`);

    // 2. Create some payments
    // Payment 1: PAID (Partially?) - Let's say fully paid 2 mil
    await prisma.contract_payments.create({
      data: {
        id: `pay_${Date.now()}_1`,
        contract_id: contractId,
        installment: 1,
        amount: 2000000,
        paid_amount: 2000000,
        status: 'PAID',
        due_date: new Date(),
      },
    });

    // Payment 2: PENDING (5 mil)
    await prisma.contract_payments.create({
      data: {
        id: `pay_${Date.now()}_2`,
        contract_id: contractId,
        installment: 2,
        amount: 5000000,
        paid_amount: 0,
        status: 'PENDING',
        due_date: new Date(),
      },
    });

    // Payment 3: PENDING (3 mil)
    await prisma.contract_payments.create({
      data: {
        id: `pay_${Date.now()}_3`,
        contract_id: contractId,
        installment: 3,
        amount: 3000000,
        paid_amount: 0,
        status: 'PENDING',
        due_date: new Date(),
      },
    });

    console.log('[PASS] Created initial payments (1 PAID, 2 PENDING)');

    // 3. Call restructure
    // We want to restructure the remaining 8 mil into 4 installments
    const req = mockReq(
      {
        totalInstallments: 4,
        startDate: new Date().toISOString(),
      },
      { id: contractId }
    );
    const res = mockRes();

    await contractController.restructureContractPayments(req, res);

    if (res.statusCode && res.statusCode !== 200) {
      throw new Error(`Controller returned status ${res.statusCode}: ${JSON.stringify(res.data)}`);
    }

    console.log('[PASS] Restructure function executed');

    // 4. Verify results
    const newPayments = await prisma.contract_payments.findMany({
      where: { contract_id: contractId },
      orderBy: { installment: 'asc' },
    });

    console.log(`Total payments after restructure: ${newPayments.length}`);

    // Expected: 1 (Original Paid) + 4 (New) = 5 payments
    if (newPayments.length !== 5) {
      console.error('FAILED: Expected 5 payments, got', newPayments.length);
      newPayments.forEach((p) => console.log(`- Inst ${p.installment}: ${p.amount} (${p.status})`));
    } else {
      console.log('[PASS] Count check passed');
    }

    const totalValue = newPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    if (totalValue !== 10000000) {
      console.error(`FAILED: Total value mismatch. Expected 10,000,000, got ${totalValue}`);
    } else {
      console.log('[PASS] Total value validation passed');
    }
  } catch (err) {
    console.error('TEST FAILED:', err);
  } finally {
    try {
      await prisma.contract_payments.deleteMany({ where: { contract_id: contractId } });
      await prisma.contract_lifecycle_events.deleteMany({ where: { contract_id: contractId } });
      await prisma.contracts.delete({ where: { id: contractId } });
      await prisma.customers.delete({ where: { id: customerId } });
    } catch (e) {
      console.log('Cleanup error (ignored):', e.message);
    }

    await prisma.$disconnect();
    console.log('--- Verification Complete ---');
  }
}

runTest();
