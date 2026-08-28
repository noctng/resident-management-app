Dưới đây là gợi ý thiết kế trang/quản trị hệ thống quản lý khách hàng mua căn hộ (CRM + Contract + Payment Tracking), tập trung đúng 3 nhu cầu bạn nêu: hồ sơ mua bán – tiến độ thanh toán – lưu trữ hợp đồng/tài liệu theo khách & theo hợp đồng.

1️⃣ Tổng thể kiến trúc chức năng

👉 Mô hình nên theo Khách hàng → Hợp đồng → Thanh toán → Tài liệu

Khách hàng
├─ Thông tin cá nhân
├─ Danh sách hợp đồng
│ ├─ Tiến độ thanh toán
│ ├─ Tài liệu / hợp đồng
│ └─ Lịch sử thay đổi

2️⃣ Trang danh sách khách hàng (Customer List)

Mục tiêu: Tra cứu nhanh, quản lý tập trung

Cột gợi ý

Mã KH

Họ tên

SĐT / Email

Dự án

Căn hộ (Block – Tầng – Căn)

Tình trạng hợp đồng
Đặt cọc / Đã ký / Đang thanh toán / Hoàn tất / Hủy

Tổng giá trị HĐ

% thanh toán

Công nợ còn lại

Thao tác: Xem chi tiết

Tính năng

🔍 Tìm theo tên / SĐT / mã căn

🎯 Lọc theo trạng thái hợp đồng

📊 Hiển thị progress bar % thanh toán

📤 Export Excel / PDF

3️⃣ Trang chi tiết khách hàng
Tab 1 – Hồ sơ khách hàng

Thông tin cá nhân:

Họ tên

SĐT, Email

CCCD / MST

Địa chỉ

Ghi chú kinh doanh / chăm sóc

File đính kèm chung (CCCD, hồ sơ pháp lý…)

Tab 2 – Danh sách hợp đồng

1 khách hàng có thể có nhiều hợp đồng

Thông tin hợp đồng

Mã hợp đồng

Dự án / Căn hộ

Giá bán

Ngày ký

Trạng thái

Nhân viên phụ trách

👉 Click vào hợp đồng → mở trang chi tiết hợp đồng

4️⃣ Trang chi tiết hợp đồng
A. Thông tin hợp đồng

Giá bán

Phí bảo trì

VAT

Tổng giá trị

Phương thức thanh toán

Ngày bàn giao dự kiến

B. Tiến độ thanh toán (rất quan trọng)

Hiển thị dạng bảng + timeline

Đợt Nội dung Hạn thanh toán Số tiền Trạng thái Ngày TT
1 Đặt cọc 01/03/2026 100tr ✅ Đã TT 28/02
2 Ký HĐ 15/03/2026 20% ⏳ Chưa —

📌 Tính toán tự động:

% đã thanh toán

Tổng đã thu

Công nợ còn lại

⚠️ Cảnh báo:

Quá hạn

Gần đến hạn (D-7, D-3)

C. Tài liệu & hợp đồng

📁 Lưu theo từng hợp đồng

Gợi ý cấu trúc:

Khách hàng A
└─ HĐ-CH-001
├─ Hợp đồng mua bán.pdf
├─ Phụ lục HĐ.pdf
├─ Biên lai đợt 1.pdf
├─ Biên bản bàn giao.pdf

Tính năng:

Upload nhiều file

Phân loại:

Hợp đồng

Phụ lục

Biên lai

Văn bản pháp lý

Quyền truy cập (Kế toán / Pháp lý / Kinh doanh)

5️⃣ Dashboard quản trị (rất nên có)
Chỉ số tổng quan

Tổng số KH

Tổng số hợp đồng

Tổng giá trị bán

Đã thu / Còn phải thu

Số hợp đồng quá hạn thanh toán

Biểu đồ

Doanh thu theo tháng

Tình trạng hợp đồng

Công nợ theo dự án

6️⃣ Phân quyền người dùng
Vai trò Quyền
Admin Toàn quyền
Kinh doanh Xem KH, HĐ, upload HĐ
Kế toán Thanh toán, biên lai
Pháp lý Hợp đồng, phụ lục
CSKH Xem thông tin
