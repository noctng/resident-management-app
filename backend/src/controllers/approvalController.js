const prisma = require('../config/prisma');
const { generateRandomId } = require('../utils/helpers');
const { logActivity } = require('../utils/logger');

/**
 * Approval Workflow Controller
 * Handles multi-level approval for contract modifications
 */

/**
 * Create approval request
 */
exports.createApprovalRequest = async (req, res) => {
    try {
        const { requestType, contractId, requestData, notes } = req.body;

        if (!['EXTENSION', 'DISCOUNT', 'TRANSFER', 'CANCELLATION'].includes(requestType)) {
            return res.status(400).json({ message: 'Loại yêu cầu không hợp lệ' });
        }

        // Check if contract exists
        if (contractId) {
            const contract = await prisma.contracts.findUnique({
                where: { id: contractId },
            });

            if (!contract) {
                return res.status(404).json({ message: 'Hợp đồng không tồn tại' });
            }
        }

        // Create approval request
        const approval = await prisma.approval_workflows.create({
            data: {
                id: `appr_${generateRandomId()}`,
                request_type: requestType,
                contract_id: contractId,
                requested_by: req.user.id,
                status: 'PENDING',
                request_data: requestData || {},
            },
        });

        await logActivity(
            req.user,
            'CREATE',
            'APPROVAL',
            approval.id,
            `${requestType} Request`,
            notes || `Tạo yêu cầu phê duyệt: ${requestType}`
        );

        res.json({
            message: 'Đã tạo yêu cầu phê duyệt',
            approval,
        });
    } catch (error) {
        console.error('Error creating approval request:', error);
        res.status(500).json({ message: 'Lỗi tạo yêu cầu phê duyệt' });
    }
};

/**
 * Get all pending approvals
 */
exports.getPendingApprovals = async (req, res) => {
    try {
        const approvals = await prisma.approval_workflows.findMany({
            where: { status: 'PENDING' },
            include: {
                contracts: {
                    include: {
                        customers: true,
                        apartments: true,
                    },
                },
            },
            orderBy: { requested_at: 'desc' },
        });

        res.json(approvals);
    } catch (error) {
        console.error('Error fetching pending approvals:', error);
        res.status(500).json({ message: 'Lỗi lấy danh sách phê duyệt' });
    }
};

/**
 * Get approval history for a contract
 */
exports.getContractApprovals = async (req, res) => {
    try {
        const { contractId } = req.params;

        const approvals = await prisma.approval_workflows.findMany({
            where: { contract_id: contractId },
            orderBy: { requested_at: 'desc' },
        });

        res.json(approvals);
    } catch (error) {
        console.error('Error fetching contract approvals:', error);
        res.status(500).json({ message: 'Lỗi lấy lịch sử phê duyệt' });
    }
};

/**
 * Approve request
 */
exports.approveRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const approval = await prisma.approval_workflows.findUnique({
            where: { id },
            include: {
                contracts: true,
            },
        });

        if (!approval) {
            return res.status(404).json({ message: 'Yêu cầu không tồn tại' });
        }

        if (approval.status !== 'PENDING') {
            return res.status(400).json({ message: 'Yêu cầu đã được xử lý' });
        }

        // Update approval status
        await prisma.approval_workflows.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approver_id: req.user.id,
                approved_at: new Date(),
            },
        });

        // Execute the approved action based on request type
        await executeApprovedAction(approval);

        await logActivity(
            req.user,
            'APPROVE',
            'APPROVAL',
            id,
            `${approval.request_type} Request`,
            notes || `Phê duyệt yêu cầu: ${approval.request_type}`
        );

        res.json({ message: 'Đã phê duyệt yêu cầu' });
    } catch (error) {
        console.error('Error approving request:', error);
        res.status(500).json({ message: 'Lỗi phê duyệt yêu cầu' });
    }
};

/**
 * Reject request
 */
exports.rejectRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const approval = await prisma.approval_workflows.findUnique({
            where: { id },
        });

        if (!approval) {
            return res.status(404).json({ message: 'Yêu cầu không tồn tại' });
        }

        if (approval.status !== 'PENDING') {
            return res.status(400).json({ message: 'Yêu cầu đã được xử lý' });
        }

        await prisma.approval_workflows.update({
            where: { id },
            data: {
                status: 'REJECTED',
                approver_id: req.user.id,
                approved_at: new Date(),
                rejection_reason: reason,
            },
        });

        await logActivity(
            req.user,
            'REJECT',
            'APPROVAL',
            id,
            `${approval.request_type} Request`,
            `Từ chối yêu cầu: ${reason}`
        );

        res.json({ message: 'Đã từ chối yêu cầu' });
    } catch (error) {
        console.error('Error rejecting request:', error);
        res.status(500).json({ message: 'Lỗi từ chối yêu cầu' });
    }
};

/**
 * Execute approved action
 */
async function executeApprovedAction(approval) {
    const { request_type, contract_id, request_data } = approval;

    switch (request_type) {
        case 'EXTENSION':
            // Extend payment due dates
            if (request_data.paymentId && request_data.newDueDate) {
                await prisma.contract_payments.update({
                    where: { id: request_data.paymentId },
                    data: { due_date: new Date(request_data.newDueDate) },
                });
            }
            break;

        case 'DISCOUNT':
            // Apply discount to contract
            if (request_data.discountAmount && contract_id) {
                const contract = await prisma.contracts.findUnique({
                    where: { id: contract_id },
                });

                await prisma.contracts.update({
                    where: { id: contract_id },
                    data: {
                        total_value:
                            parseFloat(contract.total_value) -
                            parseFloat(request_data.discountAmount),
                    },
                });
            }
            break;

        case 'CANCELLATION':
            // Cancel contract
            if (contract_id) {
                await prisma.contracts.update({
                    where: { id: contract_id },
                    data: { status: 'CANCELLED' },
                });

                // Create lifecycle event
                await prisma.contract_lifecycle_events.create({
                    data: {
                        id: `evt_${generateRandomId()}`,
                        contract_id: contract_id,
                        event_type: 'CANCELLED',
                        notes: 'Hợp đồng bị hủy sau phê duyệt',
                        metadata: { approvalId: approval.id },
                    },
                });
            }
            break;

        case 'TRANSFER':
            // Transfer handled separately via existing transfer flow
            break;
    }
}

module.exports = exports;
