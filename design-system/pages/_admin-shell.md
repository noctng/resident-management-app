# Phương án: Admin Shell (AdminLayout + Navigation)

> Override MASTER.md cho toàn bộ vùng `/admin/*`. Áp dụng Giai đoạn 1.

## Trang bao phủ
- `src/components/layout/AdminLayout.tsx` — sidebar + topbar + content area
- Điều hướng: `AdminHost.tsx` (route map, giữ nguyên path)

## Hiện trạng → vấn đề
| Vấn đề | Vị trí |
|---|---|
| `p-4.5` không tồn tại trong Tailwind 3.4 → padding = 0 | AdminLayout.tsx:177 |
| 43 hex hardcoded | AdminLayout.tsx |
| Nút Đăng xuất thiếu icon (mọi nút khác có) | AdminLayout.tsx:272–278 |
| Legacy `Sidebar.tsx` song song, lỗi thời | components/Sidebar.tsx |

## Phương án chi tiết

### Sidebar (cột trái, cố định)
- Giữ palette teal đậm hiện tại (`sidebar-bg #122120→#0C1716`) — đây là "ngực áo vest đen" của brand cao cấp
- Logo khu đô thị: wordmark `font-serif` Playfair Display màu `#F2F3EF`, dưới là caption `text-[11px] tracking-[0.2em] uppercase text-sidebar-dim` (VD: "THÀNH PHỐ CÀ PHÊ")
- Nav item: `w-6 h-6` icon + label `text-sm`; active = nền `white/5` + thanh dọc trái `bg-accent` 2px + chữ trắng; hover = `white/5`, transition-colors 200ms; **cursor-pointer**
- Nhóm điều hướng có heading `text-[11px] uppercase tracking-wider text-sidebar-dim px-4`: TỔNG QUAN · CƯ DÂN · TÀI CHÍNH · TIỆN ÍCH · KINH DOANH (CRM) · HỆ THỐNG
- Badge đếm (phản ánh mới, hóa đơn quá hạn): pill `bg-accent text-white text-[10px]`
- Nút Đăng xuất: thêm icon logout `w-5 h-5`, style ghost đỏ nhạt `text-red-300/80 hover:text-red-200`

### Topbar (thanh trên content)
- Chiều cao 64px, `bg-surface border-b border-brand-border`
- Trái: breadcrumb hoặc tiêu đề trang từ route (`PageHeader` đảm nhiệm trong content, topbar chỉ chứa search + actions)
- Phải: ô tìm kiếm nhanh (Input sm, w-64) · chuông thông báo (icon + dot `bg-brand-danger`) · avatar user với menu (Profile, Đổi mật khẩu, Đăng xuất qua `useConfirm`)
- Backdrop-blur nhẹ khi scroll được phép (`backdrop-blur-sm bg-surface/90`)

### Content area
- `bg-bg` (#F2F3EF), padding `p-6 lg:p-8`, `max-w-[1440px] mx-auto`
- Mỗi trang bắt đầu bằng `PageHeader` (title + mô tả ngắn + actions phải)

### Xoá dọn
- Xoá `components/Sidebar.tsx`; sửa import legacy nếu còn tham chiếu
- Gỡ class `dark:` trong AdminLayout theo Giai đoạn 0

## Checklist riêng
- [ ] Sidebar active state rõ ràng, có accent bar; mọi nav item cursor-pointer + hover
- [ ] Đăng xuất có icon + xác nhận `useConfirm`
- [ ] Không còn hex literal — dùng token sidebar-*
- [ ] Không còn `p-4.5` (đã sửa ở 0.4 nhưng verify lại)
- [ ] Responsive: sidebar thu thành icon-rail ở <1024px, off-canvas drawer ở <768px (overlay + ESC đóng)
- [ ] Focus visible trên tất cả nav item; skip-link tới content (a11y)
- [ ] Badge số lượng cập nhật realtime không giật layout (min-width cố định)
