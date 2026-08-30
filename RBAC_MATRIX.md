# Tài liệu RBAC — Ma trận Phân Quyền Hệ thống (Blueprint A.4 + E.1)

> Sinh tự động từ DB thực tế (`roles` + `role_permissions`). Cập nhật: Giai đoạn 2 RBAC refactor.

> **Lưu ý**: ADMIN/MANAGER được cấp full quyền qua cơ chế bypass trong code (không lưu 85 dòng riêng trong `role_permissions`), nên trong bảng dưới được hiển thị là `CRUDA` trọn vẹn.

## 1. Ý nghĩa Action (CRUDA)

| Ký hiệu | Action | Mô tả |
|---|---|---|
| C | Create | Tạo mới |
| R | Read | Xem / Đọc |
| U | Update | Cập nhật / Sửa |
| D | Delete | Xóa logic / Vô hiệu |
| A | Approve | Phê duyệt / Duyệt |

## 2. Danh sách Module (25)

`dashboard`, `apartments`, `residents`, `vehicles`, `resident_accounts`, `announcements`, `feedback`, `amenities`, `meter_reading`, `utilities`, `unified_billing`, `billing`, `construction`, `warranty`, `crm`, `crm_approve`, `contracts`, `pricebook`, `leads`, `deposits`, `handover`, `commission`, `revenue`, `configuration`, `users`, `logs`

## 3. Ma trận quyền theo Vai trò

Ký hiệu: `C R U D A` = có quyền, `·` = không có.

### ADMIN — Quản trị hệ thống  _(phân hệ: Chung)_
| Module | C | R | U | D | A |
|---|:---:|:---:|:---:|:---:|:---:|
| Tổng Quan (`dashboard`) | C | R | U | D | A |
| Căn hộ (`apartments`) | C | R | U | D | A |
| Cư dân (`residents`) | C | R | U | D | A |
| Phương tiện (`vehicles`) | C | R | U | D | A |
| Tài khoản Cư dân (`resident_accounts`) | C | R | U | D | A |
| Tin Tức & Thông Báo (`announcements`) | C | R | U | D | A |
| Phản Ánh (`feedback`) | C | R | U | D | A |
| Tiện ích (`amenities`) | C | R | U | D | A |
| Ghi chỉ số Điện Nước (`meter_reading`) | C | R | U | D | A |
| Quản Lý Điện Nước (`utilities`) | C | R | U | D | A |
| Hóa Đơn Tổng Hợp (`unified_billing`) | C | R | U | D | A |
| Thu Phí / Đối Soát (`billing`) | C | R | U | D | A |
| Thi Công / Cải Tạo (`construction`) | C | R | U | D | A |
| Bảo Hành / Bảo Trì (CMMS) (`warranty`) | C | R | U | D | A |
| Kinh Doanh (CRM) (`crm`) | C | R | U | D | A |
| Phê Duyệt CRM (`crm_approve`) | C | R | U | D | A |
| Hợp Đồng Mua Bán (`contracts`) | C | R | U | D | A |
| Bảng Giá / Chiết Khấu (`pricebook`) | C | R | U | D | A |
| Lead / Khách Tiềm Năng (`leads`) | C | R | U | D | A |
| Đặt Cọc / Giữ Chỗ (`deposits`) | C | R | U | D | A |
| Bàn Giao Nhà (`handover`) | C | R | U | D | A |
| Hoa Hồng (`commission`) | C | R | U | D | A |
| Doanh Thu (`revenue`) | C | R | U | D | A |
| Cấu hình Hệ thống (`configuration`) | C | R | U | D | A |
| Nhân viên & Phân quyền (`users`) | C | R | U | D | A |
| Lịch sử (Audit Log) (`logs`) | C | R | U | D | A |

### MANAGER — Quản lý (legacy)  _(phân hệ: Chung)_
| Module | C | R | U | D | A |
|---|:---:|:---:|:---:|:---:|:---:|
| Tổng Quan (`dashboard`) | C | R | U | D | A |
| Căn hộ (`apartments`) | C | R | U | D | A |
| Cư dân (`residents`) | C | R | U | D | A |
| Phương tiện (`vehicles`) | C | R | U | D | A |
| Tài khoản Cư dân (`resident_accounts`) | C | R | U | D | A |
| Tin Tức & Thông Báo (`announcements`) | C | R | U | D | A |
| Phản Ánh (`feedback`) | C | R | U | D | A |
| Tiện ích (`amenities`) | C | R | U | D | A |
| Ghi chỉ số Điện Nước (`meter_reading`) | C | R | U | D | A |
| Quản Lý Điện Nước (`utilities`) | C | R | U | D | A |
| Hóa Đơn Tổng Hợp (`unified_billing`) | C | R | U | D | A |
| Thu Phí / Đối Soát (`billing`) | C | R | U | D | A |
| Thi Công / Cải Tạo (`construction`) | C | R | U | D | A |
| Bảo Hành / Bảo Trì (CMMS) (`warranty`) | C | R | U | D | A |
| Kinh Doanh (CRM) (`crm`) | C | R | U | D | A |
| Phê Duyệt CRM (`crm_approve`) | C | R | U | D | A |
| Hợp Đồng Mua Bán (`contracts`) | C | R | U | D | A |
| Bảng Giá / Chiết Khấu (`pricebook`) | C | R | U | D | A |
| Lead / Khách Tiềm Năng (`leads`) | C | R | U | D | A |
| Đặt Cọc / Giữ Chỗ (`deposits`) | C | R | U | D | A |
| Bàn Giao Nhà (`handover`) | C | R | U | D | A |
| Hoa Hồng (`commission`) | C | R | U | D | A |
| Doanh Thu (`revenue`) | C | R | U | D | A |
| Cấu hình Hệ thống (`configuration`) | C | R | U | D | A |
| Nhân viên & Phân quyền (`users`) | C | R | U | D | A |
| Lịch sử (Audit Log) (`logs`) | C | R | U | D | A |

