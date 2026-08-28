const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

async function resetTestData() {
    console.log('\n=== BẮT ĐẦU RESET DỮ LIỆU TEST ===\n');

    try {
        // Step 1: Delete all existing data
        console.log('🗑️  Bước 1: Xóa dữ liệu cũ...');

        await prisma.contract_payments.deleteMany({});
        console.log('   ✅ Đã xóa contract_payments');

        await prisma.contract_transfers.deleteMany({});
        console.log('   ✅ Đã xóa contract_transfers');

        await prisma.handover_checklists.deleteMany({});
        console.log('   ✅ Đã xóa handover_checklists');

        await prisma.contracts.deleteMany({});
        console.log('   ✅ Đã xóa contracts');

        await prisma.customers.deleteMany({});
        console.log('   ✅ Đã xóa customers');

        // Step 2: Get apartment IDs
        console.log('\n📋 Bước 2: Lấy thông tin căn hộ...');
        const apartments = await prisma.apartments.findMany({
            where: {
                code: { in: ['CAN04-01', 'CAN04-02', 'CAN04-03'] },
            },
            orderBy: { code: 'asc' },
        });

        if (apartments.length !== 3) {
            throw new Error(
                `Chỉ tìm thấy ${apartments.length}/3 căn hộ. Cần có CAN04-01, CAN04-02, CAN04-03`
            );
        }

        console.log(`   ✅ Tìm thấy ${apartments.length} căn hộ`);
        apartments.forEach((apt) => {
            console.log(`      - ${apt.code} (${apt.id})`);
        });

        // Step 3: Create test customers
        console.log('\n👥 Bước 3: Tạo khách hàng mẫu...');

        const customers = [
            {
                id: 'cust_test_001',
                name: 'Nguyễn Văn A',
                phone_number: '0912345678',
                email: 'nguyenvana@example.com',
                id_number: '001234567890',
                address: 'Hà Nội',
                notes: 'Khách hàng test 1',
            },
            {
                id: 'cust_test_002',
                name: 'Trần Thị B',
                phone_number: '0987654321',
                email: 'tranthib@example.com',
                id_number: '002345678901',
                address: 'Hồ Chí Minh',
                notes: 'Khách hàng test 2',
            },
            {
                id: 'cust_test_003',
                name: 'Lê Văn C',
                phone_number: '0909123456',
                email: 'levanc@example.com',
                id_number: '003456789012',
                address: 'Đà Nẵng',
                notes: 'Khách hàng test 3',
            },
        ];

        for (const customer of customers) {
            await prisma.customers.create({ data: customer });
            console.log(`   ✅ Tạo khách hàng: ${customer.name}`);
        }

        // Step 4: Create test contracts
        console.log('\n📄 Bước 4: Tạo hợp đồng mẫu...');

        const contracts = [
            {
                id: 'cont_test_001',
                contract_code: 'HD-TEST-001',
                customer_id: 'cust_test_001',
                apartment_id: apartments[0].id,
                status: 'SIGNED',
                total_value: 3000000000,
                vat_amount: 300000000,
                maintenance_fee: 0,
                signed_date: new Date('2026-01-15'),
            },
            {
                id: 'cont_test_002',
                contract_code: 'HD-TEST-002',
                customer_id: 'cust_test_002',
                apartment_id: apartments[1].id,
                status: 'SIGNED',
                total_value: 3000000000,
                vat_amount: 300000000,
                maintenance_fee: 0,
                signed_date: new Date('2026-01-15'),
            },
            {
                id: 'cont_test_003',
                contract_code: 'HD-TEST-003',
                customer_id: 'cust_test_003',
                apartment_id: apartments[2].id,
                status: 'COMPLETED',
                total_value: 3000000000,
                vat_amount: 300000000,
                maintenance_fee: 0,
                signed_date: new Date('2026-01-01'),
                handover_completed: true,
                handover_date_actual: new Date('2026-01-20'),
            },
        ];

        for (let i = 0; i < contracts.length; i++) {
            await prisma.contracts.create({ data: contracts[i] });
            console.log(
                `   ✅ Tạo hợp đồng: ${contracts[i].contract_code} - ${apartments[i].code}`
            );
        }

        // Step 5: Skip payment creation for now (can be added via UI)
        console.log('\n💰 Bước 5: Bỏ qua tạo thanh toán (có thể thêm qua UI)...');
        console.log('   ⏭️  Đã bỏ qua');

        // const payments = [
        //     // Contract 1 - Nguyễn Văn A
        //     {
        //         contract_id: 'cont_test_001',
        //         amount: 1000000000,
        //         payment_date: new Date('2026-01-15'),
        //         status: 'PAID',
        //         payment_method: 'BANK_TRANSFER',
        //         notes: 'Thanh toán đợt 1'
        //     },
        //     {
        //         contract_id: 'cont_test_001',
        //         amount: 1000000000,
        //         due_date: new Date('2026-03-01'),
        //         status: 'PENDING',
        //         notes: 'Thanh toán đợt 2'
        //     },
        //     {
        //         contract_id: 'cont_test_001',
        //         amount: 1000000000,
        //         due_date: new Date('2026-05-01'),
        //         status: 'PENDING',
        //         notes: 'Thanh toán đợt 3'
        //     },
        //     // Contract 2 - Trần Thị B
        //     {
        //         contract_id: 'cont_test_002',
        //         amount: 1000000000,
        //         payment_date: new Date('2026-01-15'),
        //         status: 'PAID',
        //         payment_method: 'BANK_TRANSFER',
        //         notes: 'Thanh toán đợt 1'
        //     },
        //     {
        //         contract_id: 'cont_test_002',
        //         amount: 1000000000,
        //         due_date: new Date('2026-03-01'),
        //         status: 'PENDING',
        //         notes: 'Thanh toán đợt 2'
        //     },
        //     {
        //         contract_id: 'cont_test_002',
        //         amount: 1000000000,
        //         due_date: new Date('2026-05-01'),
        //         status: 'PENDING',
        //         notes: 'Thanh toán đợt 3'
        //     },
        //     // Contract 3 - Lê Văn C (COMPLETED)
        //     {
        //         contract_id: 'cont_test_003',
        //         amount: 1000000000,
        //         payment_date: new Date('2026-01-05'),
        //         status: 'PAID',
        //         payment_method: 'BANK_TRANSFER',
        //         notes: 'Thanh toán đợt 1'
        //     },
        //     {
        //         contract_id: 'cont_test_003',
        //         amount: 1000000000,
        //         payment_date: new Date('2026-01-10'),
        //         status: 'PAID',
        //         payment_method: 'BANK_TRANSFER',
        //         notes: 'Thanh toán đợt 2'
        //     },
        //     {
        //         contract_id: 'cont_test_003',
        //         amount: 1000000000,
        //         payment_date: new Date('2026-01-15'),
        //         status: 'PAID',
        //         payment_method: 'BANK_TRANSFER',
        //         notes: 'Thanh toán đợt 3 (Hoàn thành)'
        //     }
        // ];

        // for (let i = 0; i < payments.length; i++) {
        //     const paymentWithId = {
        //         id: `pay_test_${String(i + 1).padStart(3, '0')}`,
        //         ...payments[i]
        //     };
        //     await prisma.contract_payments.create({ data: paymentWithId });
        // }
        // console.log(`   ✅ Tạo ${payments.length} bản ghi thanh toán`);

        // Summary
        console.log('\n=== TỔNG KẾT ===');
        console.log('✅ Đã xóa sạch dữ liệu cũ');
        console.log('✅ Đã tạo 3 khách hàng mẫu');
        console.log('✅ Đã tạo 3 hợp đồng mẫu');
        console.log('\n📋 Dữ liệu mẫu:');
        console.log('   1. Nguyễn Văn A - CAN04-01 - HD-TEST-001 (SIGNED)');
        console.log('   2. Trần Thị B   - CAN04-02 - HD-TEST-002 (SIGNED)');
        console.log('   3. Lê Văn C     - CAN04-03 - HD-TEST-003 (COMPLETED)');
        console.log('\n✅ HOÀN THÀNH!\n');
    } catch (error) {
        console.error('\n❌ LỖI:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

resetTestData();
