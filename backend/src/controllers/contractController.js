const prisma = require('../config/prisma');
const path = require('path');
const { generateRandomId } = require('../utils/helpers');
const { saveFile, saveFileWithExactName } = require('../utils/fileHelpers');
const { logActivity } = require('../utils/logger');
const { sendEmail } = require('../services/emailService');
const { createNotificationRecord } = require('../services/notificationService');
const { getRenderedContent } = require('../services/templateService');
const svc = require('../services/contractService');

// --- Contract CRUD cốt lõi (mỏng: parse req → service → res) ---

exports.getAllContracts = async (req, res) => {
  try {
    const contracts = await svc.getAllContracts();
    res.json(contracts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ khi tải danh sách hợp đồng' });
  }
};

exports.getContractById = async (req, res) => {
  try {
    const contract = await svc.getContractById(req.params.id);
    res.json(contract);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi máy chủ khi tải chi tiết hợp đồng' });
  }
};

exports.createContract = async (req, res) => {
  try {
    const newContract = await svc.createContract(req.body);

    await logActivity(
      req.user,
      'TẠO_HỢP_ĐỒNG',
      'CONTRACT',
      newContract.id,
      newContract.contract_code,
      `Tạo hợp đồng mới trị giá ${newContract.total_value}`
    );

    res.status(201).json(newContract);
  } catch (err) {
    console.error(err);
    if (err.code === 'P2002') {
      return res.status(400).json({ message: 'Mã hợp đồng đã tồn tại' });
    }
    res.status(500).json({ message: 'Lỗi máy chủ khi tạo hợp đồng' });
  }
};

exports.updateContract = async (req, res) => {
  try {
    const { oldContract, updatedContract } = await svc.updateContract(req.params.id, req.body);

    const action = updatedContract.status === 'CANCELLED' ? 'CANCEL_CONTRACT' : 'UPDATE';
    await logActivity(
      req.user,
      action,
      'CONTRACT',
      req.params.id,
      updatedContract.contract_code,
      `Cập nhật hợp đồng: ${updatedContract.contract_code}`,
      oldContract,
      updatedContract
    );

    res.json(updatedContract);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi máy chủ khi cập nhật hợp đồng' });
  }
};

// --- Payment Management ---

exports.addPayment = async (req, res) => {
  try {
    const { contract_id, installment, description, due_date, amount, status } = req.body;
    const id = `pay_${generateRandomId()}`;

    const newPayment = await prisma.contract_payments.create({
      data: {
        id,
        contract_id,
        installment,
        description,
        due_date: new Date(due_date),
        amount,
        status: status || 'PENDING',
      },
    });

    await logActivity(
      req.user,
      'THÊM_THANH_TOÁN',
      'PAYMENT',
      id,
      `Đợt ${installment}`,
      `Thêm đợt thanh toán: ${amount}`
    );

    res.status(201).json(newPayment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ khi thêm đợt thanh toán' });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paid_amount, payment_date } = req.body;

    // Fetch old payment for change tracking
    const oldPayment = await prisma.contract_payments.findUnique({
      where: { id },
    });

    if (!oldPayment) {
      return res.status(404).json({ message: 'Không tìm thấy thanh toán' });
    }

    // If marking as PAID, calculate early payment discount
    let earlyPaymentResult = null;
    if (status === 'PAID') {
      const { applyEarlyPaymentDiscount } = require('../services/earlyPaymentService');
      try {
        earlyPaymentResult = await applyEarlyPaymentDiscount(
          id,
          payment_date ? new Date(payment_date) : new Date()
        );
      } catch (err) {
        console.warn('Early payment discount calculation failed:', err);
      }
    }

    const updatedPayment = await prisma.contract_payments.update({
      where: { id },
      data: {
        status,
        paid_amount: paid_amount !== undefined ? paid_amount : undefined,
        payment_date: payment_date ? new Date(payment_date) : undefined,
        updated_at: new Date(),
      },
    });

    if (status === 'PAID') {
      let logMessage = `Xác nhận thanh toán: ${Number(paid_amount).toLocaleString('vi-VN')} VNĐ`;
      if (earlyPaymentResult && earlyPaymentResult.applied) {
        logMessage += ` (Chiết khấu thanh toán sớm: ${Number(earlyPaymentResult.discount).toLocaleString('vi-VN')} VNĐ - ${earlyPaymentResult.daysEarly} ngày sớm)`;
      }
      await logActivity(
        req.user,
        'CONFIRM_PAYMENT',
        'PAYMENT',
        id,
        `Payment ${id}`,
        logMessage,
        oldPayment,
        updatedPayment
      );
    } else {
      await logActivity(
        req.user,
        'UPDATE',
        'PAYMENT',
        id,
        `Payment ${id}`,
        `Cập nhật trạng thái thanh toán: ${status}`,
        oldPayment,
        updatedPayment
      );
    }

    // AUTO-GENERATE LIFECYCLE EVENT FOR PAYMENT
    if (status === 'PAID') {
      await prisma.contract_lifecycle_events.create({
        data: {
          id: `evt_${generateRandomId()}`,
          contract_id: updatedPayment.contract_id,
          event_type: 'PAYMENT_RECEIVED',
          event_date: payment_date ? new Date(payment_date) : new Date(),
          performed_by: req.user.id,
          notes: `Thanh toán đợt ${updatedPayment.installment}: ${Number(paid_amount || 0).toLocaleString('vi-VN')} VNĐ`,
          metadata: {
            paymentId: id,
            amount: paid_amount,
            installment: updatedPayment.installment,
          },
        },
      });
    }

    res.json({
      ...updatedPayment,
      earlyPaymentDiscount: earlyPaymentResult,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật thanh toán' });
  }
};

exports.uploadContractDocument = async (req, res) => {
  try {
    const { id } = req.params; // contract_id
    const { document_name, doc_type } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'Không có tệp nào được tải lên' });
    }

    // Get contract info for naming
    const contract = await prisma.contracts.findUnique({
      where: { id },
      select: { contract_code: true },
    });

    if (!contract) {
      return res.status(404).json({ message: 'Hợp đồng không tồn tại' });
    }

    // Count existing documents for sequence number
    const docCount = await prisma.contract_documents.count({
      where: { contract_id: id },
    });

    const sequence = docCount + 1;
    const ext = path.extname(file.originalname) || '';
    // Format: [ContractCode]-xxxx (xxxx = sequence)
    const customFilename = `${contract.contract_code}-${sequence}${ext}`;

    const filename = await saveFileWithExactName(file, customFilename);
    const docId = `cdoc_${generateRandomId()}`;

    const newDoc = await prisma.contract_documents.create({
      data: {
        id: docId,
        contract_id: id,
        document_name: document_name || file.originalname,
        file_url: filename,
        doc_type: doc_type,
      },
    });

    await logActivity(
      req.user,
      'TẢI_LÊN_TÀI_LIỆU',
      'DOCUMENT',
      docId,
      document_name || filename,
      `Tải lên tài liệu loại: ${doc_type || 'Khác'}`
    );

    res.status(201).json(newDoc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ khi tải lên tài liệu' });
  }
};

exports.getContractDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const documents = await prisma.contract_documents.findMany({
      where: { contract_id: id },
      orderBy: { uploaded_at: 'desc' },
    });
    res.json(documents);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ khi tải danh sách tài liệu' });
  }
};

