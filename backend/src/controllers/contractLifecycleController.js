const prisma = require('../config/prisma');
const { generateRandomId } = require('../utils/helpers');
const { logActivity } = require('../utils/logger');

/**
 * Contract Lifecycle Controller
 * Manages strict contract lifecycle transitions
 */

/**
 * Record deposit event
 */
exports.recordDeposit = async (req, res) => {
    try {
        const { id } = req.params;
        const { depositAmount, depositDate, notes } = req.body;

        const contract = await prisma.contracts.findUnique({
            where: { id },
        });

        if (!contract) {
            return res.status(404).json({ message: 'Hợp đồng không tồn tại' });
        }

        if (contract.status !== 'DEPOSIT') {
            return res.status(400).json({
                message: 'Hợp đồng không ở trạng thái chờ đặt cọc',
            });
        }

        // Create lifecycle event
        await prisma.contract_lifecycle_events.create({
            data: {
                id: `evt_${generateRandomId()}`,
                contract_id: id,
                event_type: 'DEPOSIT',
                event_date: depositDate ? new Date(depositDate) : new Date(),
                performed_by: req.user.id,
                notes: notes || 'Khách hàng đã đặt cọc',
                metadata: { depositAmount },
            },
        });

        await logActivity(
            req.user,
            'UPDATE',
            'CONTRACT',
            id,
            contract.contract_code,
            `Ghi nhận đặt cọc: ${depositAmount.toLocaleString('vi-VN')} VNĐ`
        );

        res.json({ message: 'Đã ghi nhận đặt cọc thành công' });
    } catch (error) {
        console.error('Error recording deposit:', error);
        res.status(500).json({ message: 'Lỗi ghi nhận đặt cọc' });
    }
};

/**
 * Sign contract (DEPOSIT -> SIGNED)
 */
exports.signContract = async (req, res) => {
    try {
        const { id } = req.params;
        const { signedDate, notes } = req.body;

        const contract = await prisma.contracts.findUnique({
            where: { id },
        });

        if (!contract) {
            return res.status(404).json({ message: 'Hợp đồng không tồn tại' });
        }

        if (contract.status !== 'DEPOSIT') {
            return res.status(400).json({
                message: 'Hợp đồng phải ở trạng thái DEPOSIT để ký',
            });
        }

        // Update contract status
        await prisma.contracts.update({
            where: { id },
            data: {
                status: 'SIGNED',
                signed_date: signedDate ? new Date(signedDate) : new Date(),
            },
        });

        // Create lifecycle event
        await prisma.contract_lifecycle_events.create({
            data: {
                id: `evt_${generateRandomId()}`,
                contract_id: id,
                event_type: 'SIGNED',
                event_date: signedDate ? new Date(signedDate) : new Date(),
                performed_by: req.user.id,
                notes: notes || 'Hợp đồng đã được ký',
            },
        });

        await logActivity(
            req.user,
            'UPDATE',
            'CONTRACT',
            id,
            contract.contract_code,
            'Ký hợp đồng mua bán'
        );

        res.json({ message: 'Đã ký hợp đồng thành công' });
    } catch (error) {
        console.error('Error signing contract:', error);
        res.status(500).json({ message: 'Lỗi ký hợp đồng' });
    }
};

/**
 * Create amendment (phụ lục)
 */
exports.createAmendment = async (req, res) => {
    try {
        const { id } = req.params;
        const { amendmentType, changes, notes } = req.body;

        const contract = await prisma.contracts.findUnique({
            where: { id },
        });

        if (!contract) {
            return res.status(404).json({ message: 'Hợp đồng không tồn tại' });
        }

        if (!['SIGNED', 'PAYING'].includes(contract.status)) {
            return res.status(400).json({
                message: 'Chỉ có thể tạo phụ lục cho hợp đồng đã ký',
            });
        }

        // Create lifecycle event
        await prisma.contract_lifecycle_events.create({
            data: {
                id: `evt_${generateRandomId()}`,
                contract_id: id,
                event_type: 'AMENDED',
                performed_by: req.user.id,
                notes: notes || `Phụ lục: ${amendmentType}`,
                metadata: { amendmentType, changes },
            },
        });

        await logActivity(
            req.user,
            'UPDATE',
            'CONTRACT',
            id,
            contract.contract_code,
            `Tạo phụ lục điều chỉnh: ${amendmentType}`
        );

        res.json({ message: 'Đã tạo phụ lục thành công' });
    } catch (error) {
        console.error('Error creating amendment:', error);
        res.status(500).json({ message: 'Lỗi tạo phụ lục' });
    }
};