### DIR — Ban điều hành  _(phân hệ: Chung)_
| Module | C | R | U | D | A |
|---|:---:|:---:|:---:|:---:|:---:|
| Tổng Quan (`dashboard`) | · | R | · | · | · |
| Căn hộ (`apartments`) | · | R | · | · | · |
| Cư dân (`residents`) | · | R | · | · | · |
| Phương tiện (`vehicles`) | · | R | · | · | A |
| Tài khoản Cư dân (`resident_accounts`) | · | R | · | · | · |
| Tin Tức & Thông Báo (`announcements`) | · | R | · | · | · |
| Phản Ánh (`feedback`) | · | R | · | · | · |
| Tiện ích (`amenities`) | · | R | · | · | · |
| Ghi chỉ số Điện Nước (`meter_reading`) | · | R | · | · | · |
| Quản Lý Điện Nước (`utilities`) | · | R | · | · | · |
| Hóa Đơn Tổng Hợp (`unified_billing`) | · | R | · | · | A |
| Thu Phí / Đối Soát (`billing`) | · | R | · | · | A |
| Thi Công / Cải Tạo (`construction`) | · | R | · | · | A |
| Bảo Hành / Bảo Trì (CMMS) (`warranty`) | · | R | · | · | · |
| Kinh Doanh (CRM) (`crm`) | · | R | · | · | A |
| Phê Duyệt CRM (`crm_approve`) | · | R | · | · | A |
| Hợp Đồng Mua Bán (`contracts`) | · | R | · | · | · |
| Bảng Giá / Chiết Khấu (`pricebook`) | · | R | · | · | · |
| Lead / Khách Tiềm Năng (`leads`) | · | R | · | · | · |
| Đặt Cọc / Giữ Chỗ (`deposits`) | · | R | · | · | A |
| Bàn Giao Nhà (`handover`) | · | R | · | · | A |
| Hoa Hồng (`commission`) | · | R | · | · | A |
| Doanh Thu (`revenue`) | · | R | · | · | · |
| Cấu hình Hệ thống (`configuration`) | · | R | · | · | · |
| Nhân viên & Phân quyền (`users`) | · | R | · | · | · |
| Lịch sử (Audit Log) (`logs`) | · | R | · | · | · |

### SM — Giám đốc kinh doanh  _(phân hệ: Bán hàng)_
| Module | C | R | U | D | A |
|---|:---:|:---:|:---:|:---:|:---:|
| Tổng Quan (`dashboard`) | · | R | · | · | · |
| Căn hộ (`apartments`) | · | R | · | · | · |
| Cư dân (`residents`) | · | R | · | · | · |
| Phương tiện (`vehicles`) | · | R | · | · | · |
| Tài khoản Cư dân (`resident_accounts`) | · | R | · | · | · |
| Tin Tức & Thông Báo (`announcements`) | · | R | · | · | · |
| Phản Ánh (`feedback`) | · | R | · | · | · |
| Tiện ích (`amenities`) | · | R | · | · | · |
| Ghi chỉ số Điện Nước (`meter_reading`) | · | R | · | · | · |
| Quản Lý Điện Nước (`utilities`) | · | R | · | · | · |
| Hóa Đơn Tổng Hợp (`unified_billing`) | · | R | · | · | A |
| Thu Phí / Đối Soát (`billing`) | · | R | · | · | · |
| Thi Công / Cải Tạo (`construction`) | · | R | · | · | · |
| Bảo Hành / Bảo Trì (CMMS) (`warranty`) | · | R | · | · | · |
| Kinh Doanh (CRM) (`crm`) | C | R | U | D | · |
| Phê Duyệt CRM (`crm_approve`) | · | R | · | · | A |
| Hợp Đồng Mua Bán (`contracts`) | · | R | U | · | · |
| Bảng Giá / Chiết Khấu (`pricebook`) | C | R | U | · | · |
| Lead / Khách Tiềm Năng (`leads`) | · | R | · | · | · |
| Đặt Cọc / Giữ Chỗ (`deposits`) | · | R | · | · | · |
| Bàn Giao Nhà (`handover`) | · | R | · | · | · |
| Hoa Hồng (`commission`) | · | R | · | · | · |
| Doanh Thu (`revenue`) | · | R | · | · | · |
| Cấu hình Hệ thống (`configuration`) | · | R | · | · | · |
| Nhân viên & Phân quyền (`users`) | · | R | · | · | · |
| Lịch sử (Audit Log) (`logs`) | · | R | · | · | · |

