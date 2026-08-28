# Phương án: Điện nước · Tiện ích · Tin tức · Phản ánh (Giai đoạn 6)

## Trang bao phủ
| Route | File |
|---|---|
| `/admin/utilities` | `UtilityPage.tsx` + `utility/ApartmentViewMode.tsx`, `utility/MonthlyViewMode.tsx` |
| `/admin/meter-recorder` | `TechnicianMeterPage.tsx` (mobile, AI scan) |
| `/admin/amenities` | `AmenityPage.tsx` + `AmenityManager.tsx`, `AmenityStats.tsx` |
| `/admin/announcements` | `NewsManagementPage.tsx` |
| `/admin/feedback` | `FeedbackManagementPage.tsx` |

## Hiện trạng → vấn đề
| Vấn đề | Vị trí |
|---|---|
| Emoji tiện ích làm ICON SYSTEM trong code (🏌️🏇🏛️🌳🧖🏹💪🧘) | AmenityManager.tsx:34–104 |
| `gap-4.5` | FeedbackManagementPage.tsx |
| Nút emoji (✏️🗑️📤…) | NewsManagementPage.tsx:23–26,187–189 |
| Hex hardcoded nhiều | UtilityPage, AmenityManager |

## Phương án chi tiết

### 1) Utilities — Ghi chỉ số & tính tiền
- **ApartmentViewMode**: grid căn hộ card nhỏ — mỗi card: mã căn mono + 2 input số điện/nước (`font-mono text-right`) + trạng thái đã ghi (dot success) / chưa (dot warning). Lưu tự động debounce 800ms → indicator "Đã lưu" fade; lỗi → toast
- **MonthlyViewMode**: bảng ma trận kỳ × căn hộ; ô số `font-mono`; cột tiêu thụ (kỳ này − kỳ trước) highlight bất thường (>150% trung bình) badge warning "Kiểm tra"
- Chốt kỳ: nút primary + useConfirm liệt kê số căn chưa ghi

### 2) Technician Meter Page (mobile-first, kỹ thuật viên đi ghi)
- Layout 1 cột tối đa max-w-md mx-auto; target ≥48px
- Danh sách căn cần ghi: progress bar đầu trang (accent); item: mã căn + ảnh đồng hồ đã chụp (thumbnail vuông rounded-lg)
- **AI scan flow**: nút camera lớn → khung viewfinder viền accent góc 4 cạnh (SVG overlay) → kết quả số đọc hiển thị `font-mono text-4xl` cho xác nhận/correct thủ công → Confirm. Giữ nguyên API/logic AI
- Offline-safe UI: badge "Chưa đồng bộ" warning trên item khi fail, retry tự động

### 3) Amenities — tách DATA khỏi ICON
- Quyết định thiết kế: emoji tiện ích hiện là hằng trong code → chuyển thành **icon key** (map amenity category → SVG từ icons.tsx: gym=dumbbell, spa=sparkles, pool=water…)
- Nếu vẫn muốn giữ emoji do admin cấu hình: render trong **chip avatar tròn** `bg-accent-soft w-10 h-10 grid place-items-center` — emoji là dữ liệu hiển thị, KHÔNG phải icon hành động
- Card tiện ích: chip + tên + mô tả clamp-2 + giá/giờ `font-mono` + toggle mở bán (switch)
- AmenityStats: thay emoji bằng SVG stat icons; số liệu mono

### 4) Announcements (Tin tức)
- Bảng bài viết: thumbnail 16:9 w-20 rounded-md (placeholder surface-alt nếu không có ảnh), title clamp-2, badge trạng thái (Nháp neutral / Đăng brand-success / Hạ ink-soft), ngày mono
- Editor: RichTextEditor giữ nguyên logic — restyle toolbar: nút icon ghost active=accent; vùng soạn thảo `.form-input` min-h-[320px]; đếm chữ text-xs ink-soft
- Hành động emoji ✏️🗑️📤 → pencil/trash/upload SVG icon-button

### 5) Feedback Management
- Kanban nhẹ 3 cột (Tiếp nhận / Đang xử lý / Hoàn tất) desktop; mobile = list + filter chips
- Card phản ánh: dot ưu tiên (Cao=danger pulse / TB=warning / Thấp=neutral) + loại (chip) + nội dung clamp-3 + meta cư dân/căn + thời gian tương đối
- Click → drawer xử lý: timeline nội bộ + textarea phản hồi + đổi trạng thái (select) → toast
- Sửa gap-4.5 → gap-4

## Checklist riêng
- [ ] Emoji tiện ích: tách code-icon vs data; icon hành động 100% SVG
- [ ] Meter page mobile: mọi target ≥48px, font số lớn dễ đọc, hoạt động 1 tay
- [ ] Auto-save indicator không gây layout shift (chiều cao cố định)
- [ ] Bất thường chỉ số được đánh dấu rõ để kiểm tra trước chốt
- [ ] Chốt kỳ có confirm liệt kê tác động
- [ ] Kanban/drawer feedback: keyboard ESC, focus trap, aria-label cột
- [ ] Toolbar editor thống nhất token; không palette cũ
- [ ] Ảnh bài viết lazy-load + aspect-ratio cố định
- [ ] Không còn gap-4.5/p-4.5 trong module
