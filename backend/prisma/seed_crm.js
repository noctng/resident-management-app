const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function generateRandomId() {
    return Math.random().toString(36).substring(2, 15);
}

async function seedCRMData() {
    try {
        console.log('🌱 Starting CRM seed data...');

        // Get some apartments to link contracts to
        const apartments = await prisma.apartments.findMany({
            take: 5,
        });

        if (apartments.length === 0) {
            console.log('⚠️  No apartments found. Please seed apartments first.');
            return;
        }

        // Create 3 sample customers
        const customers = [];
        const customerData = [
            {
                name: 'Nguyễn Văn An',
                phone: '0901234567',
                email: 'nva@example.com',
                idNumber: '001234567890',
            },
            {
                name: 'Trần Thị Bình',
                phone: '0912345678',
                email: 'ttb@example.com',
                idNumber: '001234567891',
            },
            {
                name: 'Lê Hoàng Cường',
                phone: '0923456789',
                email: 'lhc@example.com',
                idNumber: '001234567892',
            },
        ];

        for (const data of customerData) {
            const customer = await prisma.customers.create({
                data: {
                    id: `cust_${generateRandomId()}`,
                    name: data.name,
                    phone_number: data.phone,
                    email: data.email,
                    id_number: data.idNumber,
                    address: 'TP. Hồ Chí Minh',
                    notes: 'Khách hàng tiềm năng',
                },
            });
            customers.push(customer);
            console.log(`✅ Created customer: ${customer.name}`);
        }

        // Create contracts for each customer
        for (let i = 0; i < customers.length; i++) {
            const customer = customers[i];
            const apartment = apartments[i % apartments.length];

            const contractStatuses = ['DEPOSIT', 'SIGNED', 'PAYING'];
            const status = contractStatuses[i % contractStatuses.length];

            const contract = await prisma.contracts.create({
                data: {
                    id: `cont_${generateRandomId()}`,
                    contract_code: `HD${String(i + 1).padStart(4, '0')}`,
                    customer_id: customer.id,
                    apartment_id: apartment.id,
                    total_value: 5000000000 + i * 100000000, // 5-7 billion VND
                    vat_amount: 500000000,
                    maintenance_fee: 50000000,
                    status: status,
                    signed_date: status !== 'DEPOSIT' ? new Date('2024-01-15') : null,
                },
            });

            console.log(`✅ Created contract: ${contract.contract_code} - ${status}`);

            // Create payment schedule for each contract
            const numPayments = 5;
            const amountPerPayment = Math.floor(contract.total_value / numPayments);

            for (let j = 0; j < numPayments; j++) {
                const dueDate = new Date('2024-02-01');
                dueDate.setMonth(dueDate.getMonth() + j);

                const isPaid = j < i; // First contract has 0 paid, second has 1 paid, etc.
                const paymentStatus = isPaid
                    ? 'PAID'
                    : dueDate < new Date()
                      ? 'OVERDUE'
                      : 'PENDING';

                await prisma.contract_payments.create({
                    data: {
                        id: `pay_${generateRandomId()}`,
                        contract_id: contract.id,
                        installment: j + 1,
                        description: `Đợt ${j + 1}/${numPayments}`,
                        due_date: dueDate,
                        amount: amountPerPayment,
                        paid_amount: isPaid ? amountPerPayment : 0,
                        payment_date: isPaid ? dueDate : null,
                        status: paymentStatus,
                        late_fee: paymentStatus === 'OVERDUE' ? 5000000 : 0,
                        days_overdue:
                            paymentStatus === 'OVERDUE'
                                ? Math.floor((new Date() - dueDate) / (1000 * 60 * 60 * 24))
                                : 0,
                    },
                });
            }

            console.log(`  ✅ Created ${numPayments} payments for ${contract.contract_code}`);

            // Create lifecycle event for signed contracts
            if (status !== 'DEPOSIT') {
                await prisma.contract_lifecycle_events.create({
                    data: {
                        id: `evt_${generateRandomId()}`,
                        contract_id: contract.id,
                        event_type: 'SIGNED',
                        event_date: new Date('2024-01-15'),
                        notes: 'Hợp đồng đã được ký kết',
                        metadata: { location: 'Văn phòng CĐT' },
                    },
                });
                console.log(`  ✅ Created lifecycle event for ${contract.contract_code}`);
            }
        }

        console.log('\n🎉 CRM seed data completed!');
        console.log(`Created ${customers.length} customers and ${customers.length} contracts`);
    } catch (error) {
        console.error('❌ Error seeding CRM data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

seedCRMData();