### SHEAD — Trưởng phòng kinh doanh  _(phân hệ: Bán hàng)_
| Module | C | R | U | D | A |
|---|:---:|:---:|:---:|:---:|:---:|
| Tổng Quan (`dashboard`) | · | R | · | · | · |
| Căn hộ (`apartments`) | · | R | · | · | · |
| Cư dân (`residents`) | · | R | · | · | · |
| Phương tiện (`vehicles`) | · | R | · | · | · |
| Tài khoản Cư dân (`resident_accounts`) | · | R | · | · | · |
| Tin Tức & Thông Báo (`announcements`) | · | R | · | · | · |
| Phản Ánh (`feedback`) | · | R | · | · | · |
| Tiện ích (`amenities`) | · | R | · | · | · |
| Ghi chỉ số Điện Nước (`meter_reading`) | · | R | · | · | · |
| Quản Lý Điện Nước (`utilities`) | · | R | · | · | · |
| Hóa Đơn Tổng Hợp (`unified_billing`) | · | R | · | · | · |
| Thu Phí / Đối Soát (`billing`) | · | R | · | · | · |
| Thi Công / Cải Tạo (`construction`) | · | R | · | · | · |
| Bảo Hành / Bảo Trì (CMMS) (`warranty`) | · | R | · | · | · |
| Kinh Doanh (CRM) (`crm`) | C | R | U | · | · |
| Phê Duyệt CRM (`crm_approve`) | · | R | · | · | A |
| Hợp Đồng Mua Bán (`contracts`) | · | R | · | · | · |
| Bảng Giá / Chiết Khấu (`pricebook`) | C | R | U | · | · |
| Lead / Khách Tiềm Năng (`leads`) | · | R | · | · | · |
| Đặt Cọc / Giữ Chỗ (`deposits`) | · | R | · | · | A |
| Bàn Giao Nhà (`handover`) | · | R | · | · | · |
| Hoa Hồng (`commission`) | · | R | · | · | · |
| Doanh Thu (`revenue`) | · | R | · | · | · |
| Cấu hình Hệ thống (`configuration`) | · | R | · | · | · |
| Nhân viên & Phân quyền (`users`) | · | R | · | · | · |
| Lịch sử (Audit Log) (`logs`) | · | R | · | · | · |

### SALE — Nhân viên kinh doanh  _(phân hệ: Bán hàng)_
| Module | C | R | U | D | A |
|---|:---:|:---:|:---:|:---:|:---:|
| Tổng Quan (`dashboard`) | · | R | · | · | · |
| Căn hộ (`apartments`) | · | R | · | · | · |
| Cư dân (`residents`) | · | R | · | · | · |
| Phương tiện (`vehicles`) | · | R | · | · | · |
| Tài khoản Cư dân (`resident_accounts`) | · | R | · | · | · |
| Tin Tức & Thông Báo (`announcements`) | · | R | · | · | · |
| Phản Ánh (`feedback`) | · | R | · | · | · |
| Tiện ích (`amenities`) | · | R | · | · | · |
| Ghi chỉ số Điện Nước (`meter_reading`) | · | R | · | · | · |
| Quản Lý Điện Nước (`utilities`) | · | R | · | · | · |
| Hóa Đơn Tổng Hợp (`unified_billing`) | · | R | · | · | · |
| Thu Phí / Đối Soát (`billing`) | · | R | · | · | · |
| Thi Công / Cải Tạo (`construction`) | · | R | · | · | · |
| Bảo Hành / Bảo Trì (CMMS) (`warranty`) | · | R | · | · | · |
| Kinh Doanh (CRM) (`crm`) | C | R | U | · | · |
| Phê Duyệt CRM (`crm_approve`) | · | R | · | · | · |
| Hợp Đồng Mua Bán (`contracts`) | · | R | U | · | · |
| Bảng Giá / Chiết Khấu (`pricebook`) | · | R | · | · | · |
| Lead / Khách Tiềm Năng (`leads`) | · | R | · | · | · |
| Đặt Cọc / Giữ Chỗ (`deposits`) | C | R | U | · | · |
| Bàn Giao Nhà (`handover`) | · | R | · | · | · |
| Hoa Hồng (`commission`) | · | R | · | · | · |
| Doanh Thu (`revenue`) | · | R | · | · | · |
| Cấu hình Hệ thống (`configuration`) | · | R | · | · | · |
| Nhân viên & Phân quyền (`users`) | · | R | · | · | · |
| Lịch sử (Audit Log) (`logs`) | · | R | · | · | · |

### AGENT — Đại lý/kênh  _(phân hệ: Bán hàng)_
| Module | C | R | U | D | A |
|---|:---:|:---:|:---:|:---:|:---:|
| Tổng Quan (`dashboard`) | · | R | · | · | · |
| Căn hộ (`apartments`) | · | R | · | · | · |
| Cư dân (`residents`) | · | R | · | · | · |
| Phương tiện (`vehicles`) | · | R | · | · | · |
| Tài khoản Cư dân (`resident_accounts`) | · | R | · | · | · |
| Tin Tức & Thông Báo (`announcements`) | · | R | · | · | · |
| Phản Ánh (`feedback`) | · | R | · | · | · |
| Tiện ích (`amenities`) | · | R | · | · | · |
| Ghi chỉ số Điện Nước (`meter_reading`) | · | R | · | · | · |
| Quản Lý Điện Nước (`utilities`) | · | R | · | · | · |
| Hóa Đơn Tổng Hợp (`unified_billing`) | · | R | · | · | · |
| Thu Phí / Đối Soát (`billing`) | · | R | · | · | · |
| Thi Công / Cải Tạo (`construction`) | · | R | · | · | · |
| Bảo Hành / Bảo Trì (CMMS) (`warranty`) | · | R | · | · | · |
| Kinh Doanh (CRM) (`crm`) | C | R | · | · | · |
| Phê Duyệt CRM (`crm_approve`) | · | R | · | · | · |
| Hợp Đồng Mua Bán (`contracts`) | · | R | · | · | · |
| Bảng Giá / Chiết Khấu (`pricebook`) | · | R | · | · | · |
| Lead / Khách Tiềm Năng (`leads`) | · | R | · | · | · |
| Đặt Cọc / Giữ Chỗ (`deposits`) | C | R | · | · | · |
| Bàn Giao Nhà (`handover`) | · | R | · | · | · |
| Hoa Hồng (`commission`) | · | R | · | · | · |
| Doanh Thu (`revenue`) | · | R | · | · | · |
| Cấu hình Hệ thống (`configuration`) | · | R | · | · | · |
| Nhân viên & Phân quyền (`users`) | · | R | · | · | · |
| Lịch sử (Audit Log) (`logs`) | · | R | · | · | · |