exports.getCrmStats = async (req, res) => {
  try {
    const [customerCount, contractCount, payments] = await Promise.all([
      prisma.customers.count(),
      prisma.contracts.count(),
      prisma.contract_payments.findMany({
        select: {
          amount: true,
          paid_amount: true,
          status: true,
        },
      }),
    ]);

    const totalValue = await prisma.contracts.aggregate({
      _sum: {
        total_value: true,
        vat_amount: true,
        maintenance_fee: true,
      },
    });

    const totalSales =
      (Number(totalValue._sum.total_value) || 0) +
      (Number(totalValue._sum.vat_amount) || 0) +
      (Number(totalValue._sum.maintenance_fee) || 0);

    let totalPaid = 0;
    let overdueCount = 0;

    payments.forEach((p) => {
      totalPaid += Number(p.paid_amount) || 0;
      if (p.status === 'OVERDUE') overdueCount++;
    });

    const stats = {
      totalCustomers: customerCount,
      totalContracts: contractCount,
      totalSales,
      totalPaid,
      totalRemaining: totalSales - totalPaid,
      overdueCount,
    };
    console.log('[CRM Stats] Calculated:', stats);
    res.json(stats);
  } catch (err) {
    console.error('[CRM Stats] Error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi tải thống kê CRM' });
  }
};

