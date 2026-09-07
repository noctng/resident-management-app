# HƯỚNG DẪN SỬ DỤNG HỆ THỐNG QUẢN LÝ CƯ DÂN MONOLITH
*Hệ thống Quản lý Kinh doanh Bất động sản & Vận hành Khu đô thị*
*Tài liệu: USER-GUIDE · Phiên bản 1.6*

---

## CHƯƠNG I: TỔNG QUAN HỆ THỐNG & NGUYÊN TẮC VẬN HÀNH

Hệ thống Quản lý Cư dân Monolith là nền tảng tích hợp toàn diện phục vụ quản lý kinh doanh, pháp lý, tài chính và dịch vụ kỹ thuật cho khu đô thị.

### 1. Phân Quyền Theo Vai Trò (RBAC)
Hệ thống tuân thủ chặt chẽ nguyên tắc RBAC (Role-Based Access Control). Toàn bộ người dùng được phân chia thành 17 vai trò cụ thể nhằm phân định rõ nhiệm vụ và bảo vệ dữ liệu nhạy cảm.

### 2. Nguyên Tắc Tách Nhiệm Vụ (Segregation of Duties - SoD)
Để đảm bảo tính minh bạch và tránh rủi ro tài chính, hệ thống cưỡng chế SoD cứng tại tầng ứng dụng.

### 3. Hai Luồng Đăng Nhập Riêng Biệt
*   **Cổng Quản trị Admin**: Dành cho nhân viên vận hành, kế toán, kỹ thuật và quản trị viên.
    *(Xem hình minh họa 10-admin-login.png)*
*   **Cổng Cư dân (Resident Portal)**: Dành riêng cho cư dân truy cập qua Số điện thoại di động đăng ký.
    *(Xem hình minh họa 01-resident-login.png)*

---

## CHƯƠNG II: HƯỚNG DẪN CHI TIẾT CÁC TRANG QUẢN TRỊ (ADMIN)

### 1. Trang Bảng Điều Khiển (Dashboard)
*   **Chỉ số Tổng quan**: Hiển thị 4 thẻ chỉ số chính sử dụng màu sắc Quiet Luxury đặc trưng: Doanh thu bán hàng, Tỷ lệ lấp đầy căn hộ (thẻ nổi bật), Tổng số cư dân, và Phản ánh đang chờ xử lý.
*   **Bộ lọc nhanh**: Cho phép lọc nhanh dữ liệu tức thì theo Phân khu (CANTATA, TESLA, DA_VINCI) và khoảng thời gian.
    *(Xem hình minh họa 11-admin-dashboard.png)*

### 2. Phân Hệ Căn Hộ (Apartment Inventory)
*   **Card Inventory (chuẩn Monolith Units)**: Danh sách hiển thị dưới dạng grid thẻ trực quan, mỗi thẻ thể hiện mã căn hộ, tầng, diện tích, phân khu và trạng thái bàn giao (badge Đã bàn giao / Chưa bàn giao).
    *(Xem hình minh họa 21-admin-CnH.png)*

### 3. Phân Hệ Cư Dân (Residents & Accounts)
*   **Hồ sơ cư dân**: Quản lý thông tin định danh của từng cư dân (Họ tên, SĐT, Email, CCCD) và liên kết với căn hộ tương ứng qua vai trò cư trú (Chủ hộ, Thành viên, Người thuê).
    *(Xem hình minh họa 21-admin-CDn.png)*
*   **Tài khoản cư dân**: Ban quản lý có thể xem danh sách tài khoản portal cư dân, Reset mật khẩu về mặc định (`Abc@12345`) khi cư dân quên, và xem Ma trận phân quyền (Read-only, vai trò RESIDENT) để đảm bảo tính minh bạch.
    *(Xem hình minh họa 15-admin-permission-matrix.png)*

### 4. Quản Lý Chỉ Số Điện Nước (Utility Metering)
*   **Ghi chỉ số thủ công**: Nhập trực tiếp chỉ số đầu/cuối của kỳ trên giao diện quản trị.
    *(Xem hình minh họa 21-admin-QunLinNc.png)*
*   **Ghi chỉ số di động bằng AI (Technician Meter)**: Kỹ thuật viên dùng điện thoại chụp ảnh công tơ thực tế. Mô-đun AI quét ảnh, tự động nhận diện chỉ số bằng OCR và điền vào form, giúp tăng 95% độ chính xác.
    *(Xem hình minh họa 22-admin-GhiChSMobile.png)*

### 5. Hóa Đơn Tổng Hợp & Đối Soát (Unified Billing & Reconcile)
*   **Chốt kỳ phí**: Tổng hợp tiền điện, nước và phí quản lý hàng tháng thành một hóa đơn tổng hợp duy nhất cho từng căn hộ.
    *(Xem hình minh họa 21-admin-HanTngHp.png)*

