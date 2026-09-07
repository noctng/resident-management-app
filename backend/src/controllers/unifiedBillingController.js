const { sendEmail } = require('../services/emailService');
const { getRenderedContent } = require('../services/templateService');
const { generateQRCodeURL, formatUtilityTransferContent } = require('../services/vietQRService');
const { createNotificationRecord } = require('../services/notificationService');
const { logActivity } = require('../utils/logger');
const svc = require('../services/unifiedBillingService');

// Clean Architecture: controller chỉ parse req → gọi service → format response.
// Các handler email / QR-zip stream giữ nguyên ở đây (cross-cutting I/O: res.attachment, fetch, sendEmail).

/**
 * Get unified billing data for all apartments for a specific month/year
 */
exports.getUnifiedBilling = async (req, res) => {
  try {
    const result = await svc.getUnifiedBilling(req.query);
    res.json(result);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: status === 500 ? 'Failed to fetch unified billing data' : error.message });
  }
};

/**
 * Get unified billing history for a specific apartment
 */
exports.getUnifiedBillingHistory = async (req, res) => {
  try {
    const { limit = 12 } = req.query;
    const result = await svc.getUnifiedBillingHistory(req.params.apartment_id, limit);
    res.json(result);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: status === 500 ? 'Failed to fetch billing history' : error.message });
  }
};

/**
 * Update combined payment status
 */
exports.updateCombinedPaymentStatus = async (req, res) => {
  try {
    const { apartment_id, month, year, status } = req.body;
    const result = await svc.updateCombinedPaymentStatus({ apartment_id, month, year, status }, req.user);

    if (result.status === 'PAID' && result.totalPaid > 0) {
      await createNotificationRecord({
        type: 'payment_confirmation',
        recipient: { apartmentId: apartment_id },
        payload: {
          title: 'Thanh toán hóa đơn tổng hợp thành công',
          body: `Căn hộ đã thanh toán hóa đơn tháng ${month}/${year}`,
          url: '/resident',
          tag: `unified-paid-${apartment_id}-${month}-${year}`,
        },
      });
    }

    res.json({ message: result.message, status: result.status });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: status === 500 ? 'Failed to update status' : error.message });
  }
};

/**
 * Send combined bill notification email
 */
exports.sendCombinedBillNotification = async (req, res) => {
  // Giữ nguyên (cross-cutting: email + push + template + QR)
  const { sendCombinedBillNotification } = require('./unifiedBillingController.legacy');
  return sendCombinedBillNotification(req, res);
};

/**
 * Preview combined bill notification email
 */
exports.previewCombinedBillNotification = async (req, res) => {
  const { previewCombinedBillNotification } = require('./unifiedBillingController.legacy');
  return previewCombinedBillNotification(req, res);
};

/**
 * Send bulk combined bill notifications
 */
exports.sendBulkCombinedBillNotification = async (req, res) => {
  const { sendBulkCombinedBillNotification } = require('./unifiedBillingController.legacy');
  return sendBulkCombinedBillNotification(req, res);
};

/**
 * Generate Batch QR Code Zip for Unified Billing
 */
exports.generateBatchCombinedQRCodeZip = async (req, res) => {
  const { generateBatchCombinedQRCodeZip } = require('./unifiedBillingController.legacy');
  return generateBatchCombinedQRCodeZip(req, res);
};

module.exports = exports;
