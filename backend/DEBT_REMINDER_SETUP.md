# Email Nhắc Nợ Tự Động - Hướng Dẫn Cài Đặt

## 1. Cài Đặt Thư Viện

```bash
cd backend
npm install node-cron
```

## 2. Cấu Hình Email (Tùy chọn)

Thêm vào file `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Ban Quản Lý Chung Cư <noreply@example.com>"
```

**Lưu ý:**

- Nếu dùng Gmail, cần tạo App Password tại: https://myaccount.google.com/apppasswords
- Nếu không cấu hình SMTP, hệ thống sẽ chạy ở chế độ MOCK (in email ra console)

## 3. API Endpoints

### Gửi Email Thủ Công

**Gửi 1 hóa đơn:**

```
POST /api/debt-reminders/send/:feeId
```

**Gửi hàng loạt:**

```
POST /api/debt-reminders/send-bulk
Body: {
  "month": 1,
  "year": 2026,
  "statusFilter": "OVERDUE"  // optional: "PENDING" | "OVERDUE"
}
```

**Xem lịch sử:**

```
GET /api/debt-reminders/history?page=1&limit=50
```

## 4. Cron Jobs Tự Động

Hệ thống sẽ tự động chạy 2 cron jobs:

### Job 1: Gửi Email Nhắc Nợ

- **Lịch chạy:** Mỗi ngày lúc 9:00 sáng
- **Chức năng:**
    - Tìm tất cả hóa đơn quá hạn (sau ngày 15)
    - Gửi email nhắc nhở đến cư dân
    - Cập nhật status từ PENDING → OVERDUE

### Job 2: Cập Nhật Trạng Thái

- **Lịch chạy:** Mỗi ngày lúc 00:00 (nửa đêm)
- **Chức năng:**
    - Tự động đánh dấu hóa đơn PENDING → OVERDUE sau ngày 15

## 5. Template Email

Email sẽ bao gồm:

- ✅ Chi tiết hóa đơn (breakdown từng khoản phí)
- ✅ Số ngày quá hạn
- ✅ Hướng dẫn thanh toán
- ✅ Thông tin liên hệ
- ✅ Design responsive, đẹp mắt

## 6. Testing

Để test email template trong môi trường development:

1. Gọi API thủ công:

```bash
curl -X POST http://localhost:3002/api/debt-reminders/send/FEE_ID \
  -H "Content-Type: application/json" \
  -b "cookies.txt"
```

2. Kiểm tra console log để xem email HTML

## 7. Lưu Ý

- Cần có email của cư dân trong bảng `residents`
- Chỉ gửi cho cư dân active (`is_active = true`)
- Hệ thống tự động ghi log vào `activity_logs`
- Ngày đáo hạn mặc định: Ngày 15 hàng tháng

## 8. Troubleshooting

**Lỗi: "Resident email not found"**
→ Cập nhật email cho cư dân trong hệ thống

**Email không gửi được:**
→ Kiểm tra cấu hình SMTP trong `.env`
→ Kiểm tra App Password nếu dùng Gmail
→ Xem log error trong console

**Cron job không chạy:**
→ Đảm bảo server đang chạy 24/7
→ Kiểm tra timezone của server