/**
 * Complete contract
 */
exports.completeContract = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const contract = await prisma.contracts.findUnique({
            where: { id },
            include: {
                contract_payments: true,
            },
        });

        if (!contract) {
            return res.status(404).json({ message: 'Hợp đồng không tồn tại' });
        }

        // Check if all payments are completed
        const totalPaid = contract.contract_payments.reduce(
            (sum, p) => sum + parseFloat(p.paid_amount),
            0
        );
        const totalValue = parseFloat(contract.total_value);

        if (totalPaid < totalValue) {
            return res.status(400).json({
                message: 'Chưa thanh toán đủ 100% để hoàn tất hợp đồng',
            });
        }

        // Check handover completed
        if (!contract.handover_completed) {
            return res.status(400).json({
                message: 'Chưa hoàn tất bàn giao căn hộ',
            });
        }

        // Update contract status
        await prisma.contracts.update({
            where: { id },
            data: {
                status: 'COMPLETED',
            },
        });

        // Create lifecycle event
        await prisma.contract_lifecycle_events.create({
            data: {
                id: `evt_${generateRandomId()}`,
                contract_id: id,
                event_type: 'COMPLETED',
                performed_by: req.user.id,
                notes: notes || 'Hợp đồng đã hoàn tất',
            },
        });

        await logActivity(
            req.user,
            'UPDATE',
            'CONTRACT',
            id,
            contract.contract_code,
            'Hoàn tất hợp đồng'
        );

        res.json({ message: 'Đã hoàn tất hợp đồng thành công' });
    } catch (error) {
        console.error('Error completing contract:', error);
        res.status(500).json({ message: 'Lỗi hoàn tất hợp đồng' });
    }
};

/**
 * Cancel contract
 */
exports.cancelContract = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const contract = await prisma.contracts.findUnique({
            where: { id },
        });

        if (!contract) {
            return res.status(404).json({ message: 'Hợp đồng không tồn tại' });
        }

        if (contract.status === 'COMPLETED') {
            return res.status(400).json({
                message: 'Không thể hủy hợp đồng đã hoàn tất',
            });
        }

        // Update contract status
        await prisma.contracts.update({
            where: { id },
            data: {
                status: 'CANCELLED',
            },
        });

        // Create lifecycle event
        await prisma.contract_lifecycle_events.create({
            data: {
                id: `evt_${generateRandomId()}`,
                contract_id: id,
                event_type: 'CANCELLED',
                performed_by: req.user.id,
                notes: reason || 'Hợp đồng bị hủy',
                metadata: { reason },
            },
        });

        await logActivity(
            req.user,
            'UPDATE',
            'CONTRACT',
            id,
            contract.contract_code,
            `Hủy hợp đồng: ${reason}`
        );

        res.json({ message: 'Đã hủy hợp đồng thành công' });
    } catch (error) {
        console.error('Error cancelling contract:', error);
        res.status(500).json({ message: 'Lỗi hủy hợp đồng' });
    }
};

/**
 * Get lifecycle history
 */
exports.getLifecycleHistory = async (req, res) => {
    try {
        const { id } = req.params;

        const events = await prisma.contract_lifecycle_events.findMany({
            where: { contract_id: id },
            orderBy: { event_date: 'desc' },
        });

        res.json(events);
    } catch (error) {
        console.error('Error fetching lifecycle history:', error);
        res.status(500).json({ message: 'Lỗi lấy lịch sử hợp đồng' });
    }
};

/**
 * Add manual event
 */
exports.addManualEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { eventType, notes, eventDate } = req.body;

        const contract = await prisma.contracts.findUnique({
            where: { id },
        });

        if (!contract) {
            return res.status(404).json({ message: 'Hợp đồng không tồn tại' });
        }

        // Create lifecycle event
        const newEvent = await prisma.contract_lifecycle_events.create({
            data: {
                id: `evt_${generateRandomId()}`,
                contract_id: id,
                event_type: eventType || 'OTHER',
                event_date: eventDate ? new Date(eventDate) : new Date(),
                performed_by: req.user.id,
                notes: notes || 'Ghi nhận thủ công',
                metadata: { manual: true },
            },
        });

        await logActivity(
            req.user,
            'ADD_EVENT',
            'CONTRACT',
            id,
            contract.contract_code,
            `Thêm sự kiện thủ công: ${eventType}`
        );

        res.status(201).json(newEvent);
    } catch (error) {
        console.error('Error adding manual event:', error);
        res.status(500).json({ message: 'Lỗi thêm sự kiện thủ công' });
    }
};

module.exports = exports;
