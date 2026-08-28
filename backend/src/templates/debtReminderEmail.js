/**
 * Generate HTML email template for debt reminder
 */
function generateDebtReminderEmail(data) {
    const { apartmentCode, residentName, month, year, totalAmount, dueDate, fees, daysOverdue } =
        data;

    const isOverdue = daysOverdue > 0;
    const statusColor = isOverdue ? '#dc2626' : '#f59e0b';
    const statusText = isOverdue ? `QUÁ HẠN ${daysOverdue} NGÀY` : 'SẮP ĐẾN HẠN';

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(value);
    };

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nhắc Nhở Thanh Toán Phí Quản Lý</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                                Nhắc Nhở Thanh Toán
                            </h1>
                            <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">
                                Phí Quản Lý Tháng ${month}/${year}
                            </p>
                        </td>
                    </tr>

                    <!-- Status Badge -->
                    <tr>
                        <td style="padding: 30px 30px 20px 30px;">
                            <div style="background-color: ${statusColor}; color: #ffffff; padding: 12px 20px; border-radius: 6px; text-align: center; font-weight: bold; font-size: 16px;">
                                ⚠️ ${statusText}
                            </div>
                        </td>
                    </tr>

                    <!-- Greeting -->
                    <tr>
                        <td style="padding: 0 30px 20px 30px;">
                            <p style="margin: 0; font-size: 16px; color: #374151; line-height: 1.6;">
                                Kính gửi: <strong>${residentName || 'Quý cư dân'}</strong>
                            </p>
                            <p style="margin: 10px 0 0 0; font-size: 16px; color: #374151; line-height: 1.6;">
                                Căn hộ: <strong>${apartmentCode}</strong>
                            </p>
                        </td>
                    </tr>

                    <!-- Message -->
                    <tr>
                        <td style="padding: 0 30px 20px 30px;">
                            <p style="margin: 0; font-size: 15px; color: #6b7280; line-height: 1.6;">
                                ${
                                    isOverdue
                                        ? `Chúng tôi nhận thấy hóa đơn phí quản lý tháng ${month}/${year} của quý cư dân đã <strong style="color: #dc2626;">quá hạn ${daysOverdue} ngày</strong>. Vui lòng thanh toán trong thời gian sớm nhất để tránh ảnh hưởng đến các dịch vụ.`
                                        : `Đây là thư nhắc nhở về hóa đơn phí quản lý tháng ${month}/${year} sắp đến hạn thanh toán. Vui lòng thanh toán trước ngày <strong>${dueDate}</strong>.`
                                }
                            </p>
                        </td>
                    </tr>

                    <!-- Invoice Details -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px;">
                            <table role="presentation" style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                                <thead>
                                    <tr style="background-color: #f9fafb;">
                                        <th style="padding: 12px; text-align: left; font-size: 13px; color: #6b7280; border-bottom: 1px solid #e5e7eb;">
                                            Khoản phí
                                        </th>
                                        <th style="padding: 12px; text-align: right; font-size: 13px; color: #6b7280; border-bottom: 1px solid #e5e7eb;">
                                            Số tiền
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${fees
                                        .map(
                                            (fee) => `
                                    <tr>
                                        <td style="padding: 10px 12px; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6;">
                                            ${fee.name}
                                        </td>
                                        <td style="padding: 10px 12px; text-align: right; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6;">
                                            ${formatCurrency(fee.amount)}
                                        </td>
                                    </tr>
                                    `
                                        )
                                        .join('')}
                                    <tr style="background-color: #eff6ff;">
                                        <td style="padding: 15px 12px; font-size: 16px; font-weight: bold; color: #1e40af;">
                                            TỔNG CỘNG
                                        </td>
                                        <td style="padding: 15px 12px; text-align: right; font-size: 18px; font-weight: bold; color: #1e40af;">
                                            ${formatCurrency(totalAmount)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>

                    <!-- Payment Instructions -->
                    <tr>
                        <td style="padding: 0 30px 20px 30px;">
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px;">
                                <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: bold;">
                                    💳 Hướng dẫn thanh toán:
                                </p>
                                <p style="margin: 10px 0 0 0; font-size: 13px; color: #78350f; line-height: 1.6;">
                                    • Thanh toán trực tiếp tại văn phòng quản lý<br>
                                    • Chuyển khoản ngân hàng (vui lòng ghi rõ mã căn hộ)<br>
                                    • Quét mã QR Code (nếu có)
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Contact -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px;">
                            <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                                Nếu quý cư dân đã thanh toán hoặc có bất kỳ thắc mắc nào, vui lòng liên hệ:<br>
                                📞 <strong>Hotline:</strong> 0901 234 567<br>
                                📧 <strong>Email:</strong> qlcc@example.com
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; font-size: 13px; color: #9ca3af;">
                                Trân trọng cảm ơn sự hợp tác của quý cư dân!
                            </p>
                            <p style="margin: 10px 0 0 0; font-size: 12px; color: #d1d5db;">
                                © ${new Date().getFullYear()} Ban Quản Lý Chung Cư. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `;
}

module.exports = {
    generateDebtReminderEmail,
};
