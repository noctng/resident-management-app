// Legacy handlers giữ nguyên behaviour (cross-cutting I/O: email, push, template, QR-zip stream).
// Đã chuyển prisma query sang repo.* để tuân thủ Clean Architecture.
// File này được unifiedBillingController.js import cho 3 handler phức tạp.
const repo = require('../repositories/unifiedBillingRepository');
const { sendEmail } = require('../services/emailService');
const { getRenderedContent } = require('../services/templateService');
const { generateQRCodeURL, formatUtilityTransferContent } = require('../services/vietQRService');
const { createNotificationRecord } = require('../services/notificationService');
const { logActivity } = require('../utils/logger');

function buildManagementFeeRows(managementFee) {
  if (!managementFee) {
    return '<tr><td colspan="2" style="padding: 3px 4px; font-style: italic; text-align: center;">Không có phí phát sinh</td></tr>';
  }
  const feeItems = [
    { name: 'Phí quản lý', val: Number(managementFee.management_fee) },
    { name: 'Phí Internet', val: Number(managementFee.internet_fee) },
    { name: 'Phí truyền hình cáp', val: Number(managementFee.cable_tv_fee) },
    { name: 'Phí gửi xe ô tô', val: Number(managementFee.parking_car_fee) },
    { name: 'Phí gửi xe máy', val: Number(managementFee.parking_motorbike_fee) },
    { name: 'Phí an ninh', val: Number(managementFee.security_fee) },
    { name: 'Phí vệ sinh', val: Number(managementFee.cleaning_fee) },
  ];
  let rows = '';
  feeItems.forEach((item) => {
    if (item.val > 0) {
      rows += `\n                    <tr>\n                        <td style="padding: 3px 4px; border: 1px solid #d9e2ec; line-height: 1.15;">${item.name}</td>\n                        <td style="padding: 3px 4px; border: 1px solid #d9e2ec; line-height: 1.15;">${item.val.toLocaleString('vi-VN')} ₫</td>\n                    </tr>`;
    }
  });
  return rows;
}

async function resolveApartmentWithResidents(apartment_id) {
  const apartment = await repo.getApartmentWithResidents(apartment_id);
  if (!apartment) return null;
  const residents = apartment.occupancies
    .map((o) => o.residents)
    .filter((r) => r && r.email && r.relationship_status === 'OWNER');
  const targetResidents =
    residents.length > 0
      ? residents
      : apartment.occupancies.map((o) => o.residents).filter((r) => r && r.email);
  return { apartment, targetResidents };
}

async function fetchPeriodData(apartment_id, month, year) {
  const [utilityRecord, managementFee, qrSettings] = await Promise.all([
    repo.findUtilityRecord(apartment_id, parseInt(month), parseInt(year)),
    repo.findManagementFee(apartment_id, parseInt(month), parseInt(year)),
    repo.listQrSettings(),
  ]);
  const qrConfig = {};
  qrSettings.forEach((s) => (qrConfig[s.key] = s.value));
  return { utilityRecord, managementFee, qrConfig };
}

