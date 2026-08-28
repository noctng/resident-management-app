const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Email Templates...');
    const emailTemplates = [
        {
            code: 'PAYMENT_REMINDER',
            name: 'Nhắc thanh toán công nợ',
            subject: '[ThanhPhoCaPhe] Nhắc thanh toán hợp đồng {{contract_code}}',
            body: '<p>Xin chào <b>{{customer_name}}</b>,</p><p>Hệ thống xin thông báo Quý khách có khoản thanh toán đến hạn:</p><ul><li>Mã hợp đồng: {{contract_code}}</li><li>Khoản thanh toán: {{payment_description}}</li><li>Số tiền: <span style="color:red; font-weight:bold">{{amount}}</span></li><li>Hạn thanh toán: {{due_date}}</li></ul><p>Vui lòng thanh toán khoản phí này trong thời gian sớm nhất để tránh phát sinh lãi chậm trả.</p><p>Trân trọng,<br>Ban Quản Lý</p>',
            variables: [
                'customer_name',
                'contract_code',
                'payment_description',
                'amount',
                'due_date',
            ],
        },
        {
            code: 'UTILITY_BILL',
            name: 'Thông báo cước phí Điện/Nước',
            subject:
                '[ThanhPhoCaPhe] Thông báo tiền điện nước tháng {{month_year}} - {{apartment_code}}',
            body: '<h3>Xin chào {{resident_name}},</h3><p>Thông báo cước phí Điện/Nước cho căn hộ <b>{{apartment_code}}</b> tháng <b>{{month_year}}</b>:</p><ul><li>Tiền điện: {{elec_cost}} VNĐ</li><li>Tiền nước: {{water_cost}} VNĐ</li><li><b>Tổng cộng: <span style="color:red">{{total_cost}}</span></b></li></ul><p>Vui lòng thanh toán khoản phí này trong thời gian sớm nhất.</p><p>Trân trọng,<br>Ban Quản Lý</p>',
            variables: [
                'resident_name',
                'apartment_code',
                'month_year',
                'elec_cost',
                'water_cost',
                'total_cost',
            ],
        },
        {
            code: 'GENERAL_NOTIFICATION',
            name: 'Thông báo chung',
            subject: '[ThanhPhoCaPhe] {{subject}}',
            body: '<p>Xin chào {{customer_name}},</p><p>{{message}}</p><p>Trân trọng,<br>Ban Quản Lý</p>',
            variables: ['customer_name', 'subject', 'message'],
        },
    ];

    for (const t of emailTemplates) {
        await prisma.email_templates.upsert({
            where: { code: t.code },
            update: {},
            create: t,
        });
    }

    console.log('Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