### CS — Chăm sóc khách hàng  _(phân hệ: Bán hàng)_
| Module | C | R | U | D | A |
|---|:---:|:---:|:---:|:---:|:---:|
| Tổng Quan (`dashboard`) | · | R | · | · | · |
| Căn hộ (`apartments`) | · | R | · | · | · |
| Cư dân (`residents`) | · | R | · | · | · |
| Phương tiện (`vehicles`) | · | R | · | · | · |
| Tài khoản Cư dân (`resident_accounts`) | · | R | · | · | · |
| Tin Tức & Thông Báo (`announcements`) | · | R | · | · | · |
| Phản Ánh (`feedback`) | C | R | U | · | · |
| Tiện ích (`amenities`) | · | R | · | · | · |
| Ghi chỉ số Điện Nước (`meter_reading`) | · | R | · | · | · |
| Quản Lý Điện Nước (`utilities`) | · | R | · | · | · |
| Hóa Đơn Tổng Hợp (`unified_billing`) | · | R | · | · | · |
| Thu Phí / Đối Soát (`billing`) | · | R | · | · | · |
| Thi Công / Cải Tạo (`construction`) | · | R | · | · | · |
| Bảo Hành / Bảo Trì (CMMS) (`warranty`) | · | R | · | · | · |
| Kinh Doanh (CRM) (`crm`) | · | R | U | · | · |
| Phê Duyệt CRM (`crm_approve`) | · | R | · | · | · |
| Hợp Đồng Mua Bán (`contracts`) | · | R | · | · | · |
| Bảng Giá / Chiết Khấu (`pricebook`) | · | R | · | · | · |
| Lead / Khách Tiềm Năng (`leads`) | · | R | · | · | · |
| Đặt Cọc / Giữ Chỗ (`deposits`) | · | R | · | · | · |
| Bàn Giao Nhà (`handover`) | · | R | · | · | · |
| Hoa Hồng (`commission`) | · | R | · | · | · |
| Doanh Thu (`revenue`) | · | R | · | · | · |
| Cấu hình Hệ thống (`configuration`) | · | R | · | · | · |
| Nhân viên & Phân quyền (`users`) | · | R | · | · | · |
| Lịch sử (Audit Log) (`logs`) | · | R | · | · | · |

### ACC-S — Kế toán bán hàng  _(phân hệ: Bán hàng)_
| Module | C | R | U | D | A |
|---|:---:|:---:|:---:|:---:|:---:|
| Tổng Quan (`dashboard`) | · | R | · | · | · |
| Căn hộ (`apartments`) | · | R | · | · | · |
| Cư dân (`residents`) | · | R | · | · | · |
| Phương tiện (`vehicles`) | · | R | · | · | · |
| Tài khoản Cư dân (`resident_accounts`) | · | R | · | · | · |
| Tin Tức & Thông Báo (`announcements`) | · | R | · | · | · |
| Phản Ánh (`feedback`) | · | R | · | · | · |
| Tiện ích (`amenities`) | · | R | · | · | · |
| Ghi chỉ số Điện Nước (`meter_reading`) | · | R | · | · | · |
| Quản Lý Điện Nước (`utilities`) | · | R | · | · | · |
| Hóa Đơn Tổng Hợp (`unified_billing`) | C | R | U | · | · |
| Thu Phí / Đối Soát (`billing`) | C | R | U | · | · |
| Thi Công / Cải Tạo (`construction`) | · | R | · | · | · |
| Bảo Hành / Bảo Trì (CMMS) (`warranty`) | · | R | · | · | · |
| Kinh Doanh (CRM) (`crm`) | · | R | · | · | · |
| Phê Duyệt CRM (`crm_approve`) | · | R | · | · | · |
| Hợp Đồng Mua Bán (`contracts`) | · | R | · | · | · |
| Bảng Giá / Chiết Khấu (`pricebook`) | · | R | · | · | · |
| Lead / Khách Tiềm Năng (`leads`) | · | R | · | · | · |
| Đặt Cọc / Giữ Chỗ (`deposits`) | · | R | · | · | · |
| Bàn Giao Nhà (`handover`) | · | R | · | · | · |
| Hoa Hồng (`commission`) | · | R | · | · | · |
| Doanh Thu (`revenue`) | · | R | · | · | · |
| Cấu hình Hệ thống (`configuration`) | · | R | · | · | · |
| Nhân viên & Phân quyền (`users`) | · | R | · | · | · |
| Lịch sử (Audit Log) (`logs`) | · | R | · | · | · |