exports.transferContract = async (req, res) => {
  try {
    const { id } = req.params;
    const { new_customer_id, transfer_date, notes } = req.body;

    const contract = await prisma.contracts.findUnique({
      where: { id },
      include: { customers: true },
    });

    if (!contract) {
      return res.status(404).json({ message: 'Hợp đồng không tồn tại' });
    }

    if (contract.customer_id === new_customer_id) {
      return res
        .status(400)
        .json({ message: 'Khách hàng mới phải khác khách hàng hiện tại' });
    }

    const newCustomer = await prisma.customers.findUnique({
      where: { id: new_customer_id },
    });

    if (!newCustomer) {
      return res.status(404).json({ message: 'Khách hàng mới không tồn tại' });
    }

    // Transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // 1. Create transfer record
      await tx.contract_transfers.create({
        data: {
          id: `tr_${generateRandomId()}`,
          contract_id: id,
          old_customer_id: contract.customer_id,
          new_customer_id: new_customer_id,
          transfer_date: new Date(transfer_date),
          notes: notes,
        },
      });

      // 2. Update contract owner
      await tx.contracts.update({
        where: { id },
        data: { customer_id: new_customer_id },
      });

      // 3. Create lifecycle event
      await tx.contract_lifecycle_events.create({
        data: {
          id: `evt_${generateRandomId()}`,
          contract_id: id,
          event_type: 'TRANSFERRED',
          event_date: transfer_date ? new Date(transfer_date) : new Date(),
          performed_by: req.user.id,
          notes: notes || `Chuyển nhượng cho khách hàng: ${newCustomer.name}`,
          metadata: {
            oldCustomerId: contract.customer_id,
            newCustomerId: new_customer_id,
          },
        },
      });
    });

    await logActivity(
      req.user,
      'CHUYỂN_NHƯỢNG_HỢP_ĐỒNG',
      'CONTRACT',
      id,
      contract.contract_code,
      `Chuyển nhượng từ ${contract.customers.name} sang khách hàng mới (ID: ${new_customer_id})`
    );

    res.json({ message: 'Chuyển nhượng hợp đồng thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ khi chuyển nhượng hợp đồng' });
  }
};

exports.getContractTransferHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const transfers = await prisma.contract_transfers.findMany({
      where: { contract_id: id },
      include: {
        old_customer: { select: { name: true, phone_number: true } },
        new_customer: { select: { name: true, phone_number: true } },
      },
      orderBy: { transfer_date: 'desc' },
    });
    res.json(transfers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ khi tải lịch sử chuyển nhượng' });
  }
};

