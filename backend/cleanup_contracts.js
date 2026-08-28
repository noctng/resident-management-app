const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script làm sạch hợp đồng trùng lặp
 *
 * Chiến lược:
 * 1. Giữ hợp đồng cũ nhất (created_at sớm nhất)
 * 2. Migrate dữ liệu thanh toán từ các hợp đồng bị xóa sang hợp đồng được giữ
 * 3. Cập nhật contract_transfers để trỏ về hợp đồng được giữ
 * 4. Xóa các hợp đồng trùng lặp
 */

const DUPLICATE_APARTMENTS = [
    {
        id: 'apt_0098',
        code: 'CAN04-02',
        keepContractCode: 'HD-1234-693',
        keepContractId: 'cont_0e46c6bb',
        deleteContractIds: ['cont_c5829fc0', 'cont_a1664478'],
    },
    {
        id: 'apt_0099',
        code: 'CAN04-03',
        keepContractCode: 'HD-1235-271',
        keepContractId: 'cont_ff7c3b85',
        deleteContractIds: ['cont_99feead9', 'cont_9c36d74a'],
    },
    {
        id: 'apt_0101',
        code: 'CAN04-06',
        keepContractCode: 'HD-1237-154',
        keepContractId: 'cont_e8fbae88',
        deleteContractIds: ['cont_791f3fc5', 'cont_e2fc4836'],
    },
];

async function cleanupDuplicateContracts(dryRun = true) {
    console.log('\n=== BẮT ĐẦU LÀM SẠCH HỢP ĐỒNG TRÙNG LẶP ===\n');
    console.log(
        `Mode: ${dryRun ? '🔍 DRY RUN (Không thay đổi dữ liệu)' : '⚠️  THỰC THI (Sẽ xóa dữ liệu)'}\n`
    );

    try {
        for (const apt of DUPLICATE_APARTMENTS) {
            console.log(`\n📍 Xử lý căn hộ: ${apt.code}`);
            console.log(`   Giữ: ${apt.keepContractCode} (${apt.keepContractId})`);
            console.log(`   Xóa: ${apt.deleteContractIds.length} hợp đồng\n`);

            // Step 1: Migrate payment data
            console.log('   📋 Bước 1: Migrate dữ liệu thanh toán...');
            for (const deleteId of apt.deleteContractIds) {
                const payments = await prisma.contract_payments.findMany({
                    where: { contract_id: deleteId },
                });

                console.log(`      - Hợp đồng ${deleteId}: ${payments.length} thanh toán`);

                if (!dryRun && payments.length > 0) {
                    // Update contract_id to point to kept contract
                    await prisma.contract_payments.updateMany({
                        where: { contract_id: deleteId },
                        data: { contract_id: apt.keepContractId },
                    });
                    console.log(`        ✅ Đã migrate ${payments.length} thanh toán`);
                }
            }

            // Step 2: Update contract_transfers
            console.log('   🔄 Bước 2: Cập nhật contract_transfers...');
            const transfers = await prisma.contract_transfers.findMany({
                where: {
                    contract_id: { in: apt.deleteContractIds },
                },
            });

            console.log(`      - Tìm thấy ${transfers.length} bản ghi chuyển nhượng`);

            if (!dryRun && transfers.length > 0) {
                await prisma.contract_transfers.updateMany({
                    where: { contract_id: { in: apt.deleteContractIds } },
                    data: { contract_id: apt.keepContractId },
                });
                console.log(`        ✅ Đã cập nhật ${transfers.length} bản ghi`);
            }

            // Step 3: Update handover_checklists
            console.log('   ✓ Bước 3: Cập nhật handover_checklists...');
            const checklists = await prisma.handover_checklists.findMany({
                where: { contract_id: { in: apt.deleteContractIds } },
            });

            console.log(`      - Tìm thấy ${checklists.length} checklist`);

            if (!dryRun && checklists.length > 0) {
                await prisma.handover_checklists.updateMany({
                    where: { contract_id: { in: apt.deleteContractIds } },
                    data: { contract_id: apt.keepContractId },
                });
                console.log(`        ✅ Đã cập nhật ${checklists.length} checklist`);
            }

            // Step 4: Delete duplicate contracts
            console.log('   🗑️  Bước 4: Xóa hợp đồng trùng lặp...');
            if (!dryRun) {
                const result = await prisma.contracts.deleteMany({
                    where: { id: { in: apt.deleteContractIds } },
                });
                console.log(`        ✅ Đã xóa ${result.count} hợp đồng`);
            } else {
                console.log(`        🔍 Sẽ xóa ${apt.deleteContractIds.length} hợp đồng`);
            }

            console.log(`   ✅ Hoàn thành căn hộ ${apt.code}`);
        }

        console.log('\n=== TỔNG KẾT ===');
        console.log(`✅ Đã xử lý ${DUPLICATE_APARTMENTS.length} căn hộ`);
        console.log(
            `✅ Tổng số hợp đồng sẽ xóa: ${DUPLICATE_APARTMENTS.reduce((sum, apt) => sum + apt.deleteContractIds.length, 0)}`
        );

        if (dryRun) {
            console.log('\n⚠️  ĐÂY LÀ DRY RUN - Không có dữ liệu nào bị thay đổi');
            console.log('   Để thực thi thật, chạy: node backend/cleanup_contracts.js --execute\n');
        } else {
            console.log('\n✅ ĐÃ HOÀN THÀNH - Dữ liệu đã được làm sạch\n');
        }
    } catch (error) {
        console.error('\n❌ LỖI:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Check command line arguments
const args = process.argv.slice(2);
const execute = args.includes('--execute');

cleanupDuplicateContracts(!execute);
