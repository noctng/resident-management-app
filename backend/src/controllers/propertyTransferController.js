const prisma = require('../config/prisma');
const { logActivity } = require('../utils/logger');
const crypto = require('crypto');

/**
 * 1. Check Transfer Eligibility (BLUEPRINT B.7 & Điều 7.3 Luật KDBĐS 2023)
 */
exports.checkEligibility = async (req, res) => {
  try {
    const { contractId } = req.params;

    const contract = await prisma.contracts.findUnique({
      where: { id: contractId },
      include: {
        customers: true,
        apartments: true,
        contract_payments: {
          orderBy: { installment: 'asc' },
        },
        contract_transfers: true,
      },
    });

    if (!contract) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng' });
    }

    const now = new Date();
    const overduePayments = contract.contract_payments.filter(
      (p) => p.status !== 'PAID' && p.due_date && new Date(p.due_date) < now
    );

    const totalPaid = contract.contract_payments.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);
    const contractValue = Number(contract.total_value || 0);
    const remainingDebt = Math.max(0, contractValue - totalPaid);
    const previousTransfersCount = contract.contract_transfers.length;

    const isEligibleStatus = ['SIGNED', 'PAYING'].includes(contract.status);
    const hasNoOverdue = overduePayments.length === 0;

    const issues = [];
    if (!isEligibleStatus) {
      issues.push(`Hợp đồng đang ở trạng thái ${contract.status}, chỉ được chuyển nhượng khi ĐÃ KÝ (SIGNED) hoặc ĐANG THANH TOÁN (PAYING).`);
    }
    if (!hasNoOverdue) {
      const overdueTotal = overduePayments.reduce((sum, p) => sum + (Number(p.base_amount || 0) - Number(p.paid_amount || 0)), 0);
      issues.push(`Hợp đồng còn ${overduePayments.length} đợt thanh toán quá hạn với tổng nợ ${overdueTotal.toLocaleString('vi-VN')} VNĐ chưa tất toán.`);
    }

    const isEligible = isEligibleStatus && hasNoOverdue;

    res.json({
      success: true,
      eligible: isEligible,
      issues,
      contract: {
        id: contract.id,
        contract_code: contract.contract_code,
        apartment_code: contract.apartments?.code,
        phase_code: contract.apartments?.phase_code,
        customer_name: contract.customers?.name,
        customer_phone: contract.customers?.phone_number,
        customer_id_number: contract.customers?.id_number,
        total_value: contractValue,
        total_paid: totalPaid,
        remaining_debt: remainingDebt,
        previous_transfers_count: previousTransfersCount,
        is_speculation_warning: previousTransfersCount >= 2,
      },
      overdue_payments: overduePayments,
    });
  } catch (err) {
    console.error('Lỗi kiểm tra điều kiện chuyển nhượng:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2. Get All Transfers with Filters and KPIs
 */
exports.getTransfers = async (req, res) => {
  try {
    const { phase, search, from_date, to_date } = req.query;

    const where = {};
    if (phase && phase !== 'ALL') {
      where.contracts = { apartments: { phase_code: phase } };
    }
    if (search) {
      where.OR = [
        { transfer_code: { contains: search, mode: 'insensitive' } },
        { contracts: { contract_code: { contains: search, mode: 'insensitive' } } },
        { contracts: { apartments: { code: { contains: search, mode: 'insensitive' } } } },
        { old_customer: { name: { contains: search, mode: 'insensitive' } } },
        { new_customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (from_date || to_date) {
      where.transfer_date = {};
      if (from_date) where.transfer_date.gte = new Date(from_date);
      if (to_date) where.transfer_date.lte = new Date(to_date);
    }

    const transfers = await prisma.contract_transfers.findMany({
      where,
      include: {
        contracts: {
          include: {
            apartments: true,
          },
        },
        old_customer: true,
        new_customer: true,
      },
      orderBy: { created_at: 'desc' },
    });

    // KPI calculation
    const totalTransfers = transfers.length;
    const totalInheritedValue = transfers.reduce((sum, t) => sum + Number(t.inherited_paid_amount || 0), 0);
    const now = new Date();
    const thisMonthTransfers = transfers.filter((t) => {
      const d = new Date(t.transfer_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    // Speculation warning count (contracts with > 2 transfers)
    const aptTransferCounts = {};
    transfers.forEach((t) => {
      const aptId = t.contracts?.apartment_id;
      if (aptId) aptTransferCounts[aptId] = (aptTransferCounts[aptId] || 0) + 1;
    });
    const multiTransfersCount = Object.values(aptTransferCounts).filter((c) => c >= 2).length;

    res.json({
      success: true,
      transfers,
      totalCount: transfers.length,
      stats: {
        totalTransfers,
        totalInheritedValue,
        thisMonthTransfers,
        multiTransfersCount,
      },
    });
  } catch (err) {
    console.error('Lỗi lấy danh sách chuyển nhượng:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 3. Get Single Transfer Detail
 */
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

    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ chuyển nhượng' });
    }

    res.json({ success: true, transfer });
  } catch (err) {
    console.error('Lỗi lấy chi tiết hồ sơ chuyển nhượng:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 4. Execute Contract Transfer (Atomic Saga with 100% LTT Inheritance)
 */
exports.createTransfer = async (req, res) => {
  try {
    const {
      contract_id,
      new_customer_name,
      new_customer_phone,
      new_customer_id_number,
      new_customer_address,
      new_customer_email,
      notary_office,
      notary_number,
      notary_date,
      tax_clearance_date,
      tax_receipt_number,
      notes,
    } = req.body;

    if (!contract_id || !new_customer_name || !new_customer_phone) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp Hợp đồng, Họ tên và Số điện thoại bên nhận chuyển nhượng',
      });
    }

    const contract = await prisma.contracts.findUnique({
      where: { id: contract_id },
      include: {
        customers: true,
        apartments: true,
        contract_payments: true,
      },
    });

    if (!contract) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hợp đồng' });
    }

    // Check overdue condition
    const now = new Date();
    const overdueCount = contract.contract_payments.filter(
      (p) => p.status !== 'PAID' && p.due_date && new Date(p.due_date) < now
    ).length;

    if (overdueCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Không đủ điều kiện chuyển nhượng theo Điều 7.3: HĐ đang có ${overdueCount} đợt thanh toán quá hạn chưa tất toán.`,
      });
    }

    // Total paid and remaining debt calculation
    let totalPaid = 0;
    contract.contract_payments.forEach((p) => {
      totalPaid += Number(p.paid_amount || 0);
    });
    const totalVal = Number(contract.total_value || 0);
    const remainingDebt = Math.max(0, totalVal - totalPaid);

    const year = new Date().getFullYear();
    const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    const transferCode = `CN-TPCP-${year}-${randomSuffix}`;
    const transferId = 'trf_' + crypto.randomBytes(6).toString('hex');
    const performedBy = req.user?.id || 'admin';

    const result = await prisma.$transaction(async (tx) => {
      // 1. Find or create new customer
      let newCustomer = await tx.customers.findFirst({
        where: { phone_number: new_customer_phone },
      });

      if (!newCustomer) {
        newCustomer = await tx.customers.create({
          data: {
            id: 'cust_' + crypto.randomBytes(6).toString('hex'),
            name: new_customer_name,
            phone_number: new_customer_phone,
            id_number: new_customer_id_number || '',
            address: new_customer_address || '',
            email: new_customer_email || '',
          },
        });
      } else {
        // Update customer details if provided
        await tx.customers.update({
          where: { id: newCustomer.id },
          data: {
            name: new_customer_name,
            id_number: new_customer_id_number || newCustomer.id_number,
            address: new_customer_address || newCustomer.address,
            email: new_customer_email || newCustomer.email,
          },
        });
      }

      // 2. Insert Transfer Record
      const transferRec = await tx.contract_transfers.create({
        data: {
          id: transferId,
          transfer_code: transferCode,
          contract_id: contract.id,
          old_customer_id: contract.customer_id,
          new_customer_id: newCustomer.id,
          transfer_date: new Date(),
          notary_office: notary_office || 'Văn phòng Công chứng Thành Phố Cà Phê',
          notary_number: notary_number || '',
          notary_date: notary_date ? new Date(notary_date) : new Date(),
          tax_clearance_date: tax_clearance_date ? new Date(tax_clearance_date) : null,
          tax_receipt_number: tax_receipt_number || '',
          inherited_paid_amount: totalPaid,
          remaining_debt_amount: remainingDebt,
          approval_status: 'APPROVED',
          notes,
        },
      });

      // 3. Update Contract ownership to New Customer
      const updatedContract = await tx.contracts.update({
        where: { id: contract.id },
        data: {
          customer_id: newCustomer.id,
          updated_at: new Date(),
        },
      });

      // 4. Create Contract Lifecycle Event
      await tx.contract_lifecycle_events.create({
        data: {
          id: 'evt_' + crypto.randomBytes(6).toString('hex'),
          contract_id: contract.id,
          event_type: 'TRANSFER',
          event_date: new Date(),
          performed_by: performedBy,
          notes: `Chuyển nhượng HĐMB từ ${contract.customers?.name} sang ${newCustomer.name} (Mã HS: ${transferCode}). Kế thừa ${totalPaid.toLocaleString('vi-VN')} đ đã đóng.`,
          metadata: {
            transfer_id: transferId,
            transfer_code: transferCode,
            old_customer_id: contract.customer_id,
            old_customer_name: contract.customers?.name,
            new_customer_id: newCustomer.id,
            new_customer_name: newCustomer.name,
            inherited_paid_amount: totalPaid,
            remaining_debt_amount: remainingDebt,
          },
        },
      });

      return { transferRec, updatedContract, newCustomer };
    });

    await logActivity(
      req.user,
      'CHUYỂN_NHƯỢNG_HĐMB',
      'CONTRACT_TRANSFER',
      result.transferRec.id,
      contract.contract_code,
      `Chuyển nhượng HĐMB ${contract.contract_code} (Căn ${contract.apartments?.code}) từ ${contract.customers?.name} sang ${new_customer_name}. Kế thừa ${totalPaid.toLocaleString('vi-VN')} VNĐ`
    );

    res.status(201).json({
      success: true,
      message: `Chuyển nhượng thành công HĐMB sang ${new_customer_name} (Hồ sơ: ${transferCode})! Toàn bộ LTT và ${totalPaid.toLocaleString('vi-VN')} VNĐ đã được kế thừa nguyên vẹn.`,
      transfer: result.transferRec,
    });
  } catch (err) {
    console.error('Lỗi chuyển nhượng HĐMB:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 5. Get Apartment Lineage Chain (Cây Lịch Sử Sở Hữu Căn Hộ)
 */
exports.getApartmentTransferChain = async (req, res) => {
  try {
    const { apartmentId } = req.params;

    const apartment = await prisma.apartments.findUnique({
      where: { id: apartmentId },
      include: {
        contracts: {
          include: {
            customers: true,
            contract_transfers: {
              include: {
                old_customer: true,
                new_customer: true,
              },
              orderBy: { transfer_date: 'asc' },
            },
          },
        },
      },
    });

    if (!apartment) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy căn hộ' });
    }

    const timeline = [];

    // Milestone 0: Developer (CĐT) Initial Sale
    timeline.push({
      step: 1,
      type: 'INITIAL_DEVELOPER',
      title: 'Chủ Đầu Tư Mở Bán',
      owner_name: 'Dự án Thành Phố Cà Phê (Chủ Đầu Tư)',
      role: 'CHỦ ĐẦU TƯ',
      date: null,
      notes: `Căn hộ ${apartment.code} thuộc phân kỳ ${apartment.phase_code || 'CANTATA'}`,
    });

    if (apartment.contracts.length > 0) {
      const contract = apartment.contracts[0];

      // Milestone 1: First Buyer
      timeline.push({
        step: 2,
        type: 'FIRST_BUYER',
        title: 'Ký Hợp Đồng Mua Bán Gốc',
        owner_name: contract.customers?.name || 'Khách hàng gốc',
        owner_phone: contract.customers?.phone_number,
        owner_id_number: contract.customers?.id_number,
        role: 'CHỦ SỞ HỮU F1',
        date: contract.signed_date || contract.created_at,
        contract_code: contract.contract_code,
        contract_value: Number(contract.total_value),
        notes: 'Ký HĐMB trực tiếp với Chủ Đầu Tư',
      });

      // Subsequent Transfers
      contract.contract_transfers.forEach((trf, idx) => {
        timeline.push({
          step: idx + 3,
          type: 'TRANSFER',
          title: `Chuyển Nhượng Lần ${idx + 1}`,
          transfer_code: trf.transfer_code,
          from_owner: trf.old_customer?.name,
          to_owner: trf.new_customer?.name,
          owner_name: trf.new_customer?.name,
          owner_phone: trf.new_customer?.phone_number,
          owner_id_number: trf.new_customer?.id_number,
          role: `CHỦ SỞ HỮU F${idx + 2}`,
          date: trf.transfer_date,
          notary_office: trf.notary_office,
          notary_number: trf.notary_number,
          inherited_paid: Number(trf.inherited_paid_amount || 0),
          remaining_debt: Number(trf.remaining_debt_amount || 0),
          notes: trf.notes || 'Chuyển nhượng kế thừa 100% LTT',
        });
      });
    }

    res.json({
      success: true,
      apartment: {
        id: apartment.id,
        code: apartment.code,
        phase_code: apartment.phase_code,
        land_area: apartment.land_area,
        total_transfers: apartment.contracts[0]?.contract_transfers?.length || 0,
      },
      timeline,
    });
  } catch (err) {
    console.error('Lỗi lấy cây lịch sử chuyển nhượng:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