exports.sendPaymentReminder = async (req, res) => {
  try {
    const { id } = req.params; // payment id
    const payment = await prisma.contract_payments.findUnique({
      where: { id },
      include: {
        contracts: {
          include: {
            customers: true,
            apartments: true,
          },
        },
      },
    });

    if (!payment || !payment.contracts || !payment.contracts.customers) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin thanh toán' });
    }

    const customer = payment.contracts.customers;
    if (!customer.email) {
      return res.status(400).json({ message: 'Khách hàng chưa cập nhật email' });
    }

    const variables = {
      customer_name: customer.name,
      contract_code: payment.contracts.contract_code,
      payment_description: payment.description || `Đợt ${payment.installment}`,
      amount: Number(payment.amount || 0).toLocaleString('vi-VN') + ' VNĐ',
      due_date: new Date(payment.due_date).toLocaleDateString('vi-VN'),
    };

    const rendered = await getRenderedContent('PAYMENT_REMINDER', variables);
    const subject = rendered
      ? rendered.subject
      : `[ThanhPhoCaPhe] Nhắc thanh toán đợt ${payment.installment} - HĐ ${payment.contracts.contract_code}`;
    const html = rendered
      ? rendered.html
      : `<p>Vui lòng thanh toán khoản tiền ${Number(payment.amount).toLocaleString('vi-VN')} VNĐ trước ngày ${new Date(payment.due_date).toLocaleDateString('vi-VN')}</p>`;

    const result = await sendEmail(customer.email, subject, html);
    await createNotificationRecord({
      type: 'payment_reminder',
      recipient: { userId: customer.id },
      payload: {
        title: 'Nhắc thanh toán hợp đồng',
        body: `Đợt ${payment.installment} - Hợp đồng ${payment.contracts.contract_code}`,
        url: '/resident',
        tag: `payment-reminder-${payment.id}`,
      },
    });
    await logActivity(
      req.user,
      'GỬI_EMAIL',
      'PAYMENT',
      id,
      `Payment ${id}`,
      `Gửi nhắc nợ tới ${customer.email}`
    );

    res.json({ message: 'Đã gửi email nhắc nợ thành công', mock: result.mock });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi gửi email' });
  }
};

exports.previewPaymentReminder = async (req, res) => {
  const { id } = req.params;
  try {
    const payment = await prisma.contract_payments.findUnique({
      where: { id },
      include: {
        contracts: {
          include: { customers: true, apartments: true },
        },
      },
    });

    if (!payment) return res.status(404).json({ message: 'Thanh toán không tồn tại' });
    const customer = payment.contracts?.customers;
    if (!customer)
      return res.status(400).json({ message: 'Không tìm thấy thông tin khách hàng' });

    const variables = {
      customer_name: customer.name,
      contract_code: payment.contracts.contract_code,
      payment_description: payment.description || `Đợt ${payment.installment}`,
      amount: Number(payment.amount || 0).toLocaleString('vi-VN') + ' VNĐ',
      due_date: new Date(payment.due_date).toLocaleDateString('vi-VN'),
    };

    const rendered = await getRenderedContent('PAYMENT_REMINDER', variables);
    const subject = rendered
      ? rendered.subject
      : `[Preview] Nhắc thanh toán ${payment.contracts.contract_code}`;
    const html = rendered ? rendered.html : `<p>Preview content (Template missing)</p>`;

    res.json({ subject, html });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi preview email' });
  }
};

exports.sendContractNotification = async (req, res) => {
  try {
    const { id } = req.params; // contract id
    const { subject, message } = req.body;

    const contract = await prisma.contracts.findUnique({
      where: { id },
      include: { customers: true },
    });

    if (!contract || !contract.customers) {
      return res.status(404).json({ message: 'Hợp đồng hoặc khách hàng không tồn tại' });
    }

    const customer = contract.customers;
    if (!customer.email) {
      return res.status(400).json({ message: 'Khách hàng chưa cập nhật email' });
    }

    const fullSubject = `[ThanhPhoCaPhe] ${subject || 'Thông báo từ Ban Quản Lý'}`;
    const html = `
            <h3>Kính gửi Quý khách ${customer.name},</h3>
            <p>Thông báo liên quan đến Hợp đồng số: <b>${contract.contract_code}</b></p>
            <div style="border: 1px solid #ddd; padding: 15px; background-color: #f9f9f9;">
                ${message ? message.replace(/\n/g, '<br>') : ''}
            </div>
            <p>Trân trọng,<br>Ban Quản Lý</p>
        `;

    await sendEmail(customer.email, fullSubject, html);
    await logActivity(
      req.user,
      'GỬI_EMAIL',
      'CONTRACT',
      id,
      contract.contract_code,
      `Gửi thông báo: ${subject}`
    );

    res.json({ message: 'Đã gửi email thông báo thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi khi gửi email' });
  }
};