### LAW — Pháp chế hợp đồng  _(phân hệ: Bán hàng)_
| Module | C | R | U | D | A |
|---|:---:|:---:|:---:|:---:|:---:|
| Tổng Quan (`dashboard`) | · | R | · | · | · |
| Căn hộ (`apartments`) | · | R | · | · | · |
| Cư dân (`residents`) | · | R | · | · | · |
| Phương tiện (`vehicles`) | · | R | · | · | · |
| Tài khoản Cư dân (`resident_accounts`) | · | R | · | · | · |
| Tin Tức & Thông Báo (`announcements`) | · | R | · | · | · |
| Phản Ánh (`feedback`) | · | R | · | · | · |
| Tiện ích (`amenities`) | · | R | · | · | · |
| Ghi chỉ số Điện Nước (`meter_reading`) | · | R | · | · | · |
| Quản Lý Điện Nước (`utilities`) | · | R | · | · | · |
| Hóa Đơn Tổng Hợp (`unified_billing`) | · | R | · | · | · |
| Thu Phí / Đối Soát (`billing`) | · | R | · | · | · |
| Thi Công / Cải Tạo (`construction`) | · | R | · | · | · |
| Bảo Hành / Bảo Trì (CMMS) (`warranty`) | · | R | · | · | · |
| Kinh Doanh (CRM) (`crm`) | · | R | · | · | · |
| Phê Duyệt CRM (`crm_approve`) | · | R | · | · | · |
| Hợp Đồng Mua Bán (`contracts`) | · | R | U | · | · |
| Bảng Giá / Chiết Khấu (`pricebook`) | · | R | · | · | · |
| Lead / Khách Tiềm Năng (`leads`) | · | R | · | · | · |
| Đặt Cọc / Giữ Chỗ (`deposits`) | · | R | · | · | · |
| Bàn Giao Nhà (`handover`) | · | R | · | · | · |
| Hoa Hồng (`commission`) | · | R | · | · | · |
| Doanh Thu (`revenue`) | · | R | · | · | · |
| Cấu hình Hệ thống (`configuration`) | · | R | · | · | · |
| Nhân viên & Phân quyền (`users`) | · | R | · | · | · |
| Lịch sử (Audit Log) (`logs`) | · | R | · | · | · |

### PMO — Điều hành bàn giao  _(phân hệ: Chung)_
| Module | C | R | U | D | A |
|---|:---:|:---:|:---:|:---:|:---:|
| Tổng Quan (`dashboard`) | · | R | · | · | · |
| Căn hộ (`apartments`) | · | R | · | · | · |
| Cư dân (`residents`) | · | R | · | · | · |
| Phương tiện (`vehicles`) | · | R | · | · | · |
| Tài khoản Cư dân (`resident_accounts`) | · | R | · | · | · |
| Tin Tức & Thông Báo (`announcements`) | · | R | · | · | · |
| Phản Ánh (`feedback`) | · | R | · | · | · |
| Tiện ích (`amenities`) | · | R | · | · | · |
| Ghi chỉ số Điện Nước (`meter_reading`) | · | R | · | · | · |
| Quản Lý Điện Nước (`utilities`) | · | R | · | · | · |
| Hóa Đơn Tổng Hợp (`unified_billing`) | · | R | · | · | · |
| Thu Phí / Đối Soát (`billing`) | · | R | · | · | · |
| Thi Công / Cải Tạo (`construction`) | · | R | · | · | · |
| Bảo Hành / Bảo Trì (CMMS) (`warranty`) | · | R | · | · | · |
| Kinh Doanh (CRM) (`crm`) | · | R | · | · | · |
| Phê Duyệt CRM (`crm_approve`) | · | R | · | · | · |
| Hợp Đồng Mua Bán (`contracts`) | · | R | · | · | · |
| Bảng Giá / Chiết Khấu (`pricebook`) | · | R | · | · | · |
| Lead / Khách Tiềm Năng (`leads`) | · | R | · | · | · |
| Đặt Cọc / Giữ Chỗ (`deposits`) | · | R | · | · | · |
| Bàn Giao Nhà (`handover`) | C | R | U | · | · |
| Hoa Hồng (`commission`) | · | R | · | · | · |
| Doanh Thu (`revenue`) | · | R | · | · | · |
| Cấu hình Hệ thống (`configuration`) | · | R | · | · | · |
| Nhân viên & Phân quyền (`users`) | · | R | · | · | · |
| Lịch sử (Audit Log) (`logs`) | · | R | · | · | · |

### PMS-M — Trưởng BQL KĐT  _(phân hệ: Vận hành)_
| Module | C | R | U | D | A |
|---|:---:|:---:|:---:|:---:|:---:|
| Tổng Quan (`dashboard`) | · | R | · | · | · |
| Căn hộ (`apartments`) | C | R | U | D | · |
| Cư dân (`residents`) | C | R | U | D | · |
| Phương tiện (`vehicles`) | C | R | U | · | A |
| Tài khoản Cư dân (`resident_accounts`) | · | R | · | · | · |
| Tin Tức & Thông Báo (`announcements`) | · | R | · | · | · |
| Phản Ánh (`feedback`) | · | R | · | · | A |
| Tiện ích (`amenities`) | C | R | U | · | · |
| Ghi chỉ số Điện Nước (`meter_reading`) | · | R | · | · | A |
| Quản Lý Điện Nước (`utilities`) | C | R | U | · | · |
| Hóa Đơn Tổng Hợp (`unified_billing`) | C | R | U | · | A |
| Thu Phí / Đối Soát (`billing`) | · | R | · | · | A |
| Thi Công / Cải Tạo (`construction`) | C | R | U | · | A |
| Bảo Hành / Bảo Trì (CMMS) (`warranty`) | C | R | U | · | A |
| Kinh Doanh (CRM) (`crm`) | · | R | · | · | · |
| Phê Duyệt CRM (`crm_approve`) | · | R | · | · | · |
| Hợp Đồng Mua Bán (`contracts`) | · | R | · | · | · |
| Bảng Giá / Chiết Khấu (`pricebook`) | · | R | · | · | · |
| Lead / Khách Tiềm Năng (`leads`) | · | R | · | · | · |
| Đặt Cọc / Giữ Chỗ (`deposits`) | · | R | · | · | · |
| Bàn Giao Nhà (`handover`) | · | R | · | · | · |
| Hoa Hồng (`commission`) | · | R | · | · | · |
| Doanh Thu (`revenue`) | · | R | · | · | · |
| Cấu hình Hệ thống (`configuration`) | · | R | · | · | · |
| Nhân viên & Phân quyền (`users`) | · | R | · | · | · |
| Lịch sử (Audit Log) (`logs`) | · | R | · | · | · |

