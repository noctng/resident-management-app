const prisma = require('../config/prisma');
const { logActivity } = require('../utils/logger');

/**
 * Helper to normalize string for search (lowercase, remove accents, trim)
 */
function normalizeText(str) {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

/**
 * Handle incoming SePay Webhook
 * Documentation: https://docs.sepay.vn/sepay-webhooks/
 *
 * Payload format:
 * {
 *   "id": 26376,
 *   "gateway": "BIDV",
 *   "transactionDate": "2026-08-19 16:55:18",
 *   "accountNumber": "0000000001",
 *   "subAccount": "SBSEPAYPZW5LM83SUQE",
 *   "code": "",
 *   "content": "Giao dich thu nghiem 16h54m52s",
 *   "transferType": "in",
 *   "description": "Giao dich thu nghiem 16h54m52s",
 *   "transferAmount": 100000,
 *   "referenceCode": "SB3AA09DBE2D73",
 *   "accumulated": 0
 * }
 */
exports.handleSepayWebhook = async (req, res) => {
    try {
        const payload = req.body || {};
        console.log('💳 [SePay Webhook Received]:', JSON.stringify(payload));

        const {
            id: transactionId,
            gateway,
            transactionDate,
            accountNumber,
            content,
            description,
            transferType,
            transferAmount,
            referenceCode,
        } = payload;

        // Verify transfer type (only process incoming money "in")
        if (transferType && transferType.toLowerCase() !== 'in') {
            console.log('ℹ️ [SePay Webhook]: Ignored non-incoming transfer type:', transferType);
            return res.status(200).json({
                success: true,
                message: 'Ignored outgoing transaction',
            });
        }

        const rawContent = (content || description || '').trim();
        const amount = Number(transferAmount || 0);

        // Check if this is a test transaction from SePay
        const isTestTx =
            normalizeText(rawContent).includes('giaodichthunghiem') ||
            normalizeText(rawContent).includes('test') ||
            !rawContent;

        if (isTestTx) {
            console.log('✅ [SePay Test Webhook Verified]:', rawContent || 'Test ping');
            return res.status(200).json({
                success: true,
                message: 'Test webhook received and verified successfully',
                referenceCode,
            });
        }

        // Fetch all active apartments to match with the transfer content
        let apartments = [];
        try {
            apartments = await prisma.apartments.findMany({
                select: { id: true, code: true, house_type: true },
            });
        } catch (dbErr) {
            console.error('⚠️ [SePay DB Warning]: Failed to fetch apartments:', dbErr.message);
        }

        // Find matching apartment in transfer content
        let matchedApartment = null;
        const normalizedContent = normalizeText(rawContent);

        // Sort by longest code first to prevent partial match issues (e.g. CAN03-01 before CAN03)
        const sortedApartments = [...apartments].sort((a, b) => b.code.length - a.code.length);

        for (const apt of sortedApartments) {
            const normCode = normalizeText(apt.code);
            if (normCode && normalizedContent.includes(normCode)) {
                matchedApartment = apt;
                break;
            }
        }

        // Also check if apartment code is without dashes or spaces (e.g., "CAN0301" for "CAN03-01")
        if (!matchedApartment) {
            for (const apt of sortedApartments) {
                const strippedCode = apt.code.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                if (strippedCode.length >= 3 && normalizedContent.includes(strippedCode)) {
                    matchedApartment = apt;
                    break;
                }
            }
        }

        let utilityUpdated = null;
        let managementFeeUpdated = null;
        const txDate = transactionDate ? new Date(transactionDate) : new Date();

        if (matchedApartment) {
            console.log(
                `🎯 [SePay Match]: Found apartment ${matchedApartment.code} for content: "${rawContent}"`
            );

            const isUtilityIntent =
                normalizedContent.includes('ew') ||
                normalizedContent.includes('dien') ||
                normalizedContent.includes('nuoc');
            const isFeeIntent =
                normalizedContent.includes('ub') ||
                normalizedContent.includes('pql') ||
                normalizedContent.includes('fee') ||
                normalizedContent.includes('tonghop');

            // 1. Check & Reconcile Utility Records (Điện Nước)
            if (!isFeeIntent || isUtilityIntent) {
                try {
                    // Look for unpaid utility records for this apartment
                    const unpaidUtilityRecords = await prisma.utility_records.findMany({
                        where: {
                            apartment_id: matchedApartment.id,
                            payment_status: { not: 'PAID' },
                        },
                        orderBy: [{ year: 'desc' }, { month: 'desc' }],
                    });

                    if (unpaidUtilityRecords.length > 0) {
                        // Try to match exact amount if possible, or take the latest unpaid record
                        let targetUtility = unpaidUtilityRecords[0];
                        if (amount > 0) {
                            const exactMatch = unpaidUtilityRecords.find((r) => {
                                const total = Number(r.electricity_cost || 0) + Number(r.water_cost || 0);
                                return Math.abs(total - amount) <= 1000; // within 1,000 VND tolerance
                            });
                            if (exactMatch) targetUtility = exactMatch;
                        }

                        // Mark as PAID
                        utilityUpdated = await prisma.utility_records.update({
                            where: { id: targetUtility.id },
                            data: {
                                payment_status: 'PAID',
                                paid_date: txDate,
                            },
                        });

                        console.log(
                            `✅ [SePay Utility Reconciled]: Apartment ${matchedApartment.code}, Month ${targetUtility.month}/${targetUtility.year}`
                        );

                        // Log activity
                        await logActivity(
                            null,
                            'THANH_TOÁN_TỰ_ĐỘNG',
                            'UTILITY',
                            targetUtility.id,
                            matchedApartment.code,
                            `SePay tự động gạch nợ Điện Nước kỳ ${targetUtility.month}/${targetUtility.year} (${amount.toLocaleString('vi-VN')} đ) qua ${gateway || 'Ngân hàng'}`
                        );

                        // Send push notification to resident
                        try {
                            const { sendPushToApartment } = require('../services/pushService');
                            await sendPushToApartment(matchedApartment.id, {
                                title: '🎉 Thanh toán Điện Nước thành công!',
                                body: `Căn hộ ${matchedApartment.code} đã thanh toán thành công hóa đơn Điện Nước Tháng ${targetUtility.month}/${targetUtility.year} (${amount.toLocaleString('vi-VN')} đ).`,
                                url: '/?tab=utilities',
                                tag: `utility-paid-${targetUtility.id}`,
                            });
                        } catch (pushErr) {
                            console.error('Push notification error:', pushErr);
                        }
                    }
                } catch (err) {
                    console.error('❌ [SePay Utility Error]:', err);
                }
            }

            // 2. Check & Reconcile Management Fees / Unified Billing (Phí Quản Lý / Tổng Hợp)
            if (!isUtilityIntent || isFeeIntent) {
                try {
                    const unpaidManagementFees = await prisma.management_fees.findMany({
                        where: {
                            apartment_id: matchedApartment.id,
                            status: { not: 'PAID' },
                        },
                        orderBy: [{ year: 'desc' }, { month: 'desc' }],
                    });

                    if (unpaidManagementFees.length > 0) {
                        let targetFee = unpaidManagementFees[0];
                        if (amount > 0) {
                            const exactMatch = unpaidManagementFees.find(
                                (f) => Math.abs(Number(f.total_amount || 0) - amount) <= 1000
                            );
                            if (exactMatch) targetFee = exactMatch;
                        }

                        managementFeeUpdated = await prisma.management_fees.update({
                            where: { id: targetFee.id },
                            data: {
                                status: 'PAID',
                                payment_date: txDate,
                                payment_method: gateway || 'Ngân hàng (SePay)',
                            },
                        });

                        console.log(
                            `✅ [SePay Management Fee Reconciled]: Apartment ${matchedApartment.code}, Month ${targetFee.month}/${targetFee.year}`
                        );

                        // Log activity
                        await logActivity(
                            null,
                            'THANH_TOÁN_TỰ_ĐỘNG',
                            'MANAGEMENT_FEE',
                            targetFee.id,
                            matchedApartment.code,
                            `SePay tự động gạch nợ Phí Quản Lý kỳ ${targetFee.month}/${targetFee.year} (${amount.toLocaleString('vi-VN')} đ) qua ${gateway || 'Ngân hàng'}`
                        );

                        // Send push notification to resident
                        try {
                            const { sendPushToApartment } = require('../services/pushService');
                            await sendPushToApartment(matchedApartment.id, {
                                title: '🎉 Thanh toán Hóa Đơn Tổng Hợp thành công!',
                                body: `Căn hộ ${matchedApartment.code} đã thanh toán thành công hóa đơn Tháng ${targetFee.month}/${targetFee.year} (${amount.toLocaleString('vi-VN')} đ).`,
                                url: '/?tab=unified',
                                tag: `fee-paid-${targetFee.id}`,
                            });
                        } catch (pushErr) {
                            console.error('Push notification error:', pushErr);
                        }
                    }
                } catch (err) {
                    console.error('❌ [SePay Fee Error]:', err);
                }
            }
        } else {
            console.log(`ℹ️ [SePay]: No specific apartment matched for content: "${rawContent}"`);
        }

        // Always return 200 OK to SePay
        return res.status(200).json({
            success: true,
            message: 'Webhook processed successfully',
            matchedApartment: matchedApartment ? matchedApartment.code : null,
            utilityReconciled: !!utilityUpdated,
            feeReconciled: !!managementFeeUpdated,
            referenceCode,
        });
    } catch (err) {
        console.error('❌ [SePay Webhook Fatal Error]:', err);
        // Even on error, return 200 to prevent SePay from failing the webhook ping
        return res.status(200).json({
            success: true,
            warning: 'Processed with warnings',
            error: err.message,
        });
    }
};

/**
 * Health/Test endpoint for SePay Webhook URL verification
 */
exports.handleSepayWebhookTest = async (req, res) => {
    res.status(200).json({
        status: 'OK',
        service: 'SePay Webhook Endpoint',
        message: 'Endpoint is active and ready to receive POST requests from SePay.',
        timestamp: new Date().toISOString(),
    });
};
