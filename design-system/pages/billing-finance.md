# Phương án: Tài chính — Hóa đơn & Công nợ (Giai đoạn 2)

> Ưu tiên cao nhất: đây là luồng tiền của khu đô thị.

## Trang bao phủ
| Route | File |
|---|---|
| `/admin/unified-billing` | `UnifiedBillingPage.tsx` + `billing/UnifiedMonthlyView.tsx` + `billing/UnifiedHistoryView.tsx` |
| `/admin/debt-dashboard` | `DebtDashboardPage.tsx` |
| `/admin/management-fees` | `ManagementFeePage.tsx` |
| `/admin/fee-config` | `FeeConfigPage.tsx` |

## Hiện trạng → vấn đề
| Vấn đề | Vị trí |
|---|---|
| Badge trạng thái dùng emoji 🟢🔴🟡 | UnifiedMonthlyView.tsx:217–219 |
| Table tự viết inline, không qua kit | cả 4 trang |
| Hex hardcoded nhiều | UnifiedMonthlyView, DebtDashboard |
| alert()/confirm() thay toast | rải rác khi lưu/xoá đợt ghi |

## Phương án chi tiết

### 1) Unified Billing — Monthly View (màn hình chính)
**Layout:** PageHeader ("Hóa đơn tổng hợp — Tháng MM/YYYY" + actions: Chốt sổ, Xuất PDF, Xuất Excel) →

- **Dải tổng quan 4 StatCard**: Tổng phát sinh · Đã thu · Còn nợ · Tỷ lệ thu (%). Số lớn `font-mono tabular-nums text-2xl font-serif?` — CHỈ card "Tỷ lệ thu" dùng serif để điểm nhấn; còn lại mono. Trend nhỏ `text-xs` (+/- so tháng trước, mũi tên SVG)
- **Toolbar**: chọn kỳ (month picker) · lọc toà/căn hộ · search SĐT/mã căn · lọc trạng thái (Badge filter chips: Tất cả / Đã thanh toán / Một phần / Chưa thu / Quá hạn)
- **Bảng chính** (`ui/Table`):
  - Cột: Căn hộ · Cư dân · Điện · Nước · Phí quản lý · Phát sinh khác · Tổng cộng · Đã trả · Còn lại · Trạng thái · Hành động
  - Tiền căn phải, `font-mono tabular-nums`; hàng âm/nợ quá hạn: số màu `brand-danger`
  - Status: `<StatusBadge>` — Đã thu = `brand-success`, Một phần = `brand-warning`, Chưa thu = neutral ink-soft, Quá hạn = `brand-danger` + dot tròn 2px (KHÔNG 🟢🔴🟡)
  - Hàng clickable mở drawer chi tiết hóa đơn (ui/Modal size lg): breakdown từng khoản + lịch sử thanh toán + QR SePay + nút "Gửi SMS/Zalo nhắc nợ"
  - Row tổng cộng cuối bảng: `font-semibold bg-surface-alt border-t-2 border-accent/30`
- **Bulk bar** khi checkbox chọn: nổi dưới cùng "Đã chọn N căn hộ — [Nhắc thanh toán] [Xuất PDF gộp]"
- Empty state: `EmptyState` icon receipt + "Chưa có dữ liệu kỳ này" + CTA "Tạo hóa đơn kỳ"

### 2) Unified History View
- Timeline các kỳ đã chốt: mỗi kỳ một row-card (`Card` hover-md) hiển thị: kỳ, tổng thu, tỷ lệ %, mini progress-bar `bg-accent`
- Click kỳ → quay lại Monthly View với query kỳ đó (giữ contract hiện tại)

### 3) Debt Dashboard (Công nợ)
- Hero stat: Tổng nợ xấu `font-serif text-4xl text-brand-danger` + aging bars (30/60/90+ ngày) — horizontal stacked bar dùng success/warning/danger tokens
- Bảng top nợ: sắp xếp giảm dần, cột "Số ngày quá hạn" badge warning→danger theo mức
- Action mỗi row: "Lên lịch nhắc" (modal chọn ngày + kênh)

### 4) Management Fee & Fee Config
- Form cấu hình giá theo định mức: dùng `.form-input`/`.form-label` thống nhất, nhóm field trong Card có heading section
- Bảng đơn giá: đơn vị tiền `font-mono`; nút sửa per-row → chuyển inline-edit hoặc modal; lưu → toast success
- Cảnh báo xoá định mức đang áp dụng → `useConfirm` danger

## Checklist riêng
- [ ] 0 emoji status — toàn bộ StatusBadge/dot token màu
- [ ] Toàn bộ số tiền `font-mono tabular-nums` căn phải; định dạng nhất quán qua `utils/formatters.ts`
- [ ] Mọi thao tác lưu/chốt/xoá: loading state nút → Toast kết quả
- [ ] Xuất PDF/Excel giữ nguyên API call — chỉ đổi UI quanh nó
- [ ] Table overflow-x-auto mobile; hàng quan trọng (tổng) sticky bottom
- [ ] Bộ lọc trạng thái là chip có aria-pressed
- [ ] Drawer/modal chi tiết hóa đơn: focus trap + ESC + backdrop click
- [ ] Contrast: số tiền nợ đỏ `brand-danger` trên nền trắng ≥4.5:1 (đạt: #B94A3D ≈ 5.9:1)
- [ ] Demo/fallback data có nhãn rõ hoặc bỏ
