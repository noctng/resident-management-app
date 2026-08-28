/**
 * Generate HTML template for PDF invoice
 */
function generateInvoicePDFTemplate(data) {
    const {
        apartmentCode,
        houseType,
        floor,
        area,
        residentName,
        month,
        year,
        fees,
        totalAmount,
        status,
        paymentDate,
        paymentMethod,
        invoiceNumber,
        createdDate,
    } = data;

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(value);
    };

    const getStatusBadge = (status) => {
        const colors = {
            PENDING: '#f59e0b',
            PAID: '#10b981',
            OVERDUE: '#ef4444',
            CANCELLED: '#6b7280',
        };
        const labels = {
            PENDING: 'Chưa thanh toán',
            PAID: 'Đã thanh toán',
            OVERDUE: 'Quá hạn',
            CANCELLED: 'Đã hủy',
        };
        return `<span style="background-color: ${colors[status]}; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 12px;">${labels[status]}</span>`;
    };

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hóa Đơn Phí Quản Lý - ${apartmentCode}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            background: white;
        }
        
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 28px;
            margin-bottom: 8px;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .invoice-meta {
            display: flex;
            justify-content: space-between;
            padding: 20px 30px;
            background-color: #f9fafb;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .invoice-meta div {
            flex: 1;
        }
        
        .invoice-meta label {
            display: block;
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 4px;
        }
        
        .invoice-meta strong {
            font-size: 14px;
            color: #111827;
        }
        
        .content {
            padding: 30px;
        }
        
        .section {
            margin-bottom: 30px;
        }
        
        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        
        .info-item label {
            display: block;
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 4px;
        }
        
        .info-item value {
            display: block;
            font-size: 14px;
            font-weight: 600;
            color: #111827;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        
        thead {
            background-color: #f9fafb;
        }
        
        th {
            padding: 12px;
            text-align: left;
            font-size: 13px;
            color: #6b7280;
            border-bottom: 2px solid #e5e7eb;
        }
        
        th.text-right {
            text-align: right;
        }
        
        td {
            padding: 12px;
            font-size: 14px;
            color: #374151;
            border-bottom: 1px solid #f3f4f6;
        }
        
        td.text-right {
            text-align: right;
        }
        
        td.font-semibold {
            font-weight: 600;
        }
        
        tfoot {
            background-color: #eff6ff;
        }
        
        tfoot td {
            padding: 15px 12px;
            font-weight: bold;
            color: #1e40af;
            border-bottom: none;
        }
        
        .total-amount {
            font-size: 20px;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
        }
        
        .footer p {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 8px;
        }
        
        .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            padding: 0 30px;
        }
        
        .signature-box {
            text-align: center;
            flex: 1;
        }
        
        .signature-box label {
            display: block;
            font-size: 13px;
            color: #6b7280;
            margin-bottom: 60px;
        }
        
        .signature-box strong {
            display: block;
            font-size: 14px;
            color: #111827;
        }
        
        .payment-info {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            border-radius: 4px;
            margin-top: 10px;
        }
        
        .payment-info p {
            font-size: 13px;
            color: #78350f;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Header -->
        <div class="header">
            <h1>HÓA ĐƠN PHÍ QUẢN LÝ</h1>
            <p>Tháng ${month}/${year}</p>
        </div>
        
        <!-- Invoice Meta -->
        <div class="invoice-meta">
            <div>
                <label>Số hóa đơn</label>
                <strong>${invoiceNumber}</strong>
            </div>
            <div>
                <label>Ngày phát hành</label>
                <strong>${new Date(createdDate).toLocaleDateString('vi-VN')}</strong>
            </div>
            <div>
                <label>Trạng thái</label>
                ${getStatusBadge(status)}
            </div>
        </div>
        
        <!-- Content -->
        <div class="content">
            <!-- Apartment Info -->
            <div class="section">
                <div class="section-title">Thông Tin Căn Hộ</div>
                <div class="info-grid">
                    <div class="info-item">
                        <label>Mã căn hộ</label>
                        <value>${apartmentCode}</value>
                    </div>
                    <div class="info-item">
                        <label>Tòa nhà</label>
                        <value>${houseType}</value>
                    </div>
                    <div class="info-item">
                        <label>Tầng</label>
                        <value>${floor}</value>
                    </div>
                    <div class="info-item">
                        <label>Diện tích</label>
                        <value>${area} m²</value>
                    </div>
                    ${
                        residentName
                            ? `
                    <div class="info-item">
                        <label>Cư dân</label>
                        <value>${residentName}</value>
                    </div>
                    `
                            : ''
                    }
                </div>
            </div>
            
            <!-- Fee Breakdown -->
            <div class="section">
                <div class="section-title">Chi Tiết Các Khoản Phí</div>
                <table>
                    <thead>
                        <tr>
                            <th>Khoản phí</th>
                            <th class="text-right">Đơn giá</th>
                            <th class="text-right">Số lượng</th>
                            <th class="text-right">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${fees
                            .map(
                                (fee) => `
                        <tr>
                            <td>${fee.name}</td>
                            <td class="text-right">${fee.unitPrice || '-'}</td>
                            <td class="text-right">${fee.quantity || '-'}</td>
                            <td class="text-right font-semibold">${formatCurrency(fee.amount)}</td>
                        </tr>
                        `
                            )
                            .join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3">TỔNG CỘNG</td>
                            <td class="text-right total-amount">${formatCurrency(totalAmount)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <!-- Payment Info -->
            ${
                status === 'PAID' && paymentDate
                    ? `
            <div class="section">
                <div class="section-title">Thông Tin Thanh Toán</div>
                <div class="info-grid">
                    <div class="info-item">
                        <label>Ngày thanh toán</label>
                        <value>${new Date(paymentDate).toLocaleDateString('vi-VN')}</value>
                    </div>
                    <div class="info-item">
                        <label>Phương thức</label>
                        <value>${paymentMethod || 'N/A'}</value>
                    </div>
                </div>
            </div>
            `
                    : `
            <div class="payment-info">
                <p><strong>Hướng dẫn thanh toán:</strong></p>
                <p>• Thanh toán trực tiếp tại văn phòng quản lý<br>
                • Chuyển khoản ngân hàng (ghi rõ mã căn hộ)<br>
                • Quét mã QR Code</p>
            </div>
            `
            }
            
            <!-- Footer -->
            <div class="footer">
                <p>Trân trọng cảm ơn sự hợp tác của quý cư dân!</p>
                <p style="font-size: 11px; color: #9ca3af;">Hóa đơn được phát hành bởi Ban Quản Lý Chung Cư</p>
            </div>
        </div>
        
        <!-- Signatures -->
        <div class="signature-section">
            <div class="signature-box">
                <label>Người lập phiếu</label>
                <strong>.................................</strong>
            </div>
            <div class="signature-box">
                <label>Người thanh toán</label>
                <strong>.................................</strong>
            </div>
        </div>
        <br><br>
    </div>
</body>
</html>
  `;
}

module.exports = {
    generateInvoicePDFTemplate,
};
