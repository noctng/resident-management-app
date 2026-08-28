const prisma = require('../config/prisma');
const { generateRandomId } = require('../utils/helpers');
const { logActivity } = require('../utils/logger');
const { getContractPaymentSummary } = require('../services/paymentScheduleService');
const bcrypt = require('bcrypt');

/**
 * Handover Controller
 * Manages handover checklist and eligibility
 */

/**
 * Create default handover checklist for a contract
 */
exports.createHandoverChecklist = async (req, res) => {
    try {
        const { id } = req.params;

        const contract = await prisma.contracts.findUnique({
            where: { id },
        });

        if (!contract) {
            return res.status(404).json({ message: 'Hợp đồng không tồn tại' });
        }

        // Default checklist items
        const defaultItems = [
            { name: 'Hoàn tất thanh toán ≥ 95%', order: 1, required: true },
            { name: 'Kiểm tra kỹ thuật căn hộ', order: 2, required: true },
            { name: 'Bàn giao chìa khóa', order: 3, required: true },
            { name: 'Ký biên bản bàn giao', order: 4, required: true },
            { name: 'Hướng dẫn sử dụng tiện ích', order: 5, required: false },
            { name: 'Cung cấp tài liệu bảo hành', order: 6, required: true },
        ];

        const checklistItems = defaultItems.map((item) => ({
            id: `chk_${generateRandomId()}`,
            contract_id: id,
            item_name: item.name,
            item_order: item.order,
            is_required: item.required,
            is_completed: false,
        }));

        await prisma.handover_checklists.createMany({
            data: checklistItems,
        });

        await logActivity(
            req.user,
            'CREATE',
            'CONTRACT',
            id,
            contract.contract_code,
            'Tạo checklist bàn giao'
        );

        res.json({
            message: 'Đã tạo checklist bàn giao',
            itemsCreated: checklistItems.length,
        });
    } catch (error) {
        console.error('Error creating handover checklist:', error);
        res.status(500).json({ message: 'Lỗi tạo checklist' });
    }
};

/**
 * Get handover checklist
 */
exports.getHandoverChecklist = async (req, res) => {
    try {
        const { id } = req.params;

        const checklist = await prisma.handover_checklists.findMany({
            where: { contract_id: id },
            orderBy: { item_order: 'asc' },
        });

        res.json(checklist);
    } catch (error) {
        console.error('Error fetching checklist:', error);
        res.status(500).json({ message: 'Lỗi lấy checklist' });
    }
};

/**
 * Update checklist item
 */
exports.updateChecklistItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { isCompleted, notes } = req.body;

        const item = await prisma.handover_checklists.findUnique({
            where: { id: itemId },
            include: { contracts: true },
        });

        if (!item) {
            return res.status(404).json({ message: 'Mục checklist không tồn tại' });
        }

        await prisma.handover_checklists.update({
            where: { id: itemId },
            data: {
                is_completed: isCompleted,
                completed_at: isCompleted ? new Date() : null,
                completed_by: isCompleted ? req.user.id : null,
                notes: notes || item.notes,
            },
        });

        await logActivity(
            req.user,
            'UPDATE',
            'CONTRACT',
            item.contract_id,
            item.contracts.contract_code,
            `Cập nhật checklist: ${item.item_name} - ${isCompleted ? 'Hoàn tất' : 'Chưa hoàn tất'}`
        );

        res.json({ message: 'Đã cập nhật checklist' });
    } catch (error) {
        console.error('Error updating checklist item:', error);
        res.status(500).json({ message: 'Lỗi cập nhật checklist' });
    }
};

/**
 * Check handover eligibility
 */
exports.checkHandoverEligibility = async (req, res) => {
    try {
        const { id } = req.params;

        const contract = await prisma.contracts.findUnique({
            where: { id },
            include: {
                handover_checklists: true,
                snag_items: true,
            },
        });

        if (!contract) {
            return res.status(404).json({ message: 'Hợp đồng không tồn tại' });
        }

        const paymentSummary = await getContractPaymentSummary(id);
        const paymentPercentage = parseFloat(paymentSummary.paymentPercentage);
        const openCriticalSnags = (contract.snag_items || []).filter(
            (item) => item.status === 'OPEN' && item.severity === 'CRITICAL'
        );

        // Check conditions
        const conditions = {
            paymentComplete: paymentPercentage >= 95,
            paymentPercentage: paymentPercentage,
            noDispute: contract.status !== 'CANCELLED',
            checklistComplete: contract.handover_checklists
                .filter((item) => item.is_required)
                .every((item) => item.is_completed),
            noCriticalSnags: openCriticalSnags.length === 0,
            openCriticalSnagsTotal: openCriticalSnags.length,
            requiredItemsTotal: contract.handover_checklists.filter((i) => i.is_required).length,
            completedItemsTotal: contract.handover_checklists.filter((i) => i.is_completed).length,
        };

        const eligible =
            conditions.paymentComplete && conditions.noDispute && conditions.checklistComplete && conditions.noCriticalSnags;

        res.json({
            eligible,
            conditions,
            message: eligible
                ? 'Đủ điều kiện bàn giao'
                : openCriticalSnags.length > 0
                ? `Chưa đủ điều kiện: Còn ${openCriticalSnags.length} lỗi kỹ thuật nghiêm trọng (CRITICAL) chưa sửa`
                : 'Chưa đủ điều kiện bàn giao',
        });
    } catch (error) {
        console.error('Error checking eligibility:', error);
        res.status(500).json({ message: 'Lỗi kiểm tra điều kiện' });
    }
};

