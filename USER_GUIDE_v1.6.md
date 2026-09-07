# HƯỚNG DẪN SỬ DỤNG HỆ THỐNG QUẢN LÝ CƯ DÂN MONOLITH
*Hệ thống Quản lý Kinh doanh Bất động sản & Vận hành Khu đô thị*
*Tài liệu: USER-GUIDE · Phiên bản 1.6*

---

## CHƯƠNG I: TỔNG QUAN HỆ THỐNG & NGUYÊN TẮC VẬN HÀNH

Hệ thống Quản lý Cư dân Monolith là nền tảng tích hợp toàn diện phục vụ quản lý kinh doanh, pháp lý, tài chính và dịch vụ kỹ thuật cho khu đô thị.

### 1. Phân Quyền Theo Vai Trò (RBAC)
Hệ thống tuân thủ chặt chẽ nguyên tắc RBAC (Role-Based Access Control). Toàn bộ người dùng được phân chia thành 17 vai trò cụ thể nhằm phân định rõ nhiệm vụ và bảo vệ dữ liệu nhạy cảm:
*   **ADMIN**: Cấu hình hệ thống, phân quyền nhân viên, cấu hình thông số và API.
*   **DIR / SM**: Ban Giám Đốc phê duyệt các đề xuất vượt hạn mức chiết khấu (>5%), duyệt hợp đồng và xem báo cáo điều hành.
*   **SHEAD / SALE**: Nhân viên và Trưởng phòng kinh doanh quản lý Leads, giỏ hàng, đặt cọc và soạn thảo hợp đồng HĐMB.
*   **PMS-BILL / ACC-S**: Kế toán thu phí quản lý, điện nước, hóa đơn tổng hợp và đối soát ngân hàng tự động.
*   **PMS-TECH**: Đội ngũ kỹ thuật ghi chỉ số công tơ, bảo trì thiết bị và tiếp nhận sửa chữa căn hộ.
*   **RESIDENT**: Cư dân tự phục vụ các dịch vụ thông qua Cổng cư dân.

### 2. Nguyên Tắc Tách Nhiệm Vụ (Segregation of Duties - SoD)
Để đảm bảo tính minh bạch và tránh rủi ro tài chính, hệ thống cưỡng chế SoD cứng tại tầng ứng dụng:
*   Nhân viên sales lập hợp đồng không được tự phê duyệt giảm giá vượt thẩm quyền.
*   Kỹ thuật viên ghi chỉ số công tơ điện nước không được quyền chốt kỳ tính phí dịch vụ.
*   Người lập phiếu đề xuất hoàn tiền cọc không được là người duyệt lệnh chi tiền.

---

## CHƯƠNG II: HƯỚNG DẪN CHI TIẾT CÁC TRANG QUẢN TRỊ (ADMIN)

### 1. Trang Bảng Điều Khiển (Dashboard)
*   **Chỉ số Tổng quan**: Hiển thị 4 thẻ chỉ số chính sử dụng màu sắc Quiet Luxury đặc trưng: Doanh thu bán hàng, Tỷ lệ lấp đầy căn hộ (thẻ nổi bật), Tổng số cư dân, và Phản ánh đang chờ xử lý.
*   **Bộ lọc nhanh**: Cho phép lọc nhanh dữ liệu tức thì theo Phân khu (CANTATA, TESLA, DA_VINCI) và khoảng thời gian.
*   **Trạng thái trống (Empty State)**: Khi không có dữ liệu phù hợp bộ lọc, hệ thống hiển thị hình ảnh minh họa nhẹ nhàng kèm nút gợi ý hành động cụ thể, tránh làm đơ giao diện.

### 2. Phân Hệ Căn Hộ (Apartment Inventory)
*   **Card Inventory (chuẩn Monolith Units)**: Danh sách hiển thị dưới dạng grid thẻ trực quan, mỗi thẻ thể hiện mã căn hộ, tầng, diện tích, phân khu và trạng thái bàn giao (badge Đã bàn giao / Chưa bàn giao).
*   **Thao tác**: Thêm mới căn hộ, Chỉnh sửa thông tin chi tiết, hoặc xuất biên bản bàn giao bàn kỹ thuật.

### 3. Phân Hệ Cư Dân (Residents & Accounts)
*   **Hồ sơ cư dân**: Quản lý thông tin định danh của từng cư dân (Họ tên, SĐT, Email, CCCD) và liên kết với căn hộ tương ứng qua vai trò cư trú (Chủ hộ, Thành viên, Người thuê).
*   **Tài khoản cư dân**: Ban quản lý có thể xem danh sách tài khoản portal cư dân, Reset mật khẩu về mặc định (`Abc@12345`) khi cư dân quên, và xem Ma trận phân quyền (Read-only, vai trò RESIDENT) để đảm bảo tính minh bạch.

### 4. Quản Lý Chỉ Số Điện Nước (Utility Metering)
*   **Ghi chỉ số thủ công**: Nhập trực tiếp chỉ số đầu/cuối của kỳ trên giao diện quản trị.
*   **Ghi chỉ số di động bằng AI (Technician Meter)**: Kỹ thuật viên dùng điện thoại chụp ảnh công tơ thực tế. Mô-đun AI quét ảnh, tự động nhận diện chỉ số bằng OCR và điền vào form, giúp tăng 95% độ chính xác.