### 6. Quản Lý Tiện Ích Chung (Amenities Management)
*   **Kiểm soát đặt chỗ**: Xem danh sách cư dân đăng ký, thời gian sử dụng và trạng thái đặt chỗ.
    *(Xem hình minh họa 21-admin-Tinch.png)*

### 7. Quản Lý Đăng Ký Thi Công (Construction & Fitout)
*   **Quản lý thi công**: Ghi nhận hồ sơ sửa chữa hoàn thiện căn hộ và theo dõi danh sách nhà thầu.
    *(Xem hình minh họa 22-admin-ThiCong.png)*

### 8. Hướng Dẫn Chi Tiết Các Hạng Mục Phân Hệ Kinh Doanh (CRM & Sales)
*   **CRM Dashboard**: Thống kê số lượng Lead, doanh số bán hàng, và hiệu suất chi tiết.
*   **Sales Matrix**: Bản đồ giỏ hàng căn hộ theo trạng thái thời gian thực (Màu sắc chỉ trạng thái trống, cọc, giữ chỗ, HĐMB).
*   **Product Inventory**: Thông số kỹ thuật căn hộ, diện tích, đơn giá và phân khu mở bán.
*   **Lead Kanban**: Quản lý phễu Lead qua bảng kéo thả trực quan.
*   **Cart & Booking**: Quy trình tạo booking giữ chỗ có thời hạn 24 giờ.
*   **Deposit List**: Kiểm soát phiếu đặt cọc và đối soát tiền cọc của kế toán.
*   **Contract Lifecycle**: Danh sách và chi tiết tiến độ thanh toán (10 đợt chuẩn) của HĐMB, tệp scan, phụ lục.
*   **Overdue Payments**: Quản lý nợ quá hạn của khách mua bất động sản.
*   **Approval Queue**: Hàng đợi phê duyệt vượt hạn mức chiết khấu của Sales, duyệt chuyển nhượng HĐMB.
*   **Commission Page**: Quản lý tính hoa hồng tự động cho nhân viên kinh doanh và đại lý môi giới.
*   **Property Transfer**: Chi tiết hồ sơ chuyển nhượng HĐMB và kế thừa lịch thanh toán gốc.
*   **Handover Management**: Kiểm soát biên bản bàn giao và Snag list kỹ thuật.
    *(Xem hình minh họa 21-admin-KinhDoanhCRM.png và 22-admin-BoCoKPIiuHnh.png)*

---

## CHƯƠNG III: HƯỚNG DẪN CỔNG THÔNG TIN CƯ DÂN (RESIDENT PORTAL)

### 1. Đăng Nhập & Welcome Wizard
*   Cư dân đăng nhập bằng Số Điện Thoại và Mật Khẩu mặc định (hoặc mật khẩu cá nhân đã đổi).
*   **Chọn Căn hộ**: Với trường hợp một cư dân (một SĐT) sở hữu hoặc thuê nhiều căn hộ trong KĐT, hệ thống hiển thị màn hình Wizard chào mừng để cư dân chọn căn hộ muốn thao tác tại phiên làm việc đó.
    *(Xem hình minh họa 02-resident-portal-onboard.png)*

### 2. Giao Diện Cổng Cư Dân Tổng Quan
*   **Dashboard trang chủ**: Cổng thông tin cư dân hiển thị tin tức, bảng thông báo và lối tắt dịch vụ nhanh chóng.
    *(Xem hình minh họa 03-resident-tongquan.png)*

### 3. Hóa Đơn & Thanh Toán Trực Tuyến
*   **Hóa đơn cư dân**: Xem lịch sử hóa đơn dịch vụ, hóa đơn điện nước chi tiết của từng tháng.
    *(Xem hình minh họa 04-res-HanTngHp.png)*

### 4. Đặt Lịch Tiện Ích Tự Phục Vụ (Amenity Booking)
*   **Đặt tiện ích**: Cư dân tự thao tác đặt trước lịch tập Gym, BBQ, Tennis... tiện lợi trực quan.
    *(Xem hình minh họa 05-res-ngKTinch.png)*

### 5. Gửi Phản Ánh & Ý Kiến Đóng Góp
*   **Phản ánh cư dân**: Tạo phản ánh nhanh chóng, tải lên hình ảnh hiện trạng thực tế và kiểm tra tiến độ giải quyết của KĐT.
    *(Xem hình minh họa 05-res-Phnnh.png)*

### 6. Đăng Ký Thẻ Xe & Cải Tạo Sửa Chữa
*   **Thẻ xe phương tiện**: Xem danh sách xe đã đăng ký và gửi đơn đăng ký thẻ xe mới.
    *(Xem hình minh họa 05-res-ThXePhngTin.png)*
*   **Đăng ký thi công**: Trình hồ sơ và đăng ký sửa chữa cải tạo căn hộ trực tuyến.
    *(Xem hình minh họa 05-res-ngKCiTo.png)*