exports.restructureContractPayments = async (req, res) => {
  try {
    const { id } = req.params;
    const { installmentDates, remainingAmount } = req.body;

    // Validate input
    if (
      !installmentDates ||
      !Array.isArray(installmentDates) ||
      installmentDates.length === 0
    ) {
      return res.status(400).json({ message: 'Vui lòng cung cấp danh sách ngày thanh toán' });
    }

    // 1. Get contract and current payments
    const contract = await prisma.contracts.findUnique({
      where: { id },
      include: { contract_payments: true },
    });

    if (!contract) {
      return res.status(404).json({ message: 'Hợp đồng không tồn tại' });
    }

    const totalValue =
      Number(contract.total_value) +
      Number(contract.vat_amount) +
      Number(contract.maintenance_fee);
    let totalPaid = 0;
    let maxInstallment = 0;

    await prisma.$transaction(async (tx) => {
      // 2. Process existing payments
      for (const payment of contract.contract_payments) {
        totalPaid += Number(payment.paid_amount || 0);

        if (payment.status === 'PAID') {
          // Keep paid payments
          if (payment.installment > maxInstallment) maxInstallment = payment.installment;
        } else if (Number(payment.paid_amount) > 0) {
          // Partially paid: Close it as PAID with current amount
          await tx.contract_payments.update({
            where: { id: payment.id },
            data: {
              status: 'PAID',
              amount: payment.paid_amount,
              description:
                (payment.description || `Đợt ${payment.installment}`) +
                ' (Quyết toán tái cấu trúc)',
              updated_at: new Date(),
            },
          });
          if (payment.installment > maxInstallment) maxInstallment = payment.installment;
        } else {
          // Not paid at all: Delete
          await tx.contract_payments.delete({
            where: { id: payment.id },
          });
        }
      }

      // 3. Calculate remaining and create new payments
      const remaining = totalValue - totalPaid;
      if (remaining <= 0) {
        throw new Error('Hợp đồng đã thanh toán đủ, không thể tái cấu trúc');
      }

      const newPaymentCount = installmentDates.length;
      const amountPerPayment = Math.floor(remaining / newPaymentCount);
      const remainder = remaining % newPaymentCount;

      for (let i = 0; i < newPaymentCount; i++) {
        const isLast = i === newPaymentCount - 1;
        const amount = isLast ? amountPerPayment + remainder : amountPerPayment;
        const dueDate = new Date(installmentDates[i]);

        const nextInstallment = maxInstallment + i + 1;

        await tx.contract_payments.create({
          data: {
            id: `pay_${generateRandomId()}_r${i}`,
            contract_id: id,
            installment: nextInstallment,
            description: `Đợt ${nextInstallment} (Tái cấu trúc)`,
            due_date: dueDate,
            amount: amount,
            status: 'PENDING',
            paid_amount: 0,
          },
        });
      }
    });

    await logActivity(
      req.user,
      'CẤU_TRÚC_LẠI_THANH_TOÁN',
      'CONTRACT',
      id,
      contract.contract_code,
      `Tái cấu trúc lịch thanh toán: ${installmentDates.length} đợt mới`
    );

    res.json({ message: 'Tái cấu trúc lịch thanh toán thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Lỗi máy chủ khi tái cấu trúc thanh toán' });
  }
};
