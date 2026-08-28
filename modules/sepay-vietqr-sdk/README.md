# 💳 SePay & VietQR Standalone SDK

Bộ SDK độc lập, gọn nhẹ (Zero-dependencies), dễ dàng tích hợp vào **bất kỳ dự án Node.js / Express / NestJS / Next.js nào** để xử lý:
1. **Tạo mã VietQR động** (kèm số tiền, nội dung chuyển khoản tự động).
2. **Lắng nghe Webhook từ SePay** khi tiền về tài khoản ngân hàng để **tự động gạch nợ / kích hoạt đơn hàng**.
3. **Gọi SePay REST API** để truy vấn giao dịch và số dư.

---

## 📦 Cấu trúc Thư viện

```text
sepay-vietqr-sdk/
├── index.js                  # Điểm khởi tạo chính của SDK
├── package.json              # Thông tin package
├── README.md                 # Hướng dẫn chi tiết
├── lib/
│   ├── vietqr.js             # Hàm tạo link ảnh VietQR động
│   ├── webhookHandler.js     # Middleware xử lý Webhook SePay (Auto gạch nợ)
│   ├── sepayApi.js           # Client gọi REST API SePay
│   └── utils.js              # Chuẩn hóa tiếng Việt & Bóc tách mã đơn hàng
└── examples/
    ├── express-example.js    # Code mẫu chạy với Express.js
    └── nextjs-example.js     # Code mẫu chạy với Next.js App Router
```

---

## 🚀 Hướng dẫn Cài đặt & Sử dụng

### Cách 1: Copy thư mục vào dự án mới
Copy nguyên thư mục `sepay-vietqr-sdk` vào thư mục `modules/` hoặc `libs/` của dự án mới.

### Cách 2: Cài đặt cục bộ
```bash
npm install ./path/to/sepay-vietqr-sdk
```

---

## 🛠️ Code Mẫu (Express.js)

```javascript
const express = require('express');
const { 
  generateVietQRUrl, 
  formatPaymentMemo, 
  createSepayWebhookMiddleware 
} = require('./modules/sepay-vietqr-sdk');

const app = express();
app.use(express.json());

// 1. Tạo mã VietQR thanh toán cho khách hàng
app.get('/api/checkout', (req, res) => {
  const memo = formatPaymentMemo('DH', '100234'); // 'DH 100234'
  
  const qrUrl = generateVietQRUrl({
    bankCode: 'MB',                 // Mã ngân hàng: MB, VCB, ACB, BIDV, VPB...
    accountNumber: '090123456789',   // Số tài khoản ngân hàng của bạn
    accountName: 'CONG TY CONG NGHE',// Tên chủ tài khoản
    amount: 150000,                 // Số tiền (VND)
    memo: memo,                     // Nội dung chuyển khoản
    template: 'compact2',           // Giao diện VietQR
  });

  res.json({ qrUrl, memo });
});

// 2. Nhận Webhook SePay khi tiền về tài khoản
app.post('/api/webhook/sepay', createSepayWebhookMiddleware({
  onPaymentReceived: async (transaction, utils) => {
    console.log('Tiền về:', transaction.transferAmount, 'VND');
    
    // Tìm mã đơn hàng có tiền tố 'DH'
    const orderId = utils.extractEntityCode('DH');
    
    if (orderId) {
      // Cập nhật CSDL: Đổi trạng thái đơn hàng sang ĐÃ THANH TOÁN
      // await db.orders.update({ where: { code: orderId }, data: { status: 'PAID' } });
      console.log('Đã tự động duyệt đơn:', orderId);
    }
  }
}));

app.listen(3000);
```

---

## ⚙️ Cấu hình trên SePay Dashboard (my.sepay.vn)

1. Đăng nhập vào [https://my.sepay.vn](https://my.sepay.vn).
2. Kết nối tài khoản Ngân hàng (Vietcombank, MBBank, ACB, BIDV, Techcombank, TPBank...).
3. Vào mục **Cấu hình Webhook** ➔ Thêm Webhook:
   - **URL Webhook:** `https://domain-cua-ban.com/api/webhook/sepay`
   - **Kiểu xác thực:** Không xác thực (hoặc điền API Key nếu muốn bảo mật cao).
   - Bấm **Kiểm tra URL** để SePay gửi gói tin Test ping.

---

## 🎯 Các ưu điểm nổi bật:
- ✅ **Khử dấu tiếng Việt & Sai lệch khoảng trắng:** Giúp khớp đúng mã đơn hàng/căn hộ dù khách hàng gõ hoa, thường hay không dấu.
- ✅ **Luôn trả về HTTP 200:** Chống SePay spam retry khi server xử lý gặp ngoại lệ logic.
- ✅ **Zero-dependencies:** Không phụ thuộc thư viện nặng, chạy cực nhanh và an toàn.
