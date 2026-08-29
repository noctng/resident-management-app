// Create transfer — business logic + transaction orchestration
const createTransfer = async (input, prisma) => {
  // Normalize input (controller uses snake_case, internal uses camelCase)
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

  const { totalPaid } = calculatePaymentStats(contract.contract_payments, contract.total_value);
  const transferData = buildTransferData({ ...input, totalPaid, contractId });
  const newCustomerName = (input.newCustomerName || input.new_customer_name) || contract.customers.name;

  const transferCode = transferData.transfer_code;
  const result = await prisma.$transaction(async (tx) => {
    // Find or create new customer
    const newCustomerPhone = input.newCustomerPhone || input.new_customer_phone;
    const newCustomerIdNumber = input.newCustomerIdNumber || input.new_customer_id_number;
    const newCustomerAddress = input.newCustomerAddress || input.new_customer_address;
    const newCustomerEmail = input.newCustomerEmail || input.new_customer_email;

    let newCustomer = await tx.customers.findFirst({ where: { phone_number: newCustomerPhone } });
    if (!newCustomer) {
      newCustomer = await tx.customers.create({
        data: {
          id: input.newCustomerId || 'cust_' + crypto.randomBytes(6).toString('hex'),
          name: newCustomerName,
          phone_number: newCustomerPhone,
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

    // Update transfer data with new customer id
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

  await logActivity(input.user, 'CHUYỂN_NHƯỢNG_HĐMB', 'CONTRACT_TRANSFER', result.transfer.id, contract.contract_code, `Chuyển nhượng HĐMB ${contract.contract_code} (Căn ${contract.apartments?.code}) từ ${contract.customers?.name} sang ${newCustomerName}. Kế thừa ${totalPaid.toLocaleString('vi-VN')} VNĐ`);

  return { success: true, message: `Chuyển nhượng thành công HĐMB sang ${newCustomerName} (Hồ sơ: ${transferCode})! Toàn bộ LTT và ${totalPaid.toLocaleString('vi-VN')} VNĐ đã được kế thừa nguyên vẹn.`, transfer: result.transfer };
};