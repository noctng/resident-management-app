const service = require('../services/propertyTransferService');
const prisma = require('../config/prisma');

// Controller giữ lại 2 endpoint xử lý business logic
// Các handler gọi service, KHÔNG import prisma trực tiếp (ngoại trừ transaction)

exports.checkEligibility = async (req, res) => {
  try {
    const { contractId } = req.params;
    const { eligible, issues, contract, totalPaid, remainingDebt } = await service.checkTransferEligibility(contractId, prisma);

    if (!eligible && !contract) {
      return res.status(404).json({ success: false, message: issues[0] });
    }

    const overduePayments = contract?.contract_payments?.filter((p) => p.status !== 'PAID' && p.due_date && new Date(p.due_date) < new Date()) || [];
    const previousTransfers = contract?.contract_transfers?.length || 0;

    res.json({
      success: true,
      eligible,
      issues,
      contract: {
        id: contract.id,
        contract_code: contract.contract_code,
        apartment_code: contract.apartments?.code,
        phase_code: contract.apartments?.phase_code,
        customer_name: contract.customers?.name,
        customer_phone: contract.customers?.phone_number,
        customer_id_number: contract.customers?.id_number,
        total_value: Number(contract.total_value || 0),
        total_paid: totalPaid,
        remaining_debt: remainingDebt,
        previous_transfers_count: previousTransfers,
        is_speculation_warning: previousTransfers >= 2,
      },
      overdue_payments: overduePayments,
    });
  } catch (err) {
    console.error('Lỗi kiểm tra điều kiện chuyển nhượng:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTransfers = async (req, res) => {
  try {
    const { phase, search, from_date, to_date } = req.query;
    const where = service.buildTransferWhereClause({ phase, search, fromDate: from_date, toDate: to_date });
    const transfers = await prisma.contract_transfers.findMany({
      where,
      include: { contracts: { include: { apartments: true } }, old_customer: true, new_customer: true },
      orderBy: { created_at: 'desc' },
    });
    const stats = service.calculateTransferStats(transfers);
    res.json({ success: true, transfers, totalCount: transfers.length, stats });
  } catch (err) {
    console.error('Lỗi lấy danh sách chuyển nhượng:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTransferDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const transfer = await prisma.contract_transfers.findUnique({
      where: { id },
      include: {
        contracts: {
          include: {
            apartments: true,
            contract_payments: { orderBy: { installment: 'asc' } },
            contract_promotions: true,
          },
        },
        old_customer: true,
        new_customer: true,
      },
    });
    if (!transfer) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ chuyển nhượng' });
    res.json({ success: true, transfer });
  } catch (err) {
    console.error('Lỗi lấy chi tiết hồ sơ chuyển nhượng:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createTransfer = async (req, res) => {
  try {
    const result = await service.createTransfer({ ...req.body, user: req.user }, prisma);
    if (!result.success) return res.status(result.message.includes('Không đủ') ? 400 : 500).json({ success: false, message: result.message });
    res.status(201).json({ success: true, message: result.message, transfer: result.transfer });
  } catch (err) {
    console.error('Lỗi chuyển nhượng HĐMB:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getApartmentTransferChain = async (req, res) => {
  try {
    const { apartmentId } = req.params;
    const apartment = await prisma.apartments.findUnique({
      where: { id: apartmentId },
      include: {
        contracts: {
          include: {
            customers: true,
            contract_transfers: { include: { old_customer: true, new_customer: true }, orderBy: { transfer_date: 'asc' } },
          },
        },
      },
    });
    if (!apartment) return res.status(404).json({ success: false, message: 'Không tìm thấy căn hộ' });
    const timeline = service.buildTransferTimeline(apartment, apartment.contracts);
    res.json({
      success: true,
      apartment: { id: apartment.id, code: apartment.code, phase_code: apartment.phase_code, land_area: apartment.land_area, total_transfers: apartment.contracts[0]?.contract_transfers?.length || 0 },
      timeline,
    });
  } catch (err) {
    console.error('Lỗi lấy cây lịch sử chuyển nhượng:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};