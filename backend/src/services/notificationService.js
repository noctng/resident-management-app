const prisma = require('../config/prisma');
const { sendPushToApartment } = require('./pushService');
const { sendEmail } = require('./emailService');
const { getRenderedContent } = require('./templateService');

async function createNotificationRecord({ type, recipient, payload }) {
  try {
    await prisma.notifications.create({
      data: {
        type,
        recipient: recipient?.userId ? String(recipient.userId) : recipient?.apartmentId ? String(recipient.apartmentId) : null,
        payload,
        status: 'pending',
        attempts: 0,
      },
    });
  } catch (err) {
    console.error('[NotificationService] createNotificationRecord error:', err.message);
  }
}

/**
 * Send payment confirmation (Push + Email) thank you notifications to residents.
 * Automatically ensures PAYMENT_CONFIRMATION email template exists in DB.
 * 
 * @param {object} params
 * @param {string} params.apartmentId - Apartment ID
 * @param {number} params.amount - Total amount paid
 * @param {number} params.month - Bill month
 * @param {number} params.year - Bill year
 * @param {string} [params.paymentMethod] - Description of payment method
 * @param {Date} [params.paymentDate] - Date of payment
 */
async function sendPaymentThankYou({ apartmentId, amount, month, year, paymentMethod, paymentDate }) {
    try {
        // 1. Ensure PAYMENT_CONFIRMATION email template exists in DB
        const templateCode = 'PAYMENT_CONFIRMATION';
        const existingTemplate = await prisma.email_templates.findUnique({
            where: { code: templateCode },
        });

        if (!existingTemplate) {
            await prisma.email_templates.create({
                data: {
                    code: templateCode,
                    name: 'Xác nhận thanh toán & Cảm ơn',
                    subject: '[ThanhPhoCaPhe] Xác nhận thanh toán thành công - Căn hộ {{apartment_code}}',
                    body: `
<h3>Xin chào {{resident_name}},</h3>
<p>Ban Quản Lý xin xác nhận đã nhận được khoản thanh toán hóa đơn của căn hộ <b>{{apartment_code}}</b> kỳ <b>{{month_year}}</b>.</p>
<ul>
  <li>Số tiền đã thanh toán: <b><span style="color: #10b981;">{{amount}}</span></b></li>
  <li>Ngày thanh toán: {{payment_date}}</li>
  <li>Hình thức thanh toán: {{payment_method}}</li>
</ul>
<p>Chân thành cảm ơn Quý cư dân đã hoàn thành nghĩa vụ tài chính.</p>
<p>Trân trọng,<br>Ban Quản Lý Vận hành khu đô thị</p>
                    `.trim(),
                    variables: ['resident_name', 'apartment_code', 'amount', 'month_year', 'payment_date', 'payment_method'],
                },
            });
        }

        // 2. Fetch apartment with active residents
        const apartment = await prisma.apartments.findUnique({
            where: { id: apartmentId },
            include: {
                occupancies: {
                    include: { residents: true },
                    where: { residents: { is_active: true } },
                },
            },
        });

        if (!apartment) {
            console.warn(`[NotificationService] Apartment not found: ${apartmentId}`);
            return;
        }

        const monthYear = `${month}/${year}`;
        const amountStr = Number(amount).toLocaleString('vi-VN') + ' ₫';
        const dateStr = paymentDate 
            ? new Date(paymentDate).toLocaleDateString('vi-VN') 
            : new Date().toLocaleDateString('vi-VN');
        const methodStr = paymentMethod || 'Chuyển khoản / Tiền mặt';

        // 3. Send Push Notification to all subscribed devices for this apartment
        await sendPushToApartment(apartmentId, {
            title: 'Thanh toán thành công',
            body: `Cảm ơn cư dân căn hộ ${apartment.code} đã thanh toán số tiền ${amountStr} cho hóa đơn kỳ ${monthYear}.`,
            url: '/resident',
            tag: `payment-thankyou-${apartmentId}-${month}-${year}`,
        }).catch((err) => {
            console.error('[NotificationService] Push send error:', err.message);
        });

        // 4. Find owner or other residents with emails
        const owners = apartment.occupancies
            .map((o) => o.residents)
            .filter((r) => r && r.email && r.relationship_status === 'OWNER');

        const targetResidents = owners.length > 0
            ? owners
            : apartment.occupancies.map((o) => o.residents).filter((r) => r && r.email);

        if (targetResidents.length === 0) {
            console.warn(`[NotificationService] No email found for apartment residents: ${apartment.code}`);
            return;
        }

        // 5. Send confirmation emails
        for (const resident of targetResidents) {
            try {
                const variables = {
                    resident_name: resident.name || 'Cư dân',
                    apartment_code: apartment.code,
                    amount: amountStr,
                    month_year: monthYear,
                    payment_date: dateStr,
                    payment_method: methodStr,
                };

                const rendered = await getRenderedContent(templateCode, variables);
                const subject = rendered?.subject || `[ThanhPhoCaPhe] Xác nhận thanh toán thành công - Căn hộ ${apartment.code}`;
                const html = rendered?.html || `<p>Xin chào ${resident.name}, cảm ơn bạn đã thanh toán ${amountStr} cho hóa đơn kỳ ${monthYear}.</p>`;

                await sendEmail(resident.email, subject, html);
                console.log(`[NotificationService] Thank you email sent to: ${resident.email}`);
            } catch (err) {
                console.error(`[NotificationService] Email send error for ${resident.email}:`, err.message);
            }
        }

        await createNotificationRecord({
            type: 'payment_confirmation',
            recipient: { apartmentId, userId: targetResidents[0]?.id },
            payload: {
                title: 'Thanh toán thành công',
                body: `Cảm ơn cư dân căn hộ ${apartment.code} đã thanh toán số tiền ${amountStr} cho hóa đơn kỳ ${monthYear}.`,
                url: '/resident',
                tag: `payment-thankyou-${apartmentId}-${month}-${year}`,
            },
        });
    } catch (err) {
        console.error('[NotificationService] Service execution error:', err);
    }
}

module.exports = { sendPaymentThankYou };