exports.sendCombinedBillNotification = async (req, res) => {
  try {
    const { apartment_id, month, year } = req.body;
    if (!apartment_id || !month || !year) return res.status(400).json({ error: 'Missing required fields' });

    const { apartment, targetResidents } = await resolveApartmentWithResidents(apartment_id);
    if (!apartment) return res.status(404).json({ error: 'Apartment not found' });
    if (targetResidents.length === 0) return res.status(400).json({ error: 'No resident email found for this apartment' });

    const { utilityRecord, managementFee, qrConfig } = await fetchPeriodData(apartment_id, month, year);

    const water_old_reading = utilityRecord?.water_old_reading || 0;
    const water_new_reading = utilityRecord?.water_new_reading || 0;
    const water_usage = utilityRecord?.water_consumption || Number(water_new_reading) - Number(water_old_reading);
    const water_cost = Number(utilityRecord?.water_cost || 0);
    const electricity_old_reading = utilityRecord?.electricity_old_reading || 0;
    const electricity_new_reading = utilityRecord?.electricity_new_reading || 0;
    const electricity_usage = utilityRecord?.electricity_consumption || Number(electricity_new_reading) - Number(electricity_old_reading);
    const electricity_cost = Number(utilityRecord?.electricity_cost || 0);
    const management_fee_cost = Number(managementFee?.total_amount || 0);
    const grand_total = water_cost + electricity_cost + management_fee_cost;

    const nextMonthDate = new Date(year, month, 15);
    const deadline = `${nextMonthDate.getDate()}/${nextMonthDate.getMonth() + 1}/${nextMonthDate.getFullYear()}`;
    const monthYear = `${month}/${year}`;
    const transferContent = formatUtilityTransferContent(apartment.code, month, year);

    let qrCodeUrl = '';
    if (qrConfig.QR_BANK_CODE && qrConfig.QR_BANK_ACCOUNT) {
      try {
        qrCodeUrl = generateQRCodeURL(qrConfig.QR_BANK_CODE, qrConfig.QR_BANK_ACCOUNT, grand_total, transferContent, qrConfig.QR_ACCOUNT_NAME);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    }

    const management_fee_rows = buildManagementFeeRows(managementFee);
    let successCount = 0;

    for (const resident of targetResidents) {
      const variables = {
        resident_name: resident.name, apartment_code: apartment.code, month_year: monthYear,
        water_old: Number(water_old_reading).toLocaleString('vi-VN'), water_new: Number(water_new_reading).toLocaleString('vi-VN'),
        water_usage: Number(water_usage).toLocaleString('vi-VN'), water_cost: water_cost.toLocaleString('vi-VN') + ' ₫',
        elec_old: Number(electricity_old_reading).toLocaleString('vi-VN'), elec_new: Number(electricity_new_reading).toLocaleString('vi-VN'),
        elec_usage: Number(electricity_usage).toLocaleString('vi-VN'), elec_cost: electricity_cost.toLocaleString('vi-VN') + ' ₫',
        management_fee_rows, management_fee_cost: management_fee_cost.toLocaleString('vi-VN') + ' ₫',
        grand_total: grand_total.toLocaleString('vi-VN') + ' ₫', deadline, transfer_content: transferContent, qr_code_url: qrCodeUrl,
        account_name: qrConfig.QR_ACCOUNT_NAME || '', bank_account: qrConfig.QR_BANK_ACCOUNT || '', bank_name: qrConfig.QR_BANK_CODE || '',
      };
      const rendered = await getRenderedContent('COMBINED_BILL', variables);
      const subject = rendered?.subject || `Thông báo hóa đơn tổng hợp T${monthYear} - ${apartment.code}`;
      const html = rendered?.html || '<p>Lỗi tải mẫu email</p>';
      await sendEmail(resident.email, subject, html);
      successCount++;
    }

    if (utilityRecord && successCount > 0) await repo.updateUtilityRecord(utilityRecord.id, { email_sent_at: new Date() });

    await logActivity(req.user, 'GỬI_EMAIL', 'UNIFIED_BILL', apartment.code, `Combined Bill ${monthYear}`, `Sent to ${successCount} residents`);
    res.json({ message: `Đã gửi email thành công cho ${successCount} cư dân.` });

    await createNotificationRecord({
        type: 'utility_bill',
        recipient: { apartmentId: apartment_id },
        payload: {
            title: 'Hóa đơn mới',
            body: `Hóa đơn ${monthYear} đã được gửi. Nhấn để xem chi tiết.`,
            url: '/resident',
            tag: `bill-${apartment_id}-${month}-${year}`,
        },
    });
  } catch (error) {
    console.error('Error sending combined bill notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
};

exports.previewCombinedBillNotification = async (req, res) => {
  try {
    const { apartment_id, month, year } = req.body;
    if (!apartment_id || !month || !year) return res.status(400).json({ error: 'Missing required fields' });

    const { apartment, targetResidents } = await resolveApartmentWithResidents(apartment_id);
    if (!apartment) return res.status(404).json({ error: 'Apartment not found' });

    const { utilityRecord, managementFee, qrConfig } = await fetchPeriodData(apartment_id, month, year);

    const water_old_reading = utilityRecord?.water_old_reading || 0;
    const water_new_reading = utilityRecord?.water_new_reading || 0;
    const water_usage = utilityRecord?.water_consumption || Number(water_new_reading) - Number(water_old_reading);
    const water_cost = Number(utilityRecord?.water_cost || 0);
    const electricity_old_reading = utilityRecord?.electricity_old_reading || 0;
    const electricity_new_reading = utilityRecord?.electricity_new_reading || 0;
    const electricity_usage = utilityRecord?.electricity_consumption || Number(electricity_new_reading) - Number(electricity_old_reading);
    const electricity_cost = Number(utilityRecord?.electricity_cost || 0);
    const management_fee_cost = Number(managementFee?.total_amount || 0);
    const grand_total = water_cost + electricity_cost + management_fee_cost;

    const nextMonthDate = new Date(year, month, 15);
    const deadline = `${nextMonthDate.getDate()}/${nextMonthDate.getMonth() + 1}/${nextMonthDate.getFullYear()}`;
    const monthYear = `${month}/${year}`;
    const transferContent = formatUtilityTransferContent(apartment.code, month, year);

    let qrCodeUrl = '';
    if (qrConfig.QR_BANK_CODE && qrConfig.QR_BANK_ACCOUNT) {
      try {
        qrCodeUrl = generateQRCodeURL(qrConfig.QR_BANK_CODE, qrConfig.QR_BANK_ACCOUNT, grand_total, transferContent, qrConfig.QR_ACCOUNT_NAME);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    }

    const management_fee_rows = buildManagementFeeRows(managementFee);
    const resident = targetResidents[0] || { name: 'Khách hàng (Mẫu)', email: 'example@email.com' };

    const variables = {
      resident_name: resident.name, apartment_code: apartment.code, month_year: monthYear,
      water_old: Number(water_old_reading).toLocaleString('vi-VN'), water_new: Number(water_new_reading).toLocaleString('vi-VN'),
      water_usage: Number(water_usage).toLocaleString('vi-VN'), water_cost: water_cost.toLocaleString('vi-VN') + ' ₫',
      elec_old: Number(electricity_old_reading).toLocaleString('vi-VN'), elec_new: Number(electricity_new_reading).toLocaleString('vi-VN'),
      elec_usage: Number(electricity_usage).toLocaleString('vi-VN'), elec_cost: electricity_cost.toLocaleString('vi-VN') + ' ₫',
      management_fee_rows, management_fee_cost: management_fee_cost.toLocaleString('vi-VN') + ' ₫',
      grand_total: grand_total.toLocaleString('vi-VN') + ' ₫', deadline, transfer_content: transferContent, qr_code_url: qrCodeUrl,
      account_name: qrConfig.QR_ACCOUNT_NAME || '', bank_account: qrConfig.QR_BANK_ACCOUNT || '', bank_name: qrConfig.QR_BANK_CODE || '',
    };

    const rendered = await getRenderedContent('COMBINED_BILL', variables);
    if (!rendered) return res.status(404).json({ error: 'Email template not found' });

    res.json({ subject: rendered.subject, html: rendered.html, recipientCount: targetResidents.length });
  } catch (error) {
    console.error('Error previewing combined bill notification:', error);
    res.status(500).json({ error: 'Failed to preview notification' });
  }
};

exports.sendBulkCombinedBillNotification = async (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ error: 'Month and year are required' });
    const parsedMonth = parseInt(month);
    const parsedYear = parseInt(year);

    const apartments = await repo.listApartmentsWithResidents();
    const apartmentIds = apartments.map((a) => a.id);

    const [utilityRecords, managementFees, qrSettings] = await Promise.all([
      repo.listUtilityRecordsByPeriod(parsedMonth, parsedYear, apartmentIds),
      repo.listManagementFeesByPeriod(parsedMonth, parsedYear, apartmentIds),
      repo.listQrSettings(),
    ]);
    const utilityMap = new Map(utilityRecords.map((r) => [r.apartment_id, r]));
    const feeMap = new Map(managementFees.map((f) => [f.apartment_id, f]));
    const qrConfig = {};
    qrSettings.forEach((s) => (qrConfig[s.key] = s.value));

    let successCount = 0;
    let failCount = 0;
    const details = [];

    for (const apartment of apartments) {
      const residents = apartment.occupancies
        .map((o) => o.residents)
        .filter((r) => r && r.email && r.relationship_status === 'OWNER');
      const targetResidents = residents.length > 0 ? residents : apartment.occupancies.map((o) => o.residents).filter((r) => r && r.email);

      if (targetResidents.length === 0) { failCount++; details.push({ apartment: apartment.code, status: 'No Email' }); continue; }

      const utilityRecord = utilityMap.get(apartment.id) || null;
      const managementFee = feeMap.get(apartment.id) || null;
      if (!utilityRecord && !managementFee) { details.push({ apartment: apartment.code, status: 'No Data' }); continue; }

      const water_old_reading = utilityRecord?.water_old_reading || 0;
      const water_new_reading = utilityRecord?.water_new_reading || 0;
      const water_usage = utilityRecord?.water_consumption || Number(water_new_reading) - Number(water_old_reading);
      const water_cost = Number(utilityRecord?.water_cost || 0);
      const electricity_old_reading = utilityRecord?.electricity_old_reading || 0;
      const electricity_new_reading = utilityRecord?.electricity_new_reading || 0;
      const electricity_usage = utilityRecord?.electricity_consumption || Number(electricity_new_reading) - Number(electricity_old_reading);
      const electricity_cost = Number(utilityRecord?.electricity_cost || 0);
      const management_fee_cost = Number(managementFee?.total_amount || 0);
      const grand_total = water_cost + electricity_cost + management_fee_cost;

      const nextMonthDate = new Date(parsedYear, parsedMonth, 15);
      const deadline = `${nextMonthDate.getDate()}/${nextMonthDate.getMonth() + 1}/${nextMonthDate.getFullYear()}`;
      const monthYear = `${month}/${year}`;
      const transferContent = formatUtilityTransferContent(apartment.code, month, year);

      let qrCodeUrl = '';
      if (qrConfig.QR_BANK_CODE && qrConfig.QR_BANK_ACCOUNT) {
        try {
          qrCodeUrl = generateQRCodeURL(qrConfig.QR_BANK_CODE, qrConfig.QR_BANK_ACCOUNT, grand_total, transferContent, qrConfig.QR_ACCOUNT_NAME);
        } catch (error) {
          console.error(`Error generating QR for ${apartment.code}:`, error);
        }
      }

      const management_fee_rows = buildManagementFeeRows(managementFee);

      try {
        let sent = false;
        for (const resident of targetResidents) {
          const variables = {
            resident_name: resident.name, apartment_code: apartment.code, month_year: monthYear,
            water_old: Number(water_old_reading).toLocaleString('vi-VN'), water_new: Number(water_new_reading).toLocaleString('vi-VN'),
            water_usage: Number(water_usage).toLocaleString('vi-VN'), water_cost: water_cost.toLocaleString('vi-VN') + ' ₫',
            elec_old: Number(electricity_old_reading).toLocaleString('vi-VN'), elec_new: Number(electricity_new_reading).toLocaleString('vi-VN'),
            elec_usage: Number(electricity_usage).toLocaleString('vi-VN'), elec_cost: electricity_cost.toLocaleString('vi-VN') + ' ₫',
            management_fee_rows, management_fee_cost: management_fee_cost.toLocaleString('vi-VN') + ' ₫',
            grand_total: grand_total.toLocaleString('vi-VN') + ' ₫', deadline, transfer_content: transferContent, qr_code_url: qrCodeUrl,
            account_name: qrConfig.QR_ACCOUNT_NAME || '', bank_account: qrConfig.QR_BANK_ACCOUNT || '', bank_name: qrConfig.QR_BANK_CODE || '',
          };
          const rendered = await getRenderedContent('COMBINED_BILL', variables);
          const subject = rendered?.subject || `Thông báo hóa đơn tổng hợp T${monthYear} - ${apartment.code}`;
          const html = rendered?.html || '<p>Lỗi tải mẫu email</p>';
          await sendEmail(resident.email, subject, html);
          sent = true;
        }
        if (sent) {
          successCount++;
          details.push({ apartment: apartment.code, status: 'Sent' });
          if (utilityRecord) await repo.updateUtilityRecord(utilityRecord.id, { email_sent_at: new Date() });
        } else { failCount++; details.push({ apartment: apartment.code, status: 'Failed' }); }
      } catch (error) {
        console.error(`Failed sending to ${apartment.code}`, error);
        failCount++;
        details.push({ apartment: apartment.code, status: 'Error' });
      }
    }

    await logActivity(req.user, 'GỬI_EMAIL', 'UNIFIED_BILL', 'BULK', `Bulk Unified Bill ${month}/${year}`, `Gửi ${successCount} thành công, ${failCount} thất bại`);
    res.json({ total: apartments.length, success: successCount, failed: failCount, details });
  } catch (error) {
    console.error('Error sending bulk combined notification:', error);
    res.status(500).json({ error: 'Failed to send bulk notifications' });
  }
};

exports.generateBatchCombinedQRCodeZip = async (req, res) => {
  const { month, year } = req.body;
  if (!month || !year) return res.status(400).json({ message: 'Month and year are required' });

  try {
    const parsedMonth = parseInt(month);
    const parsedYear = parseInt(year);
    const archiver = require('archiver');

    const apartments = await repo.listApartments({});
    const apartmentIds = apartments.map((a) => a.id);

    const [utilityRecords, managementFees, qrSettings] = await Promise.all([
      repo.listUtilityRecordsByPeriod(parsedMonth, parsedYear, apartmentIds),
      repo.listManagementFeesByPeriod(parsedMonth, parsedYear, apartmentIds),
      repo.listQrSettings(),
    ]);
    const utilityMap = new Map(utilityRecords.map((r) => [r.apartment_id, r]));
    const feeMap = new Map(managementFees.map((f) => [f.apartment_id, f]));
    const qrConfig = {};
    qrSettings.forEach((s) => (qrConfig[s.key] = s.value));

    if (!qrConfig.QR_BANK_CODE || !qrConfig.QR_BANK_ACCOUNT) {
      return res.status(400).json({ message: 'Chưa cấu hình thông tin tài khoản ngân hàng.' });
    }

    res.attachment(`QR_TongHop_T${month}_${year}.zip`);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      console.error('Archiver error:', err);
      if (!res.headersSent) res.status(500).json({ message: 'Lỗi tạo file zip' });
    });
    archive.pipe(res);

    for (const apartment of apartments) {
      const utilityRecord = utilityMap.get(apartment.id) || null;
      const managementFee = feeMap.get(apartment.id) || null;
      const managementFeeCost = Number(managementFee?.total_amount || 0);
      const utilityCost = Number(utilityRecord?.electricity_cost || 0) + Number(utilityRecord?.water_cost || 0);
      const grandTotal = utilityCost + managementFeeCost;
      if (grandTotal <= 0) continue;
      const transferContent = formatUtilityTransferContent(apartment.code, month, year);
      const qrUrl = generateQRCodeURL(qrConfig.QR_BANK_CODE, qrConfig.QR_BANK_ACCOUNT, grandTotal, transferContent, qrConfig.QR_ACCOUNT_NAME);
      try {
        const response = await fetch(qrUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          archive.append(Buffer.from(arrayBuffer), { name: `${apartment.code}_T${month}_${year}.png` });
        } else {
          console.error(`Failed to fetch QR for ${apartment.code}: ${response.statusText}`);
        }
      } catch (err) {
        console.error(`Error processing QR for ${apartment.code}`, err);
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error('Error generating batch QR zip:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to generate batch QR' });
  }
};

module.exports = exports;
