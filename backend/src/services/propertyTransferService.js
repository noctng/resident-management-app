const crypto = require('crypto');
const { logActivity } = require('../utils/logger');

/**
 * Property Transfer Service (B.7)
 * Implements business logic for contract transfers, eligibility, fee calculations, and installment inheritance.
 */

function hasOverduePayments(payments = []) {
  const now = new Date();
  return payments.filter(
    (p) => p.status !== 'PAID' && p.due_date && new Date(p.due_date) < now
  ).length;
}

function calculatePaymentStats(payments = [], totalValue = 0) {
  const totalPaid = payments.reduce((sum, p) => {
    if (p.status === 'PAID') {
      return sum + Number(p.amount || 0);
    }
    return sum + Number(p.paid_amount || 0);
  }, 0);

  const numericTotalValue = Number(totalValue || 0);
  const remainingDebt = Math.max(0, numericTotalValue - totalPaid);

  return { totalPaid, remainingDebt };
}

function buildTransferData(input) {
  const transferId = input.id || 'trsf_' + crypto.randomBytes(6).toString('hex');
  const transferCode = input.transferCode || input.transfer_code || `TRSF-${Date.now()}`;
  
  return {
    id: transferId,
    contract_id: input.contractId || input.contract_id,
    old_customer_id: input.oldCustomerId || input.old_customer_id,
    new_customer_id: input.newCustomerId || input.new_customer_id,
    transfer_date: input.transferDate ? new Date(input.transferDate) : new Date(),
    notary_office: input.notaryOffice || input.notary_office || null,
    notary_number: input.notaryNumber || input.notary_number || null,
    notary_date: input.notaryDate ? new Date(input.notaryDate) : null,
    tax_clearance_date: input.taxClearanceDate ? new Date(input.taxClearanceDate) : null,
    tax_receipt_number: input.taxReceiptNumber || input.tax_receipt_number || null,
    transfer_code: transferCode,
    inherited_paid_amount: input.totalPaid !== undefined ? input.totalPaid : 0,
    remaining_debt_amount: input.remainingDebt !== undefined ? input.remainingDebt : 0,
    approval_status: input.approvalStatus || input.approval_status || 'APPROVED',
    notes: input.notes || null,
  };
}

async function checkTransferEligibility(contractId, prisma) {
  const contract = await prisma.contracts.findUnique({
    where: { id: contractId },
    include: {
      customers: true,
      apartments: true,
      contract_payments: { orderBy: { installment: 'asc' } },
      contract_transfers: { orderBy: { transfer_date: 'asc' } },
    },
  });

  if (!contract) {
    return { eligible: false, issues: ['Không tìm thấy hợp đồng'], contract: null, totalPaid: 0, remainingDebt: 0 };
  }

  const issues = [];
  const overdueCount = hasOverduePayments(contract.contract_payments);
  if (overdueCount > 0) {
    issues.push(`Hợp đồng đang có ${overdueCount} đợt thanh toán quá hạn chưa tất toán (Điều 7.3).`);
  }

  if (contract.status === 'CANCELLED') {
    issues.push('Hợp đồng đã bị hủy, không thể thực hiện chuyển nhượng.');
  }

  const { totalPaid, remainingDebt } = calculatePaymentStats(contract.contract_payments, contract.total_value);

  return {
    eligible: issues.length === 0,
    issues,
    contract,
    totalPaid,
    remainingDebt,
  };
}

function buildTransferWhereClause({ phase, search, fromDate, toDate }) {
  const where = {};

  if (phase) {
    where.contracts = {
      apartments: {
        phase_code: phase,
      },
    };
  }

  if (fromDate || toDate) {
    where.created_at = {};
    if (fromDate) where.created_at.gte = new Date(fromDate);
    if (toDate) where.created_at.lte = new Date(toDate);
  }

  if (search) {
    const term = search.trim();
    where.OR = [
      { transfer_code: { contains: term, mode: 'insensitive' } },
      { old_customer: { name: { contains: term, mode: 'insensitive' } } },
      { new_customer: { name: { contains: term, mode: 'insensitive' } } },
      { contracts: { contract_code: { contains: term, mode: 'insensitive' } } },
      { contracts: { apartments: { code: { contains: term, mode: 'insensitive' } } } },
    ];
  }

  return where;
}

