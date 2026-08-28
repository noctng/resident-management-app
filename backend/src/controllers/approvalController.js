const svc = require('../services/approvalService');

/**
 * Approval Workflow Controller (thin)
 * Handles multi-level approval for contract modifications
 * Parse req → gọi service → trả response. KHÔNG import prisma.
 */

/**
 * Create approval request
 */
exports.createApprovalRequest = async (req, res) => {
    try {
        const result = await svc.createApprovalRequest(req.body, req.user);
        res.json(result);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        console.error('Error creating approval request:', error);
        res.status(500).json({ message: 'Lỗi tạo yêu cầu phê duyệt' });
    }
};

/**
 * Get all pending approvals
 */
exports.getPendingApprovals = async (req, res) => {
    try {
        const approvals = await svc.getPendingApprovals();
        res.json(approvals);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        console.error('Error fetching pending approvals:', error);
        res.status(500).json({ message: 'Lỗi lấy danh sách phê duyệt' });
    }
};

/**
 * Get approval history for a contract
 */
exports.getContractApprovals = async (req, res) => {
    try {
        const approvals = await svc.getContractApprovals(req.params.contractId);
        res.json(approvals);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        console.error('Error fetching contract approvals:', error);
        res.status(500).json({ message: 'Lỗi lấy lịch sử phê duyệt' });
    }
};

/**
 * Approve request
 */
exports.approveRequest = async (req, res) => {
    try {
        const result = await svc.approveRequest(req.params.id, req.body || {}, req.user);
        res.json(result);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        console.error('Error approving request:', error);
        res.status(500).json({ message: 'Lỗi phê duyệt yêu cầu' });
    }
};

/**
 * Reject request
 */
exports.rejectRequest = async (req, res) => {
    try {
        const result = await svc.rejectRequest(req.params.id, req.body || {}, req.user);
        res.json(result);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        console.error('Error rejecting request:', error);
        res.status(500).json({ message: 'Lỗi từ chối yêu cầu' });
    }
};

module.exports = exports;
