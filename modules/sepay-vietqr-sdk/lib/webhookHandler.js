/**
 * SePay Webhook Middleware & Handler
 * Documentation: https://docs.sepay.vn/sepay-webhooks/
 */
const { normalizeText, extractEntityCode } = require('./utils');

/**
 * Creates an Express/Connect compatible middleware for handling SePay Webhooks
 * 
 * @param {Object} options
 * @param {string} [options.apiSecret] - Optional API Secret / Bearer token configured in SePay
 * @param {Function} options.onPaymentReceived - Async callback when payment arrives: async (transaction, utils) => {}
 * @param {Function} [options.onTestPing] - Optional callback when SePay sends test ping
 * @param {number} [options.toleranceVnd=1000] - Tolerance range in VND when matching amounts
 * @returns {Function} Express route handler (req, res, next)
 */
function createSepayWebhookMiddleware(options = {}) {
  const {
    apiSecret,
    onPaymentReceived,
    onTestPing,
  } = options;

  if (typeof onPaymentReceived !== 'function') {
    throw new Error('[SePay SDK] onPaymentReceived callback function is required.');
  }

  return async function sepayWebhookHandler(req, res) {
    try {
      // 1. Optional API Secret verification
      if (apiSecret) {
        const authHeader = req.headers['authorization'] || req.headers['apikey'];
        const isApiKeyValid = 
          authHeader === apiSecret || 
          authHeader === `Bearer ${apiSecret}` || 
          authHeader === `Apikey ${apiSecret}`;

        if (!isApiKeyValid) {
          console.warn('[SePay Webhook] Unauthorized access attempt rejected.');
          return res.status(401).json({ success: false, message: 'Invalid SePay API Secret' });
        }
      }

      const payload = req.body || {};
      const {
        id: transactionId,
        gateway,
        transactionDate,
        accountNumber,
        subAccount,
        content,
        description,
        transferType,
        transferAmount,
        referenceCode,
        code,
      } = payload;

      // 2. Filter transferType: only process incoming transactions ("in")
      if (transferType && String(transferType).toLowerCase() !== 'in') {
        return res.status(200).json({
          success: true,
          message: 'Ignored non-incoming transaction (transferType != in)',
        });
      }

      const rawContent = (content || description || '').trim();
      const amount = Number(transferAmount || 0);
      const normalizedContent = normalizeText(rawContent);

      // 3. Test Ping verification
      const isTestPing = 
        normalizedContent.includes('giaodichthunghiem') || 
        normalizedContent.includes('test') || 
        !rawContent;

      if (isTestPing) {
        if (typeof onTestPing === 'function') {
          await onTestPing(payload);
        }
        return res.status(200).json({
          success: true,
          message: 'Test webhook received and verified successfully',
          referenceCode,
        });
      }

      // 4. Create convenient helper utilities for the consumer
      const utils = {
        normalizedContent,
        rawContent,
        amount,
        transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
        normalizeText,
        extractEntityCode: (prefix) => extractEntityCode(rawContent, prefix),
        contains: (keyword) => normalizedContent.includes(normalizeText(keyword)),
      };

      // 5. Execute consumer callback
      const result = await onPaymentReceived(payload, utils);

      // 6. Always return 200 OK to prevent SePay from marking webhook as failed
      return res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
        data: result || null,
        referenceCode,
      });

    } catch (err) {
      console.error('[SePay Webhook Handler Error]:', err);
      // Return 200 with warning to avoid SePay auto-retry spamming
      return res.status(200).json({
        success: true,
        warning: 'Processed with exceptions',
        error: err.message,
      });
    }
  };
}

module.exports = {
  createSepayWebhookMiddleware,
};
