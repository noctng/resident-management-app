const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

async function main() {
    console.log('Seed started...');

    // 1. Ensure Admin User exists
    const adminId = 'user_admin_001';
    const adminPermissions = [
        'dashboard',
        'apartments',
        'residents',
        'utilities',
        'amenities',
        'feedback',
        'resident_accounts',
        'users',
        'configuration',
        'logs',
        'crm',
    ];
    await prisma.users.upsert({
        where: { username: 'admin' },
        update: {
            permissions: adminPermissions,
        },
        create: {
            id: adminId,
            username: 'admin',
            password_hash: '$2b$10$R9h/lIPzHZf6sT1q/7p/f.Z/KxLpS/Qp9P0Z7jZ7jZ7jZ7jZ7jZ7j', // 'password'
            role: 0,
            permissions: adminPermissions,
        },
    });

    // 2. Create Apartments
    const apartmentTemplates = [
        {
            code: 'A101',
            floor: 1,
            houseType: 'CANTATA',
            area: 75.5,
            electricityType: 'RESIDENTIAL',
        },
        { code: 'A102', floor: 1, houseType: 'TESLA', area: 120.0, electricityType: 'BUSINESS' },
        {
            code: 'B201',
            floor: 2,
            houseType: 'CANTATA',
            area: 75.5,
            electricityType: 'RESIDENTIAL',
        },
        { code: 'B202', floor: 2, houseType: 'TESLA', area: 150.0, electricityType: 'RESIDENTIAL' },
        {
            code: 'C301',
            floor: 3,
            houseType: 'CANTATA',
            area: 85.0,
            electricityType: 'RESIDENTIAL',
        },
    ];

    const apartments = [];
    for (const t of apartmentTemplates) {
        const apt = await prisma.apartments.upsert({
            where: { code: t.code },
            update: {
                house_type: t.houseType,
                floor: t.floor,
                area: t.area,
                electricity_type: t.electricityType,
            },
            create: {
                house_type: t.houseType,
                code: t.code,
                floor: t.floor,
                area: t.area,
                electricity_type: t.electricityType,
            },
        });
        apartments.push(apt);
    }

    // 3. Create Residents (Owners and Tenants)
    const residentTemplates = [
        {
            name: 'Nguyễn Văn A',
            id_number: '001090001234',
            phone_number: '0912345678',
            status: 'OWNER',
            email: 'vana@example.com',
        },
        {
            name: 'Trần Thị B',
            id_number: '001090001235',
            phone_number: '0987654321',
            status: 'OWNER',
            email: 'thib@example.com',
        },
        {
            name: 'Lê Văn C',
            id_number: '001090001236',
            phone_number: '0901234567',
            status: 'TENANT',
            email: 'vanc@example.com',
        },
        {
            name: 'Phạm Thị D',
            id_number: '001090001237',
            phone_number: '0934567890',
            status: 'OWNER',
            email: 'thid@example.com',
        },
        {
            name: 'Hoàng Văn E',
            id_number: '001090001238',
            phone_number: '0945678901',
            status: 'FAMILY',
            email: 'vane@example.com',
        },
    ];

    const residents = [];
    for (let i = 0; i < residentTemplates.length; i++) {
        const t = residentTemplates[i];
        const resId = `res_${1000 + i}`;
        const res = await prisma.residents.upsert({
            where: { id_number: t.id_number },
            update: {
                name: t.name,
                phone_number: t.phone_number,
                relationship_status: t.status,
                email: t.email,
                is_active: true,
            },
            create: {
                id: resId,
                name: t.name,
                id_number: t.id_number,
                phone_number: t.phone_number,
                relationship_status: t.status,
                email: t.email,
                is_active: true,
                dob: new Date('1990-01-01'),
            },
        });
        residents.push(res);

        // Occupancy
        const apt = apartments[i % apartments.length];
        await prisma.occupancies.upsert({
            where: {
                apartment_id_resident_id: {
                    apartment_id: apt.id,
                    resident_id: res.id,
                },
            },
            update: {},
            create: {
                apartment_id: apt.id,
                resident_id: res.id,
            },
        });
    }

    // 4. CRM Data based on OWNER residents
    console.log('Generating CRM data for Owners...');
    const owners = residents.filter((r) => r.relationship_status === 'OWNER');

    for (const owner of owners) {
        // Customer
        const customer = await prisma.customers.upsert({
            where: { id: `cust_${owner.id}` },
            update: {
                name: owner.name,
                phone_number: owner.phone_number,
                email: owner.email,
                id_number: owner.id_number,
            },
            create: {
                id: `cust_${owner.id}`,
                name: owner.name,
                phone_number: owner.phone_number,
                email: owner.email,
                id_number: owner.id_number,
                address: 'Hà Nội, Việt Nam',
            },
        });

        // Find the apartment for this owner
        const occupancy = await prisma.occupancies.findFirst({
            where: { resident_id: owner.id },
        });

        if (occupancy) {
            const contractCode = `HD-${owner.id_number.slice(-4)}-${Math.floor(Math.random() * 1000)}`;
            const contract = await prisma.contracts.upsert({
                where: { contract_code: contractCode },
                update: {},
                create: {
                    id: `cont_${uuidv4().slice(0, 8)}`,
                    contract_code: contractCode,
                    customer_id: customer.id,
                    apartment_id: occupancy.apartment_id,
                    total_value: 3000000000,
                    vat_amount: 300000000,
                    maintenance_fee: 60000000,
                    status: 'SIGNED',
                    signed_date: new Date(),
                },
            });

            // Payments
            for (let j = 1; j <= 3; j++) {
                await prisma.contract_payments.create({
                    data: {
                        id: `pay_${uuidv4().slice(0, 8)}`,
                        contract_id: contract.id,
                        installment: j,
                        amount: 1000000000,
                        due_date: new Date(new Date().getFullYear(), new Date().getMonth() + j, 1),
                        status: j === 1 ? 'PAID' : 'PENDING',
                        payment_date: j === 1 ? new Date() : null,
                        description: `Đợt thanh toán thứ ${j}`,
                    },
                });
            }
        }
    }

    // 5. Utility records
    console.log('Adding utility records...');
    for (const apt of apartments) {
        for (let month = 10; month <= 12; month++) {
            const id = `util_${apt.code}_2024_${month}`;
            await prisma.utility_records.upsert({
                where: { apartment_id_month_year: { apartment_id: apt.id, month, year: 2024 } },
                update: {},
                create: {
                    id: id,
                    apartment_id: apt.id,
                    month: month,
                    year: 2024,
                    electricity_old_reading: month * 100,
                    electricity_new_reading: month * 100 + 150,
                    water_old_reading: month * 10,
                    water_new_reading: month * 10 + 20,
                    electricity_cost: 450000,
                    water_cost: 150000,
                },
            });
        }
    }

    // 6. Email Templates
    console.log('Seeding Email Templates...');
    const emailTemplates = [
        {
            code: 'PAYMENT_REMINDER',
            name: 'Nhắc thanh toán công nợ',
            subject: '[ThanhPhoCaPhe] Nhắc thanh toán hợp đồng {{contract_code}}',
            body: '<p>Xin chào <b>{{customer_name}}</b>,</p><p>Hệ thống xin thông báo Quý khách có khoản thanh toán đến hạn:</p><ul><li>Mã hợp đồng: {{contract_code}}</li><li>Khoản thanh toán: {{payment_description}}</li><li>Số tiền: <span style="color:red; font-weight:bold">{{amount}}</span></li><li>Hạn thanh toán: {{due_date}}</li></ul><p>Vui lòng thanh toán đúng hạn.</p><p>Trân trọng,<br>Ban Quản Lý</p>',
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
            body: '<h3>Xin chào {{resident_name}},</h3><p>Thông báo cước phí Điện/Nước cho căn hộ <b>{{apartment_code}}</b> tháng <b>{{month_year}}</b>:</p><ul><li>Tiền điện: {{elec_cost}} VNĐ</li><li>Tiền nước: {{water_cost}} VNĐ</li><li><b>Tổng cộng: <span style="color:red">{{total_cost}}</span></b></li></ul><hr style="margin: 20px 0;"><h3>Thông tin thanh toán</h3><div style="text-align: center; margin: 20px 0;">{{#if qr_code_url}}<img src="{{qr_code_url}}" alt="Mã QR thanh toán" style="max-width: 300px; border: 1px solid #ddd; padding: 10px;" />{{/if}}</div><p><b>Thông tin tài khoản:</b></p><ul><li>Số tài khoản: <b>{{bank_account}}</b></li><li>Tên tài khoản: <b>{{account_name}}</b></li><li>Ngân hàng: <b>{{bank_name}}</b></li><li>Nội dung chuyển khoản: <b style="color: #d9534f;">{{transfer_content}}</b></li></ul><p style="color: #856404; background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px;"><b>Lưu ý:</b> Vui lòng ghi đúng nội dung chuyển khoản để hệ thống đối soát tự động.</p><p>Vui lòng thanh toán khoản phí này trong thời gian sớm nhất.</p><p>Trân trọng,<br>Ban Quản Lý</p>',
            variables: [
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
            ],
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