### PMS-FE — Nhân sự BQL (tiếp nhận)  _(phân hệ: Vận hành)_
| Module | C | R | U | D | A |
|---|:---:|:---:|:---:|:---:|:---:|
| Tổng Quan (`dashboard`) | · | R | · | · | · |
| Căn hộ (`apartments`) | · | R | · | · | · |
| Cư dân (`residents`) | · | R | U | · | · |
| Phương tiện (`vehicles`) | · | R | · | · | · |
| Tài khoản Cư dân (`resident_accounts`) | · | R | · | · | · |
| Tin Tức & Thông Báo (`announcements`) | · | R | · | · | · |
| Phản Ánh (`feedback`) | C | R | U | · | · |
| Tiện ích (`amenities`) | · | R | U | · | · |
| Ghi chỉ số Điện Nước (`meter_reading`) | C | R | · | · | · |
| Quản Lý Điện Nước (`utilities`) | · | R | · | · | · |
| Hóa Đơn Tổng Hợp (`unified_billing`) | · | R | · | · | · |
| Thu Phí / Đối Soát (`billing`) | · | R | · | · | · |
| Thi Công / Cải Tạo (`construction`) | · | R | · | · | · |
| Bảo Hành / Bảo Trì (CMMS) (`warranty`) | · | R | · | · | · |
| Kinh Doanh (CRM) (`crm`) | · | R | · | · | · |
| Phê Duyệt CRM (`crm_approve`) | · | R | · | · | · |
| Hợp Đồng Mua Bán (`contracts`) | · | R | · | · | · |
| Bảng Giá / Chiết Khấu (`pricebook`) | · | R | · | · | · |
| Lead / Khách Tiềm Năng (`leads`) | · | R | · | · | · |
| Đặt Cọc / Giữ Chỗ (`deposits`) | · | R | · | · | · |
| Bàn Giao Nhà (`handover`) | · | R | · | · | · |
| Hoa Hồng (`commission`) | · | R | · | · | · |
| Doanh Thu (`revenue`) | · | R | · | · | · |
| Cấu hình Hệ thống (`configuration`) | · | R | · | · | · |
| Nhân viên & Phân quyền (`users`) | · | R | · | · | · |
| Lịch sử (Audit Log) (`logs`) | · | R | · | · | · |

### PMS-BILL — Kế toán dịch vụ  _(phân hệ: Vận hành)_
| Module | C | R | U | D | A |
|---|:---:|:---:|:---:|:---:|:---:|
| Tổng Quan (`dashboard`) | · | R | · | · | · |
| Căn hộ (`apartments`) | · | R | · | · | · |
| Cư dân (`residents`) | · | R | · | · | · |
| Phương tiện (`vehicles`) | · | R | · | · | · |
| Tài khoản Cư dân (`resident_accounts`) | · | R | · | · | · |
| Tin Tức & Thông Báo (`announcements`) | · | R | · | · | · |
| Phản Ánh (`feedback`) | · | R | · | · | · |
| Tiện ích (`amenities`) | · | R | · | · | · |
| Ghi chỉ số Điện Nước (`meter_reading`) | C | R | U | · | · |
| Quản Lý Điện Nước (`utilities`) | C | R | U | · | · |
| Hóa Đơn Tổng Hợp (`unified_billing`) | C | R | U | · | A |
| Thu Phí / Đối Soát (`billing`) | C | R | U | · | A |
| Thi Công / Cải Tạo (`construction`) | · | R | · | · | · |
| Bảo Hành / Bảo Trì (CMMS) (`warranty`) | · | R | · | · | · |
| Kinh Doanh (CRM) (`crm`) | · | R | · | · | · |
| Phê Duyệt CRM (`crm_approve`) | · | R | · | · | · |
| Hợp Đồng Mua Bán (`contracts`) | · | R | · | · | · |
| Bảng Giá / Chiết Khấu (`pricebook`) | · | R | · | · | · |
| Lead / Khách Tiềm Năng (`leads`) | · | R | · | · | · |
| Đặt Cọc / Giữ Chỗ (`deposits`) | · | R | · | · | · |
| Bàn Giao Nhà (`handover`) | · | R | · | · | · |
| Hoa Hồng (`commission`) | · | R | · | · | · |
| Doanh Thu (`revenue`) | · | R | · | · | · |
| Cấu hình Hệ thống (`configuration`) | · | R | · | · | · |
| Nhân viên & Phân quyền (`users`) | · | R | · | · | · |
| Lịch sử (Audit Log) (`logs`) | · | R | · | · | · |