function calculateTransferStats(transfers = []) {
  let totalInheritedAmount = 0;
  let totalRemainingDebt = 0;

  transfers.forEach((t) => {
    totalInheritedAmount += Number(t.inherited_paid_amount || 0);
    totalRemainingDebt += Number(t.remaining_debt_amount || 0);
  });

  return {
    totalTransfers: transfers.length,
    totalInheritedAmount,
    totalRemainingDebt,
  };
}

function buildTransferTimeline(apartment, contracts = []) {
  const timeline = [];

  contracts.forEach((contract) => {
    if (contract.created_at) {
      timeline.push({
        type: 'CONTRACT_CREATED',
        date: contract.created_at,
        title: `Tạo HĐMB ${contract.contract_code}`,
        description: `Chủ sở hữu ban đầu: ${contract.customers?.name || 'N/A'}`,
        contractCode: contract.contract_code,
      });
    }

    if (contract.contract_transfers && contract.contract_transfers.length > 0) {
      contract.contract_transfers.forEach((trsf) => {
        timeline.push({
          type: 'PROPERTY_TRANSFER',
          date: trsf.transfer_date || trsf.created_at,
          title: `Chuyển nhượng (Mã HS: ${trsf.transfer_code || trsf.id})`,
          description: `Từ ${trsf.old_customer?.name || 'N/A'} sang ${trsf.new_customer?.name || 'N/A'}. Kế thừa ${Number(trsf.inherited_paid_amount || 0).toLocaleString('vi-VN')} VNĐ`,
          transferCode: trsf.transfer_code,
          inheritedPaidAmount: Number(trsf.inherited_paid_amount || 0),
          remainingDebt: Number(trsf.remaining_debt_amount || 0),
        });
      });
    }
  });

  timeline.sort((a, b) => new Date(a.date) - new Date(b.date));
  return timeline;
}

const createTransfer = async (input, prisma) => {
  const contractId = input.contractId || input.contract_id;
  if (!contractId) return { success: false, message: 'Thiếu contract_id' };

  const contract = await prisma.contracts.findUnique({
    where: { id: contractId },
    include: {
      customers: true,
      apartments: true,
      contract_payments: true,
    },
  });
  if (!contract) return { success: false, message: 'Không tìm thấy hợp đồng' };

  const overdueCount = hasOverduePayments(contract.contract_payments);
  if (overdueCount > 0) {
    return { success: false, message: `Không đủ điều kiện chuyển nhượng theo Điều 7.3: HĐ đang có ${overdueCount} đợt thanh toán quá hạn chưa tất toán.` };
  }

  const { totalPaid, remainingDebt } = calculatePaymentStats(contract.contract_payments, contract.total_value);
  const transferData = buildTransferData({
    ...input,
    totalPaid,
    remainingDebt,
    contractId,
    oldCustomerId: contract.customer_id,
  });

  const newCustomerName = (input.newCustomerName || input.new_customer_name) || contract.customers.name;
  const transferCode = transferData.transfer_code;

  const result = await prisma.$transaction(async (tx) => {
    const newCustomerPhone = input.newCustomerPhone || input.new_customer_phone;
    const newCustomerIdNumber = input.newCustomerIdNumber || input.new_customer_id_number;
    const newCustomerAddress = input.newCustomerAddress || input.new_customer_address;
    const newCustomerEmail = input.newCustomerEmail || input.new_customer_email;

    let newCustomer = null;
    if (newCustomerPhone) {
      newCustomer = await tx.customers.findFirst({ where: { phone_number: newCustomerPhone } });
    }

    if (!newCustomer) {
      newCustomer = await tx.customers.create({
        data: {
          id: input.newCustomerId || 'cust_' + crypto.randomBytes(6).toString('hex'),
          name: newCustomerName,
          phone_number: newCustomerPhone || '',
          id_number: newCustomerIdNumber || '',
          address: newCustomerAddress || '',
          email: newCustomerEmail || '',
        },
      });
    } else {
      await tx.customers.update({
        where: { id: newCustomer.id },
        data: {
          name: newCustomerName,
          id_number: newCustomerIdNumber || newCustomer.id_number,
          address: newCustomerAddress || newCustomer.address,
          email: newCustomerEmail || newCustomer.email,
        },
      });
    }

    const transferWithCustomer = { ...transferData, new_customer_id: newCustomer.id };
    const transfer = await tx.contract_transfers.create({ data: transferWithCustomer });

    const updatedContract = await tx.contracts.update({
      where: { id: contractId },
      data: { customer_id: newCustomer.id, updated_at: new Date() },
    });

    await tx.contract_lifecycle_events.create({
      data: {
        id: 'evt_' + crypto.randomBytes(6).toString('hex'),
        contract_id: contractId,
        event_type: 'TRANSFER',
        event_date: new Date(),
        performed_by: input.user?.id || input.performedBy || 'admin',
        notes: `Chuyển nhượng HĐMB từ ${contract.customers?.name} sang ${newCustomerName} (Mã HS: ${transferCode}). Kế thừa ${totalPaid.toLocaleString('vi-VN')} đ đã đóng.`,
        metadata: {
          transfer_id: transfer.id,
          transfer_code: transferCode,
          old_customer_id: contract.customer_id,
          old_customer_name: contract.customers?.name,
          new_customer_id: newCustomer.id,
          new_customer_name: newCustomerName,
          inherited_paid_amount: totalPaid,
          remaining_debt_amount: transferWithCustomer.remaining_debt_amount,
        },
      },
    });

    return { transfer, updatedContract };
  });

  await logActivity(
    input.user,
    'CHUYỂN_NHƯỢNG_HĐMB',
    'CONTRACT_TRANSFER',
    result.transfer.id,
    contract.contract_code,
    `Chuyển nhượng HĐMB ${contract.contract_code} (Căn ${contract.apartments?.code}) từ ${contract.customers?.name} sang ${newCustomerName}. Kế thừa ${totalPaid.toLocaleString('vi-VN')} VNĐ`
  );

  return {
    success: true,
    message: `Chuyển nhượng thành công HĐMB sang ${newCustomerName} (Hồ sơ: ${transferCode})! Toàn bộ LTT và ${totalPaid.toLocaleString('vi-VN')} VNĐ đã được kế thừa nguyên vẹn.`,
    transfer: result.transfer,
  };
};

