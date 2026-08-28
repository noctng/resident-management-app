const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Updating UTILITY_BILL template...');

    const templateCode = 'UTILITY_BILL';
    const newBody = `<h3>Xin chào {{resident_name}},</h3>
<p>Thông báo cước phí Điện/Nước cho căn hộ <b>{{apartment_code}}</b> tháng <b>{{month_year}}</b>:</p>
<ul>
    <li>Tiền điện: {{elec_cost}} VNĐ</li>
    <li>Tiền nước: {{water_cost}} VNĐ</li>
    <li><b>Tổng cộng: <span style="color:red">{{total_cost}}</span></b></li>
</ul>
<hr style="margin: 20px 0;">
<h3>Thông tin thanh toán</h3>
<div style="text-align: center; margin: 20px 0;">
    {{#if qr_code_url}}
    <img src="{{qr_code_url}}" alt="Mã QR thanh toán" style="max-width: 300px; border: 1px solid #ddd; padding: 10px;" />
    {{/if}}
</div>
<p><b>Thông tin tài khoản:</b></p>
<ul>
    <li>Số tài khoản: <b>{{bank_account}}</b></li>
    <li>Tên tài khoản: <b>{{account_name}}</b></li>
    <li>Ngân hàng: <b>{{bank_name}}</b></li>
    <li>Nội dung chuyển khoản: <b style="color: #d9534f;">{{transfer_content}}</b></li>
</ul>
<p style="color: #856404; background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px;">
    <b>Lưu ý:</b> Vui lòng ghi đúng nội dung chuyển khoản để hệ thống đối soát tự động.
</p>
<p>Vui lòng thanh toán khoản phí này trong thời gian sớm nhất.</p>
<p>Trân trọng,<br>Ban Quản Lý</p>`;

    const newVariables = [
        'resident_name',
        'apartment_code',
        'month_year',
        'elec_cost',
        'water_cost',
        'total_cost',
        'qr_code_url',
        'bank_account',
        'account_name',
        'bank_name',
        'transfer_content',
    ];

    try {
        const updated = await prisma.email_templates.update({
            where: { code: templateCode },
            data: {
                body: newBody,
                variables: newVariables,
            },
        });
        console.log('Successfully updated template:', updated.code);
    } catch (error) {
        console.error('Error updating template:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
