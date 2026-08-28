# Phương án: CRM Kinh doanh BĐS (Giai đoạn 3)

> Module bán hàng cao cấp: leads → booking → đặt cọc → hợp đồng → bàn giao. Ngôn ngữ: "showroom sang trọng" — nền sáng, serif display cho số liệu kinh doanh, ảnh dự án thật.

## Trang bao phủ
Điều hướng: `src/components/crm/CrmSubNav.tsx` · 14 trang trong `src/pages/crm/`:
crm (dashboard) · sales-matrix · inventory · leads · bookings · deposits · contracts (+detail) · handover · customers (+detail) · overdue-payments · revenue-report

## Hiện trạng → vấn đề
| Vấn đề | Vị trí |
|---|---|
| Tab điều hướng dùng emoji 📊🗺️⚙️👥🛒💰📄🔑🤝⚠️📈 | CrmSubNav.tsx:15–25 |
| Palette cũ gray/blue/sky/rose tràn lan | toàn bộ trang crm |
| Modal legacy `components/Modal.tsx` còn được import | EarlyPaymentModal.tsx |
| alert() ×8 | DepositListPage.tsx |

## Phương án chi tiết

### 0) CrmSubNav — tái thiết kế hoàn toàn
- Thanh nav ngang dưới topbar: `bg-surface border-b border-brand-border`, tab item = icon SVG (`icons.tsx`: chart/map/settings/users/cart/file/key/handshake/warning/trend) + label
- Active: chữ `text-accent` + gạch chân 2px `bg-accent` animate width 200ms; hover `text-ink` + bg-surface-alt
- Overflow mobile: scroll ngang mượt, ẩn scrollbar; hoặc dropdown "Xem thêm"

### 1) CRM Dashboard
- Hero band: tên dự án BĐS bằng `font-serif text-2xl` + ảnh panorama thật (aspect 21:9, object-cover, overlay gradient teal→transparent 40%)
- 4 StatCard: Doanh số kỳ này · Tỷ lệ chốt (leads→contract) · Giá trị cọc đang giữ · Hợp đồng sắp bàn giao — số `font-serif text-3xl`
- RevenueChart (recharts): line/area màu `accent` + grid `brand-border` nhạt; tooltip Card style; empty → skeleton shimmer
- Funnel ngang Leads→Booking→Deposit→Contract: các đoạn gradient accent→secondary, % chuyển đổi `text-xs ink-soft`

### 2) Sales Matrix & Inventory
- Ma trận toà/tầng/căn hộ dạng lưới ô vuông: mỗi ô = căn hộ, tô theo trạng thái:
  - Available = `surface` viền `brand-border` · Booking = `accent-soft` · Deposited = `bg-secondary/20` · Sold = `bg-accent text-white` · Handover = `brand-success/15`
- Legend chips phía trên; hover ô → tooltip mini (mã căn, diện tích, giá, NV phụ trách); click → drawer chi tiết
- Ô cursor-pointer, focus-visible ring; lưới responsive (auto-fill minmax(44px))
- Filter bar: toà / loại căn / khoảng giá / trạng thái

### 3) Leads & Customers (list + detail)
- List: Table kit chuẩn + phân trang; badge nhiệt độ lead (Nóng=accent, Ấm=warning, Lạnh=ink-faint-chip); nguồn lead chip neutral
- Detail page: header profile (avatar chữ cái nền accent-soft + tên `font-semibold text-lg`) · timeline hoạt động dọc (dot + line brand-border) · quick actions: Gọi/Ghi chú/Tạo booking (Button kit)
- Mọi form ghi chú: textarea `.form-input` + Ctrl+Enter gửi + toast

### 4) Bookings · Deposits · Contracts (+ EarlyPaymentModal)
- Pipeline board nhẹ (không cần drag-drop phức tạp): 3 cột stat + bảng dưới; hoặc giữ list view nhưng thống nhất Table kit
- Số tiền cọc/giá trị HĐ: `font-mono tabular-nums` căn phải; hạn cọc gần đến (<7 ngày) → badge warning + dot pulse (respect reduced-motion)
- **EarlyPaymentModal**: chuyển từ legacy Modal → `ui/Modal`; nút lưu loading → toast
- Contract detail: bố cục 2 cột (trái: thông tin + điều khoản; phải: file đính kèm PDF viewer pdfjs hiện có, payment schedule)
- Xoá/huỷ booking/cọc: `useConfirm` danger mô tả hậu quả

### 5) Handover · Overdue Payments · Revenue Report
- Handover: checklist biên bản dạng steps (Stepper: icon check success / dot current accent)
- Overdue: bảng tương tự Debt Dashboard admin, thêm hành động "Nhắc" (SMS/Zalo)
- Revenue report: biểu đồ recharts bar theo tháng + bảng chi tiết xuất Excel (giữ API)

## Checklist riêng
- [ ] CrmSubNav: 0 emoji, icon SVG nhất quán w-5 h-5, active gạch chân accent
- [ ] Toàn bộ palette cũ gray/blue/sky/rose → token brand (audit grep từng file khi chạm)
- [ ] Sales matrix: legend rõ nghĩa, ô ≥44px touch target, keyboard navigable (arrow keys optional, ít nhất Tab+Enter)
- [ ] Mọi modal qua ui/Modal; không import components/Modal.tsx nữa
- [ ] Số tiền mono căn phải; % font-mono
- [ ] Ảnh dự án: tối ưu width (srcset), lazy-load ngoài hero, có alt
- [ ] Timeline/detail: spacing p-6 card, divider brand-border
- [ ] alert()/confirm() = 0 trong module (DepositListPage ×8 ưu tiên)
- [ ] Empty state mỗi list (EmptyState + CTA "Thêm lead mới"…)
