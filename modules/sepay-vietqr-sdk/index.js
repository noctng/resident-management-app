/**
 * SePay & VietQR Standalone SDK
 * Main Entry Point
 */
const { generateVietQRUrl, formatPaymentMemo } = require('./lib/vietqr');
const { createSepayWebhookMiddleware } = require('./lib/webhookHandler');
const { SepayApiClient } = require('./lib/sepayApi');
const { normalizeText, extractEntityCode } = require('./lib/utils');

module.exports = {
  // VietQR Generator
  generateVietQRUrl,
  formatPaymentMemo,

  // SePay Webhook Handler Middleware
  createSepayWebhookMiddleware,

  // SePay REST API Client
  SepayApiClient,

  // Utilities
  normalizeText,
  extractEntityCode,
};
