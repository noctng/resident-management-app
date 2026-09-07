# Hợp đồng API bên ngoài

- Base path: `/api/external`
- Auth: `x-api-key`
- Mặc định không có body trả về lỗi chi tiết ngoài `message` để tránh rò rỉ thông tin.

## Môi trường cấu hình (backend)
- `EXTERNAL_API_KEY`
- `EXTERNAL_PARTNER_URL`
- `EXTERNAL_PARTNER_SECRET`
- `EXTERNAL_PUSH_ENABLED=false`

## 1. GET /api/external/amenity/active
### Mô tả
Danh sách cư dân đang có đặt lịch tiện ích ở trạng thái `CONFIRMED` hoặc `USED`.

### Request
```bash
curl -H "x-api-key: <EXTERNAL_API_KEY>" https://<host>/api/external/amenity/active
```

### Response 200
```json
{
  "data": [
    {
      "id": "amenity_...",
      "bookingCode": "BK-MUSEUM-...",
      "amenity": "MUSEUM",
      "status": "CONFIRMED",
      "usageDate": "2026-09-10",
      "startTime": "2026-09-10T08:00:00.000Z",
      "endTime": "2026-09-10T10:00:00.000Z",
      "residentId": "res_...",
      "residentName": "Nguyễn Văn A",
      "apartmentId": "apt_...",
      "apartmentCode": "A101"
    }
  ]
}
```

## 2. GET /api/external/amenity/history
### Mô tả
Toàn bộ lịch sử sử dụng tiện ích của tất cả cư dân, mới nhất trước.

### Request
```bash
curl -H "x-api-key: <EXTERNAL_API_KEY>" https://<host>/api/external/amenity/history
```

### Response 200
```json
{
  "data": [
    {
      "id": "amenity_...",
      "bookingCode": "BK-MUSEUM-...",
      "amenity": "MUSEUM",
      "status": "USED",
      "usageDate": "2026-08-20",
      "startTime": "2026-08-20T07:30:00.000Z",
      "endTime": "2026-08-20T09:30:00.000Z",
      "residentId": "res_...",
      "residentName": "Nguyễn Văn A",
      "apartmentId": "apt_...",
      "apartmentCode": "A101"
    }
  ]
}
```

## 3. Push sang đối tác khi tạo/cập nhật booking
### Mô tả
Khi cư dân đăng ký sử dụng tiện ích hoặc admin cập nhật booking, backend có thể đẩy dữ liệu sang đối tác.

- Bật bằng `EXTERNAL_PUSH_ENABLED=true`
- Gọi `POST` đến `EXTERNAL_PARTNER_URL`
- Header gửi kèm:
  - `Content-Type: application/json`
  - `x-api-key`
  - `x-partner-secret`

### Payload
```json
{
  "source": "resident-management-app",
  "bookingId": "amenity_...",
  "bookingCode": "BK-MUSEUM-...",
  "amenity": "MUSEUM",
  "status": "CONFIRMED",
  "usageDate": "2026-09-10",
  "startTime": "2026-09-10T08:00:00.000Z",
  "endTime": "2026-09-10T10:00:00.000Z",
  "residentId": "res_...",
  "apartmentId": "apt_...",
  "apartmentCode": "A101",
  "residentName": "Nguyễn Văn A"
}
```

### Mã lỗi thường gặp
- `401`: thiếu hoặc sai `x-api-key`
- `404`: endpoint không tồn tại
- `405`: sai method