### 5. Hóa Đơn Tổng Hợp & Đối Soát (Unified Billing & Reconcile)
*   **Chốt kỳ phí**: Tổng hợp tiền điện, nước và phí quản lý hàng tháng thành một hóa đơn tổng hợp duy nhất cho từng căn hộ.
*   **Đối soát tự động SePay Webhook**: Hóa đơn tích hợp mã QR VietQR động. Khi cư dân chuyển khoản đúng số tiền và nội dung (chứa mã căn hộ), SePay Webhook lập tức gửi tín hiệu về backend. Hệ thống tự động gạch nợ trạng thái PAID, gửi thông báo xác nhận cho cư dân trong vòng 2 giây.
*   **Xuất hóa đơn VNPT E-Invoice**: Hóa đơn sau khi thanh toán được ký số và đồng bộ trực tiếp lên hệ thống VNPT Invoice phục vụ báo cáo thuế.

### 6. Quản Lý Tiện Ích Chung (Amenities Management)
*   **Cấu hình giới hạn**: Đặt số lượt đặt tối đa trên ngày/tuần của từng căn hộ để tránh chiếm dụng.
*   **Xử lý đặt chỗ**: Duyệt/Từ chối hoặc hủy lịch đặt của cư dân kèm ghi nhận lý do chi tiết.

### 7. Quản Lý Đăng Ký Thi Công (Construction & Fitout)
*   **Hồ sơ thi công**: Tiếp nhận bản vẽ thiết kế, danh sách công nhân, thời gian thi công.
*   **Ký quỹ hoàn thiện**: Quản lý khoản tiền đặt cọc thi công (chuẩn 100,000,000 VNĐ). Tiền chỉ được hoàn trả sau khi phòng Kỹ thuật nghiệm thu không có lỗi vi phạm kết cấu chung.

### 8. Phân Hệ Kinh Doanh & CRM (Sales & Contract Lifecycle)
*   **Lead Pipeline (Kanban)**: Theo dõi cơ hội kinh doanh qua các bước Nhận Lead -> Chăm sóc -> Giữ chỗ.
*   **Sales Matrix**: Bản đồ giỏ hàng bất động sản theo thời gian thực (Trống, Đã giữ chỗ, Đã cọc, Đã ký HĐMB).
*   **Hợp đồng Mua bán (HĐMB)**: Quản lý mẫu hợp đồng chuẩn 18 điều khoản, tự động tính toán 10 đợt thanh toán (LTT) định kỳ.
*   **Tính toán thanh toán sớm**: Áp dụng các mốc chiết khấu lãi suất khi khách hàng nộp tiền trước hạn.
*   **Chuyển nhượng HĐMB (B.7)**: Quy trình thẩm định chuyển nhượng phức tạp. Tự động kiểm tra nợ quá hạn, tính phí chuyển nhượng, và đặc biệt tự động kế thừa lịch thanh toán (LTT) nguyên vẹn sang chủ mới.
*   **Báo cáo & KPI Bán hàng (B.10)**: Biểu đồ phễu chuyển đổi (Leads -> Bookings -> Deposits -> Contracts -> Handovers) và bảng đánh giá KPI nhân viên kinh doanh, hỗ trợ xuất báo cáo Excel chuẩn E.3/E.4.

---

## CHƯƠNG III: HƯỚNG DẪN CỔNG THÔNG TIN CƯ DÂN (RESIDENT PORTAL)

### 1. Đăng Nhập & Welcome Wizard
*   Cư dân đăng nhập bằng Số Điện Thoại và Mật Khẩu mặc định (hoặc mật khẩu cá nhân đã đổi).
*   **Chọn Căn hộ**: Với trường hợp một cư dân (một SĐT) sở hữu hoặc thuê nhiều căn hộ trong KĐT, hệ thống hiển thị màn hình Wizard chào mừng để cư dân chọn căn hộ muốn thao tác tại phiên làm việc đó.

### 2. Hóa Đơn & Thanh Toán Trực Tuyến
*   **Chi tiết hóa đơn**: Xem lịch sử hóa đơn dịch vụ, hóa đơn điện nước chi tiết của từng tháng.
*   **VietQR động**: Nhấp Thanh toán để hệ thống tự sinh mã QR chứa đầy đủ số tiền và cú pháp chuyển khoản chính xác tuyệt đối. Cư dân quét mã qua ứng dụng ngân hàng để hoàn tất nộp phí tức thì.

### 3. Đặt Lịch Tiện Ích Tự Phục Vụ (Amenity Booking)
*   **Đặt chỗ**: Chọn dịch vụ, chọn khung giờ trống và xác nhận đặt.
*   **Thông báo nhắc nhở tự động**: Hệ thống kích hoạt cron job gửi Web Push thông báo nhắc cư dân trước giờ bắt đầu 20 phút (chuẩn bị trải nghiệm) và trước giờ kết thúc 15 phút (chuẩn bị thu dọn tư trang).

### 4. Gửi Phản Ánh & Ý Kiến Đóng Góp
*   **Thao tác**: Tạo ticket mới, chọn phân loại (Kỹ thuật, An ninh, Vệ sinh...), viết mô tả và đính kèm hình ảnh thực tế.
*   **Theo dõi tiến độ**: Theo dõi trực quan trạng thái ticket từ Tiếp nhận -> Đang xử lý -> Đã giải quyết kèm phản hồi từ nhân viên.
