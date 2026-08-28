const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeBeforeCleanup() {
    try {
        const duplicateApartments = [
            { id: 'apt_0098', code: 'CAN04-02', keepContract: 'HD-1234-693' },
            { id: 'apt_0099', code: 'CAN04-03', keepContract: 'HD-1235-271' },
            { id: 'apt_0101', code: 'CAN04-06', keepContract: 'HD-1237-154' },
        ];

        console.log('\n=== PHÂN TÍCH TRƯỚC KHI XÓA ===\n');

        for (const apt of duplicateApartments) {
            console.log(`\n📍 Căn hộ: ${apt.code} (${apt.id})`);
            console.log(`   Sẽ giữ: ${apt.keepContract}\n`);

            const contracts = await prisma.contracts.findMany({
                where: { apartment_id: apt.id },
                include: {
                    customers: true,
                    contract_payments: true,
                },
                orderBy: { created_at: 'asc' },
            });

            contracts.forEach((contract, index) => {
                const willKeep = contract.contract_code === apt.keepContract;
                const symbol = willKeep ? '✅ GIỮ' : '❌ XÓA';

                console.log(`${symbol} Hợp đồng ${index + 1}: ${contract.contract_code}`);
                console.log(`   ID: ${contract.id}`);
                console.log(`   Khách hàng: ${contract.customers.name}`);
                console.log(`   Trạng thái: ${contract.status}`);
                console.log(`   Tạo lúc: ${contract.created_at}`);
                console.log(`   Tổng tiền: ${contract.total_amount?.toLocaleString()} VNĐ`);
                console.log(`   Số lần thanh toán: ${contract.contract_payments.length}`);

                if (contract.contract_payments.length > 0) {
                    console.log(`   Chi tiết thanh toán:`);
                    contract.contract_payments.forEach((payment) => {
                        console.log(
                            `     - ${payment.payment_date}: ${payment.amount?.toLocaleString()} VNĐ (${payment.status})`
                        );
                    });
                }
                console.log('');
            });

            // Check for related data
            const relatedData = await checkRelatedData(apt.id, contracts);
            if (relatedData.hasIssues) {
                console.log(`⚠️  CẢNH BÁO: Có dữ liệu liên quan cần xử lý!`);
                console.log(relatedData.details);
            }
        }

        console.log('\n=== TỔNG KẾT ===');
        console.log('Tổng số hợp đồng sẽ xóa: 6');
        console.log('Tổng số hợp đồng sẽ giữ: 3');
        console.log('\n⚠️  Vui lòng xem xét kỹ trước khi thực hiện xóa!\n');
    } catch (error) {
        console.error('Lỗi:', error);
    } finally {
        await prisma.$disconnect();
    }
}

async function checkRelatedData(apartmentId, contracts) {
    const contractIds = contracts.map((c) => c.id);

    // Check contract_transfers
    const transfers = await prisma.contract_transfers.findMany({
        where: { contract_id: { in: contractIds } },
    });

    // Check handover_checklists
    const checklists = await prisma.handover_checklists.findMany({
        where: { contract_id: { in: contractIds } },
    });

    const hasIssues = transfers.length > 0 || checklists.length > 0;
    const details = [];

    if (transfers.length > 0) {
        details.push(`   - ${transfers.length} bản ghi chuyển nhượng`);
    }
    if (checklists.length > 0) {
        details.push(`   - ${checklists.length} checklist bàn giao`);
    }

    return { hasIssues, details: details.join('\n') };
}

analyzeBeforeCleanup();