async function inheritInstallments(transferId, prisma) {
  const transfer = await prisma.contract_transfers.findUnique({
    where: { id: transferId },
    include: {
      contracts: {
        include: {
          contract_payments: { orderBy: { installment: 'asc' } },
          payment_schedules: true,
        },
      },
      new_customer: true,
      old_customer: true,
    },
  });

  if (!transfer) {
    const err = new Error('Không tìm thấy hồ sơ chuyển nhượng');
    err.status = 404;
    throw err;
  }

  const payments = transfer.contracts?.contract_payments || [];
  const { totalPaid, remainingDebt } = calculatePaymentStats(payments, transfer.contracts?.total_value);

  return {
    transferId: transfer.id,
    transferCode: transfer.transfer_code,
    contractCode: transfer.contracts?.contract_code,
    newCustomer: transfer.new_customer?.name,
    inheritedPaidAmount: totalPaid,
    remainingDebtAmount: remainingDebt,
    totalInstallments: payments.length,
    paidInstallmentsCount: payments.filter((p) => p.status === 'PAID').length,
    pendingInstallmentsCount: payments.filter((p) => p.status !== 'PAID').length,
    installments: payments,
  };
}

function calculateTransferFees(contractValue = 0, totalPaid = 0) {
  const value = Number(contractValue || 0);
  const paid = Number(totalPaid || 0);

  // Pit tax: 2% of paid or total contract value
  const pitTax = Math.round(paid * 0.02);
  // Notary fee: approx 0.1% capped
  const notaryFee = Math.min(Math.round(value * 0.001), 10000000);
  // Admin & Processing fee: standard 5,000,000 VND
  const adminFee = 5000000;
  const totalFees = pitTax + notaryFee + adminFee;

  return {
    contractValue: value,
    totalPaidAmount: paid,
    pitTax, // Thủy thu nhập cá nhân 2%
    notaryFee, // Phí công chứng
    adminFee, // Phí hành chính chủ đầu tư
    totalFees,
  };
}

module.exports = {
  hasOverduePayments,
  calculatePaymentStats,
  buildTransferData,
  checkTransferEligibility,
  buildTransferWhereClause,
  calculateTransferStats,
  buildTransferTimeline,
  createTransfer,
  inheritInstallments,
  calculateTransferFees,
};
