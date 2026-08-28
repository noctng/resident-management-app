# 📦 VNPT E-INVOICE SDK (Thông tư 78/2021/TT-BTC)

Module Node.js độc lập (Plug-and-Play) để kết nối và phát hành **Hóa Đơn Điện Tử VNPT** chuẩn SOAP/ASMX WebService (`PublishService.asmx`).

---

## 🌟 ĐẶC ĐIỂM NỔI BẬT:
1. **Kiểm tra kết nối 1-Click (`testConnection`):** Tự động xác thực toàn bộ 4 tài khoản (`Account`, `ACpass`, `username`, `password`) và Mẫu số/Ký hiệu (`pattern`, `serial`).
2. **Tạo lập & Phát hành hóa đơn (`importAndPublishInvoice`):** Đóng gói XML chuẩn Thông tư 78 đầy đủ các thẻ bắt buộc (`<Total>`, `<VATRate>`, `<VATAmount>`, `<IsSum>0`, v.v.).
3. **Bộ chuyển đổi tiền tệ sang chữ tiếng Việt:** (`readVietnameseCurrency`).
4. **Xử lý toàn bộ mã lỗi chuẩn VNPT:** (`OK:...`, `ERR:1`, `ERR:3`, `ERR:6`, `ERR:7`, `ERR:20`).

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT VÀ SỬ DỤNG CHO DỰ ÁN MỚI:

### 1. Copy thư mục module:
Copy toàn bộ thư mục `modules/vnpt-einvoice-sdk` vào dự án mới của bạn.

### 2. Khởi tạo Client:
```javascript
const { VnptEInvoiceClient } = require('./modules/vnpt-einvoice-sdk');

const client = new VnptEInvoiceClient({
  serviceUrl: 'https://<domain-vnpt>/PublishService.asmx',
  username: 'trungnguyenservices',       // Tài khoản ServiceRole
  password: 'YourServicePassword',        // Mật khẩu ServiceRole
  account: 'trungnguyen_pos',             // Tài khoản Admin Portal
  acpass: 'YourAdminPassword',            // Mật khẩu Admin Portal
  pattern: '1/002',                       // Mẫu số hóa đơn
  serial: 'C26TAA',                       // Ký hiệu hóa đơn
  convert: 0                              // 0: Unicode, 1: TCVN3
});
```

### 3. Kiểm tra kết nối WebService:
```javascript
const result = await client.testConnection();
if (result.success) {
  console.log('✅ Kết nối thành công:', result.message);
} else {
  console.error('❌ Lỗi:', result.message);
}
```

### 4. Phát hành hóa đơn:
```javascript
const invData = {
  fkey: 'EW_CAN03-01_052026',
  customerCode: 'CAN03-01',
  customerName: 'Hoàng Anh Tú',
  customerAddress: 'Căn hộ CAN03-01, Khu đô thị Thành Phố Cà Phê, Buôn Ma Thuột',
  customerPhone: '0901234567',
  customerEmail: 'info@thanhphocaphe.vn',
  month: 5,
  year: 2026,
  products: [
    {
      name: 'Tiền điện sinh hoạt kỳ 05/2026',
      unit: 'kWh',
      quantity: 10,
      price: 2500,
      amount: 25000,
    },
    {
      name: 'Tiền nước sinh hoạt kỳ 05/2026',
      unit: 'm³',
      quantity: 1,
      price: 10276,
      amount: 10276,
    }
  ],
  totalBeforeVat: 35276,
  vatRate: 8,
  vatAmount: 2822,
  grandTotal: 38098,
  paymentMethod: 'Chuyển khoản / VietQR',
  paymentStatus: 1
};

const res = await client.importAndPublishInvoice(invData);
console.log(res);
```