### PMS-TECH — Kỹ thuật/bảo trì  _(phân hệ: Vận hành)_
| Module | C | R | U | D | A |
|---|:---:|:---:|:---:|:---:|:---:|
| Tổng Quan (`dashboard`) | · | R | · | · | · |
| Căn hộ (`apartments`) | · | R | · | · | · |
| Cư dân (`residents`) | · | R | · | · | · |
| Phương tiện (`vehicles`) | · | R | · | · | · |
| Tài khoản Cư dân (`resident_accounts`) | · | R | · | · | · |
| Tin Tức & Thông Báo (`announcements`) | · | R | · | · | · |
| Phản Ánh (`feedback`) | C | R | U | · | · |
| Tiện ích (`amenities`) | · | R | · | · | · |
| Ghi chỉ số Điện Nước (`meter_reading`) | · | R | · | · | · |
| Quản Lý Điện Nước (`utilities`) | · | R | · | · | · |
| Hóa Đơn Tổng Hợp (`unified_billing`) | · | R | · | · | · |
| Thu Phí / Đối Soát (`billing`) | · | R | · | · | · |
| Thi Công / Cải Tạo (`construction`) | C | R | U | · | A |
| Bảo Hành / Bảo Trì (CMMS) (`warranty`) | C | R | U | · | · |
| Kinh Doanh (CRM) (`crm`) | · | R | · | · | · |
| Phê Duyệt CRM (`crm_approve`) | · | R | · | · | · |
| Hợp Đồng Mua Bán (`contracts`) | · | R | · | · | · |
| Bảng Giá / Chiết Khấu (`pricebook`) | · | R | · | · | · |
| Lead / Khách Tiềm Năng (`leads`) | · | R | · | · | · |
| Đặt Cọc / Giữ Chỗ (`deposits`) | · | R | · | · | · |
| Bàn Giao Nhà (`handover`) | · | R | · | · | · |
| Hoa Hồng (`commission`) | · | R | · | · | · |
| Doanh Thu (`revenue`) | · | R | · | · | · |
| Cấu hình Hệ thống (`configuration`) | · | R | · | · | · |
| Nhân viên & Phân quyền (`users`) | · | R | · | · | · |
| Lịch sử (Audit Log) (`logs`) | · | R | · | · | · |

### PMS-SEC — An ninh/kiểm soát  _(phân hệ: Vận hành)_
| Module | C | R | U | D | A |
|---|:---:|:---:|:---:|:---:|:---:|
| Tổng Quan (`dashboard`) | · | R | · | · | · |
| Căn hộ (`apartments`) | · | R | · | · | · |
| Cư dân (`residents`) | · | R | · | · | · |
| Phương tiện (`vehicles`) | · | R | U | · | · |
| Tài khoản Cư dân (`resident_accounts`) | · | R | · | · | · |
| Tin Tức & Thông Báo (`announcements`) | · | R | · | · | · |
| Phản Ánh (`feedback`) | · | R | · | · | · |
| Tiện ích (`amenities`) | · | R | · | · | · |
| Ghi chỉ số Điện Nước (`meter_reading`) | · | R | · | · | · |
| Quản Lý Điện Nước (`utilities`) | · | R | · | · | · |
| Hóa Đơn Tổng Hợp (`unified_billing`) | · | R | · | · | · |
| Thu Phí / Đối Soát (`billing`) | · | R | · | · | · |
| Thi Công / Cải Tạo (`construction`) | · | R | · | · | · |
| Bảo Hành / Bảo Trì (CMMS) (`warranty`) | · | R | · | · | · |
| Kinh Doanh (CRM) (`crm`) | · | R | · | · | · |
| Phê Duyệt CRM (`crm_approve`) | · | R | · | · | · |
| Hợp Đồng Mua Bán (`contracts`) | · | R | · | · | · |
| Bảng Giá / Chiết Khấu (`pricebook`) | · | R | · | · | · |
| Lead / Khách Tiềm Năng (`leads`) | · | R | · | · | · |
| Đặt Cọc / Giữ Chỗ (`deposits`) | · | R | · | · | · |
| Bàn Giao Nhà (`handover`) | · | R | · | · | · |
| Hoa Hồng (`commission`) | · | R | · | · | · |
| Doanh Thu (`revenue`) | · | R | · | · | · |
| Cấu hình Hệ thống (`configuration`) | · | R | · | · | · |
| Nhân viên & Phân quyền (`users`) | · | R | · | · | · |
| Lịch sử (Audit Log) (`logs`) | · | R | · | · | · |

### AUDIT — Kiểm toán nội bộ  _(phân hệ: Chung)_
| Module | C | R | U | D | A |
|---|:---:|:---:|:---:|:---:|:---:|
| Tổng Quan (`dashboard`) | · | R | · | · | · |
| Căn hộ (`apartments`) | · | R | · | · | · |
| Cư dân (`residents`) | · | R | · | · | · |
| Phương tiện (`vehicles`) | · | R | · | · | · |
| Tài khoản Cư dân (`resident_accounts`) | · | R | · | · | · |
| Tin Tức & Thông Báo (`announcements`) | · | R | · | · | · |
| Phản Ánh (`feedback`) | · | R | · | · | · |
| Tiện ích (`amenities`) | · | R | · | · | · |
| Ghi chỉ số Điện Nước (`meter_reading`) | · | R | · | · | · |
| Quản Lý Điện Nước (`utilities`) | · | R | · | · | · |
| Hóa Đơn Tổng Hợp (`unified_billing`) | · | R | · | · | · |
| Thu Phí / Đối Soát (`billing`) | · | R | · | · | · |
| Thi Công / Cải Tạo (`construction`) | · | R | · | · | · |
| Bảo Hành / Bảo Trì (CMMS) (`warranty`) | · | R | · | · | · |
| Kinh Doanh (CRM) (`crm`) | · | R | · | · | · |
| Phê Duyệt CRM (`crm_approve`) | · | R | · | · | · |
| Hợp Đồng Mua Bán (`contracts`) | · | R | · | · | · |
| Bảng Giá / Chiết Khấu (`pricebook`) | · | R | · | · | · |
| Lead / Khách Tiềm Năng (`leads`) | · | R | · | · | · |
| Đặt Cọc / Giữ Chỗ (`deposits`) | · | R | · | · | · |
| Bàn Giao Nhà (`handover`) | · | R | · | · | · |
| Hoa Hồng (`commission`) | · | R | · | · | · |
| Doanh Thu (`revenue`) | · | R | · | · | · |
| Cấu hình Hệ thống (`configuration`) | · | R | · | · | · |
| Nhân viên & Phân quyền (`users`) | · | R | · | · | · |
| Lịch sử (Audit Log) (`logs`) | · | R | · | · | · |