/**
 * Complete handover
 */
exports.completeHandover = async (req, res) => {
    try {
        const { id } = req.params;
        const { handoverDate, notes } = req.body;

        // Check eligibility first
        const eligibilityCheck = await exports.checkHandoverEligibility(
            { params: { id } },
            { json: (data) => data }
        );

        if (!eligibilityCheck.eligible) {
            return res.status(400).json({
                message: 'Chưa đủ điều kiện bàn giao',
                conditions: eligibilityCheck.conditions,
            });
        }

        const contract = await prisma.contracts.findUnique({
            where: { id },
            include: { customers: true },
        });

        // Update contract
        await prisma.contracts.update({
            where: { id },
            data: {
                handover_completed: true,
                handover_date: handoverDate ? new Date(handoverDate) : new Date(),
                status: 'PAYING', // Move to PAYING if not already
            },
        });

        // ---------------------------------------------------------
        // AUTOMATION: Create/Link Resident & Occupancy
        // ---------------------------------------------------------
        if (contract.customers) {
            const customer = contract.customers;

            // 1. Check if resident exists (Prefer ID Card for uniqueness, fallback to Phone)
            let resident = await prisma.residents.findFirst({
                where: {
                    OR: [
                        { id_number: customer.identity_card },
                        { identity_card: customer.identity_card },
                        { phone_number: customer.phone },
                    ],
                },
            });

            // 2. Create if not exists
            if (!resident) {
                resident = await prisma.residents.create({
                    data: {
                        name: customer.name,
                        phone_number: customer.phone,
                        email: customer.email,
                        id_number: customer.identity_card,
                        dob: customer.date_of_birth,
                        gender: customer.gender,
                        is_active: true,
                        relationship_status: 'OWNER',
                        can_use_amenities: true,
                    },
                });
                console.log(`[Handover] Created new resident: ${customer.name}`);
            } else {
                // If exists but missing phone, update it
                if (!resident.phone_number && customer.phone) {
                    await prisma.residents.update({
                        where: { id: resident.id },
                        data: { phone_number: customer.phone },
                    });
                }
            }

            // 3. Create Account (if phone exists)
            if (resident.phone_number) {
                const existingAccount = await prisma.resident_accounts.findUnique({
                    where: { resident_id: resident.id },
                });

                if (!existingAccount) {
                    const defaultPassword = 'Abc@12345';
                    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

                    await prisma.resident_accounts.create({
                        data: {
                            resident_id: resident.id,
                            password_hash: hashedPassword,
                        },
                    });
                    console.log(
                        `[Handover] Created account for resident: ${resident.name} with default password`
                    );
                }
            }

            // 4. Create Occupancy (Owner)
            const existingOccupancy = await prisma.occupancies.findFirst({
                where: {
                    apartment_id: contract.apartment_id,
                    resident_id: resident.id,
                    status: 'RESIDING',
                },
            });

            if (!existingOccupancy) {
                await prisma.occupancies.create({
                    data: {
                        apartment_id: contract.apartment_id,
                        resident_id: resident.id,
                        status: 'RESIDING',
                        type: 'OWNER',
                        start_date: handoverDate ? new Date(handoverDate) : new Date(),
                    },
                });
                console.log(`[Handover] Linked occupancy for resident: ${resident.name}`);
            }
        }
        // ---------------------------------------------------------

        // Create lifecycle event
        await prisma.contract_lifecycle_events.create({
            data: {
                id: `evt_${generateRandomId()}`,
                contract_id: id,
                event_type: 'HANDOVER',
                event_date: handoverDate ? new Date(handoverDate) : new Date(),
                performed_by: req.user.id,
                notes: notes || 'Hoàn tất bàn giao căn hộ',
            },
        });

        await logActivity(
            req.user,
            'UPDATE',
            'CONTRACT',
            id,
            contract.contract_code,
            'Hoàn tất bàn giao căn hộ'
        );

        res.json({ message: 'Đã hoàn tất bàn giao thành công' });
    } catch (error) {
        console.error('Error completing handover:', error);
        res.status(500).json({ message: 'Lỗi hoàn tất bàn giao' });
    }
};

module.exports = exports;
