/**
 * Standalone Express.js Integration Example
 * Run: node examples/express-example.js
 */
const express = require('express');
const {
  generateVietQRUrl,
  formatPaymentMemo,
  createSepayWebhookMiddleware,
} = require('../index');

const app = express();
app.use(express.json());

const BANK_CONFIG = {
  bankCode: 'MB', // MBBank, VCB, ACB, VPB, BIDV, etc.
  accountNumber: '090123456789',
  accountName: 'CONG TY ABC',
};

// 1. Endpoint tạo mã QR thanh toán động cho đơn hàng
app.get('/api/payment/qr', (req, res) => {
  const { orderId = 'DH1001', amount = 250000 } = req.query;

  // Tạo nội dung chuyển khoản ngắn gọn chuẩn
  const memo = formatPaymentMemo('DH', orderId);

  // Tạo link ảnh VietQR
  const qrImageUrl = generateVietQRUrl({
    bankCode: BANK_CONFIG.bankCode,
    accountNumber: BANK_CONFIG.accountNumber,
    accountName: BANK_CONFIG.accountName,
    amount: Number(amount),
    memo: memo,
    template: 'compact2',
  });

  res.json({
    success: true,
    orderId,
    amount: Number(amount),
    memo,
    bankInfo: BANK_CONFIG,
    qrImageUrl,
  });
});

// 2. SePay Webhook Endpoint (Tự động gạch nợ / Cập nhật trạng thái khi tiền về)
app.post(
  '/api/webhook/sepay',
  createSepayWebhookMiddleware({
    // apiSecret: 'YOUR_SEPAY_API_KEY', // Điền nếu có cấu hình API Key trên SePay
    onPaymentReceived: async (transaction, utils) => {
      console.log('💳 [Tiền về tài khoản!]:', {
        soTien: transaction.transferAmount,
        noiDung: transaction.content,
        maGiaoDich: transaction.referenceCode,
        nganHang: transaction.gateway,
      });

      // Tự động tìm mã đơn hàng trong nội dung chuyển khoản
      const orderId = utils.extractEntityCode('DH');
      console.log('🎯 Mã đơn hàng tìm thấy:', orderId);

      if (orderId) {
        // TODO: Cập nhật CSDL đơn hàng thành ĐÃ THANH TOÁN
        // await db.orders.update({ where: { code: orderId }, data: { status: 'PAID' } });
        console.log(`✅ Đã tự động gạch nợ cho đơn hàng ${orderId}!`);
      }

      return { orderId, status: 'PAID' };
    },
    onTestPing: async (payload) => {
      console.log('👋 Nhận test webhook từ SePay Dashboard:', payload);
    },
  })
);

const PORT = 3005;
app.listen(PORT, () => {
  console.log(`🚀 SePay & VietQR Server running at: http://localhost:${PORT}`);
  console.log(`👉 Test tạo QR: http://localhost:${PORT}/api/payment/qr?orderId=DH9999&amount=500000`);
  console.log(`👉 Webhook URL SePay: http://localhost:${PORT}/api/webhook/sepay`);
});
