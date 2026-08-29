/**
 * managementFeeController — MỎNG: parse req → gọi service → format res.
 * KHÔNG import prisma/pg (raw SQL nằm ở managementFeeRepository).
 * Giữ NGUYÊN response shape / status / route path / method / auth / validate.
 */
const svc = require('../services/managementFeeService');
const pdfService = require('../services/pdfService');

exports.generateFee = async (req, res) => {
    try {
        const fee = await svc.generateFee(req.body, req.user);
        res.status(201).json(fee);
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || 'Failed to generate management fee' });
    }
};

exports.bulkGenerateFees = async (req, res) => {
    try {
        const results = await svc.bulkGenerateFees(req.body, req.user);
        res.status(201).json(results);
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || 'Failed to bulk generate fees' });
    }
};

exports.getFees = async (req, res) => {
    try {
        const { month, year, status, apartment_code, page = 1, limit = 50 } = req.query;
        const result = await svc.getFees({ month, year, status, apartment_code, page, limit });
        res.json(result);
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || 'Failed to get management fees' });
    }
};

exports.getFeeById = async (req, res) => {
    try {
        const fee = await svc.getFeeById(req.params.id);
        res.json(fee);
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || 'Failed to get management fee' });
    }
};

exports.updatePaymentStatus = async (req, res) => {
    try {
        const fee = await svc.updatePaymentStatus(req.params.id, req.body, req.user);
        res.json(fee);
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || 'Failed to update payment status' });
    }
};

exports.deleteFee = async (req, res) => {
    try {
        const result = await svc.deleteFee(req.params.id, req.user);
        res.json(result);
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || 'Failed to delete management fee' });
    }
};

exports.getSummary = async (req, res) => {
    try {
        const { month, year } = req.query;
        const summary = await svc.getSummary({ month, year });
        res.json(summary);
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || 'Failed to get summary' });
    }
};

exports.exportToPDF = async (req, res) => {
    try {
        const fee = await svc.getFeeForPdf(req.params.id);
        const { buffer, filename } = await pdfService.generateInvoicePDF(fee);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${encodeURIComponent(filename)}"`
        );
        res.setHeader('Content-Length', buffer.length);
        res.send(buffer);
    } catch (err) {
        const status = err.status || 500;
        res.status(status).json({ error: err.message || 'Failed to export to PDF' });
    }
};
