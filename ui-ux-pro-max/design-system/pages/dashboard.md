# Phương án: Dashboard Tổng quan (Giai đoạn 5a)

## Trang bao phủ
- `/admin/dashboard` → `src/pages/DashboardPage.tsx`

## Hiện trạng → vấn đề
| Vấn đề | Vị trí |
|---|---|
| `gap-4.5` không tồn tại → layout lệch | DashboardPage.tsx:156 |
| 38 hex hardcoded | DashboardPage.tsx |
| Data demo hardcode: `return 178`, `return 7`, mảng doanh thu 6 tháng cứng | DashboardPage.tsx:83–90 |
| Dashboard vẽ SVG tay dù có recharts | DashboardPage.tsx |

## Phương án chi tiết

### Cấu trúc Swiss grid (từ trên xuống)
1. **PageHeader**: "Tổng quan" + subtitle ngày cập nhật (`text-sm ink-soft`) + actions: chọn kỳ (Segmented control: Tuần/Tháng/Quý) · nút Xuất báo cáo (secondary)
2. **KPI row** — 4 StatCard kit:
   - Cư dân đang ở · Hộ gia đình · Doanh thu kỳ này · Tỷ lệ thu phí
   - Con số `font-mono text-3xl tabular-nums`; card tỷ lệ thu thêm vòng cung tiến trình mini (SVG stroke accent)
   - Delta so kỳ trước: `text-xs` + mũi tên SVG (lên = brand-success, xuống = brand-danger) — KHÔNG emoji
3. **Row 2 cột (grid-cols-1 lg:grid-cols-3 gap-6)**:
   - Col span 2 — **Doanh thu 12 tháng** (recharts AreaChart): area gradient accent→transparent, line accent, grid dọc bỏ, trục `text-xs ink-faint`(được phép vì nhạt trên nền chart có data), tooltip Card
   - Col 1 — **Phản ánh mới nhất**: list 5 item, mỗi item: dot ưu tiên (danger/warning/neutral) + tiêu đề clamp-1 + thời gian; footer link "Xem tất cả" text-accent
4. **Row 3 (grid lg:grid-cols-2 gap-6)**:
   - **Hóa đơn sắp đến hạn**: Table kit gọn 6 row (Căn hộ / Số tiền mono / Hạn / Badge trạng thái) + CTA sang Billing
   - **Hoạt động hệ thống**: timeline dọc icon + nội dung + thời gian tương đối ("5 phút trước")
5. **Quick actions strip**: 4 nút tile (Thêm cư dân, Tạo hóa đơn, Ghi chỉ số, Đăng tin) — Card hover-md, icon w-6 h-6 trong chip `bg-accent-soft rounded-lg`

### Dữ liệu
- Giữ nguyên API; fallback demo PHẢI qua hằng `DEMO_MODE = true` hiển thị ribbon "Dữ liệu mẫu" góc phải header — không được giả làm số thật

### Chuyển động
- StatCard xuất hiện: fade-up stagger 60ms/card, 300ms ease-out, một lần duy nhất
- Chart animate draw 600ms; respect prefers-reduced-motion (skip cả hai)

## Checklist riêng
- [ ] Không còn gap-4.5/p-4.5; grid gap-6 chuẩn
- [ ] Không hex literal — token toàn bộ
- [ ] Demo mode có nhãn visible; không fake số thật
- [ ] Biểu đồ chuyển recharts (thư viện đã có), theme token màu; empty/loading skeleton
- [ ] KPI responsive: 4→2→1 cột tại 1440→768→375
- [ ] Mọi tile/link cursor-pointer + hover feedback 200ms
- [ ] Focus ring trên segmented control và quick action tiles
- [ ] Timeline/thống kê dùng icon SVG từ icons.tsx