### RESIDENT — Cư dân  _(phân hệ: Cổng cư dân)_
| Module | C | R | U | D | A |
|---|:---:|:---:|:---:|:---:|:---:|
| Tổng Quan (`dashboard`) | · | R | · | · | · |
| Căn hộ (`apartments`) | · | R | · | · | · |
| Cư dân (`residents`) | · | R | U | · | · |
| Phương tiện (`vehicles`) | C | R | · | · | · |
| Tài khoản Cư dân (`resident_accounts`) | · | R | · | · | · |
| Tin Tức & Thông Báo (`announcements`) | · | R | · | · | · |
| Phản Ánh (`feedback`) | C | R | U | · | · |
| Tiện ích (`amenities`) | C | R | · | · | · |
| Ghi chỉ số Điện Nước (`meter_reading`) | · | R | · | · | · |
| Quản Lý Điện Nước (`utilities`) | · | R | · | · | · |
| Hóa Đơn Tổng Hợp (`unified_billing`) | · | R | · | · | · |
| Thu Phí / Đối Soát (`billing`) | · | R | · | · | · |
| Thi Công / Cải Tạo (`construction`) | · | R | · | · | · |
| Bảo Hành / Bảo Trì (CMMS) (`warranty`) | · | R | · | · | · |
| Kinh Doanh (CRM) (`crm`) | · | R | · | · | · |
| Phê Duyệt CRM (`crm_approve`) | · | R | · | · | · |
| Hợp Đồng Mua Bán (`contracts`) | · | R | · | · | · |
| Bảng Giá / Chiết Khấu (`pricebook`) | · | R | · | · | · |
| Lead / Khách Tiềm Năng (`leads`) | · | R | · | · | · |
| Đặt Cọc / Giữ Chỗ (`deposits`) | · | R | · | · | · |
| Bàn Giao Nhà (`handover`) | · | R | · | · | · |
| Hoa Hồng (`commission`) | · | R | · | · | · |
| Doanh Thu (`revenue`) | · | R | · | · | · |
| Cấu hình Hệ thống (`configuration`) | · | R | · | · | · |
| Nhân viên & Phân quyền (`users`) | · | R | · | · | · |
| Lịch sử (Audit Log) (`logs`) | · | R | · | · | · |

## 4. Tổng số quyền (module×action) mỗi vai trò

| Vai trò | Số quyền | Ghi chú |
|---|---|---|
| ADMIN | 130 | Toàn quyền (bypass trong code) |
| MANAGER | 130 | Legacy full (tương đương ADMIN, role=1) |
| DIR | 35 | Xem báo cáo + duyệt vượt hạn mức |
| SM | 34 | KD: giá/CK/hoa hồng + duyệt HĐ |
| SHEAD | 32 | Quản lý team KD + duyệt giữ chỗ |
| SALE | 31 | Lead/cọc, không xóa tài chính |
| AGENT | 28 | Giữ chỗ/cọc hộ khách |
| CS | 29 | Tiếp nhận tổng đài + hỗ trợ sau bán |
| ACC-S | 30 | Phiếu thu/đối soát/công nợ |
| LAW | 27 | Mẫu HĐ/pháp lý/trình ký |
| PMO | 28 | Kế hoạch bàn giao/nghiệm thu |
| PMS-M | 51 | Trưởng BQL: duyệt thi công/miễn giảm |
| PMS-FE | 31 | Tiếp nhận quầy/ghi chỉ số |
| PMS-BILL | 36 | Chốt công tơ/hóa đơn/công nợ |
| PMS-TECH | 33 | Xử lý phản ánh kỹ thuật/CMMS |
| PMS-SEC | 27 | Ra vào/xe/khách |
| AUDIT | 26 | Chỉ đọc toàn bộ (kể cả logs) |
| RESIDENT | 31 | Cổng cư dân (own data) |

## 5. Cách hoạt động bảo mật (autoRbac)

- **Centralized middleware** `rbacAuto.js` mount 1 chỗ trong `server.js` (sau `authenticateToken`).
- Tự động suy **module** từ mount-path (42 prefix → 25 module) và **action** từ HTTP method: `POST=C, GET=R, PUT/PATCH=U, DELETE=D`, path chứa `approve/reject/sign/recalculate/close/confirm` → `A`.
- **Bypass**: `role 0/1` (admin/manager cũ), `ADMIN`/`MANAGER` role, resident token.
- **Fail-open**: path không map được module → cho qua (không khóa nhầm).
- **SoD** (Separation of Duty): `sodMiddleware.js` chặn creator = approver, meter-writer = closer, drafter = signer (khi controller gán `req.sodContext`).
- **Legacy compat**: 107 site `checkPermission` cũ vẫn hoạt động — đã mở rộng để hỗ trợ RBAC roles.

## 6. Nguyên tắc thiết kế

1. Mỗi user có thể có **nhiều vai trò** (`user_roles`). Quyền = union của các role.
2. Quyền đến từ **vai trò**, không gán per-user (đúng mô hình blueprint).
3. Mọi role có **R (Xem)** trên toàn bộ module (minh bạch), hành động C/U/D/A bị giới hạn theo trách nhiệm A.4.
4. Manager cũ (`role=1`) = full quyền (backward-compatible).
5. RESIDENT quản lý riêng qua cổng cư dân (resident token), không gán cho user nội bộ.