# ROADMAP TÁI THIẾT KẾ — Resident Management App

> ## ✅ TRẠNG THÁI: ĐÃ TRIỂN KHAI HOÀN TẤT (Giai đoạn 0–7 + sweep cuối)
> Xem nhật ký chi tiết công việc đã làm, kết quả xác minh và **danh sách việc còn tồn** tại
> **[`TASKLOG.md`](TASKLOG.md)** · Kiểm chứng cuối: `guard:ui` PASS 0 allowlist · `tsc` 0 · `build` PASS

> **Phạm vi:** CHỈ tầng UI/UX (`src/`, `tailwind.config.js`, `index.html`, `index.css`).
> ❌ KHÔNG thay đổi: API (`services/api.ts`, backend Express/Prisma), database, business logic, routes, types.
> ✅ Nguồn chân lý: [`MASTER.md`](resident-management-app/MASTER.md) + các file `pages/*.md` (override theo trang).

---

## 1. Định vị thiết kế: "QUIET LUXURY"

App phục vụ **quản lý khu đô thị cao cấp + kinh doanh BĐS cao cấp** → ngôn ngữ thiết kế:

| Trục | Quyết định | Lý do |
|---|---|---|
| Nền tảng | Minimalism & Swiss (từ skill) | Dữ liệu dày đặc cần rõ ràng, grid, whitespace |
| Sang trọng | Serif display **Playfair Display** CHỎM cho tiêu đề lớn ở Portal/marketing + số liệu StatCard | Cinzel/Josefin (skill đề xuất) thiếu dấu tiếng Việt — loại |
| Hiệu ứng | Liquid Glass ❌ toàn phần (perf kém, contrast risk). Chỉ `backdrop-blur-sm` ở overlay modal + hero portal (đã có) | Skill tự đánh giá Moderate-Poor performance |
| Chuyển động | Chậm, tinh tế: 200–300ms ease-out; hero 400–600ms; `prefers-reduced-motion` | Anti-pattern của skill: "Fast animations" |
| Hình ảnh | Ảnh kiến trúc thật chất lượng cao ở Portal hero/tin tức; KHÔNG stock ảnh rẻ | Anti-pattern: "Poor photos" |

### 1.1. Bổ sung Design Tokens (sửa `tailwind.config.js` + Google Fonts)

```js
fontFamily: {
  sans: ["Be Vietnam Pro", "Inter", "sans-serif"],
  serif: ["Playfair Display", "Georgia", "serif"], // ★ THÊM — display heading, hỗ trợ tiếng Việt
  mono: ["IBM Plex Mono", "monospace"],
}
```
Google Fonts thêm: `Playfair Display:wght@500;600;700&display=swap` (subset vietnamese).

Quy tắc serif: **CHỈ** dùng cho (a) hero title portal, (b) tên dự án/khu đô thị, (c) con số StatCard lớn. CẤM trong nút, label form, table, badge.

### 1.2. Bảng ánh xạ "cảm giác cao cấp" → kỹ thuật

| Cảm giác | Kỹ thuật |
|---|---|
| Yên tĩnh, giàu có | Whitespace rộng (p-6/p-8), ít đường kẻ, phân tách bằng khoảng cách |
| Chính xác | Số liệu `font-mono tabular-nums`, căn phải cột tiền |
| Thương hiệu | Accent cam cà phê chỉ làm ĐIỂM NHẤN (CTA, active), không sơn diện rộng |
| Chăm chút | Shadow 2 tầng tinh tế, border `brand-border`, radius nhất quán 10–16px |
| Tin tưởng | Teal đậm cho thông tin/trạng thái, success/danger/warning semantic thống nhất |

---

## 2. CÁC GIAI ĐOẠN TRIỂN KHAI

### 🔧 GIAI ĐOẠN 0 — Nền móng (bắt buộc làm trước, ~1 ngày)

| # | Việc | File | Chi tiết |
|---|---|---|---|
| 0.1 | ❌ Xoá importmap CDN `aistudiocdn.com` | `index.html:18–30` | React phải load từ node_modules — rủi ro bảo mật/lệch version |
| 0.2 | 🎨 Sửa `theme-color` indigo → `#122120` (sidebar teal) | `index.html`, `vite.config.ts` manifest | Metadata sót theme cũ |
| 0.3 | ➕ Thêm font-serif Playfair Display | `tailwind.config.js`, `index.html` | Mục 1.1 |
| 0.4 | 🔧 Sửa 10 vị trí class `*-4.5` → bước hợp lệ (`px-4`, `gap-4`…) | `ui/Table.tsx:93,107`, `ui/Card.tsx:16`, `ui/Button.tsx:28`, `AdminLayout.tsx:177`, `DashboardPage.tsx:156`, `SePayConfigTab.tsx`, `FeedbackManagementPage.tsx`, `icons.tsx`, `AmenityManager.tsx` | Tailwind 3.4 không sinh class này — layout đang lệch thầm lặng |
| 0.5 | 🗑️ Quyết định dark mode: **GỠ** toàn bộ class `dark:` (~4.693 class dead code, không có toggle) HOẶC làm toggle + dark palette. Khuyến nghị: gở bằng build script/lint rule, tái thêm sau nếu có yêu cầu | toàn src | Giảm ~30% CSS, tránh mâu thuẫn palette |
| 0.6 | 🗑️ Xoá legacy: `components/Sidebar.tsx`, `components/Modal.tsx` (sửa `EarlyPaymentModal.tsx` dùng `ui/Modal`) | 2 file + 1 import | 2 hệ song song |
| 0.7 | ⚙️ Thiết lập guard: ESLint rule cấm `bg-[#`, palette mặc định (`gray-\d`, `blue-\d`…), `alert(`, `window.confirm(` trong src (allowlist file cũ, thu hẹp dần) | `.eslintrc` | Ngăn tái phát |

**Exit criteria:** build pass, không còn `*-4.5`, không còn CDN importmap, lint rule chạy được.

### 🧱 GIAI ĐOẠN 1 — Hệ vỏ & UI Kit (xem `pages/_admin-shell.md`, ~2 ngày)

- Áp dụng `ui/*` kit làm BẮT BUỘC: mọi Button/Modal/Table/Card/Badge/Input mới hoặc khi chạm vào file cũ phải chuyển sang kit
- Icon hoá: thay toàn bộ emoji icon (CRM subnav, AmenityManager, nút hành động, badge 🟢🔴🟡) bằng `icons.tsx`; bổ sung icon còn thiếu vào `icons.tsx`
- Toast/ConfirmDialog thay `alert()`/`window.confirm()` (110 chỗ — ưu tiên AdminHost ×14, DepositListPage ×8, UserManagementPage ×7)
- Contrast fix: `ink-faint` chỉ cho placeholder/văn bản trang trí; caption → `ink-soft`

### 📅 GIAI ĐOẠN 2–7 — Theo module (thứ tự ưu tiên kinh doanh)

| Giai đoạn | Module | File phương án | Trang | Effort |
|---|---|---|---|---|
| 2 | Tài chính - Hóa đơn | `pages/billing-finance.md` | Unified Billing (monthly/history), Công nợ, Phí quản lý, Định mức giá | L |
| 3 | CRM BĐS | `pages/crm-suite.md` | Subnav + 12 trang CRM | XL |
| 4 | Portal cư dân | `pages/resident-portal.md` | Login/chọn căn hộ + 6 tab portal | L |
| 5 | Vận hành cốt lõi | `pages/dashboard.md`, `pages/residents-apartments.md` | Dashboard, Cư dân, TK cư dân, Căn hộ, Phương tiện | L |
| 6 | Điện nước & Cộng đồng | `pages/utilities-community.md` | Ghi chỉ số, Điện nước, Tiện ích, Tin tức, Phản ánh | M |
| 7 | Hệ thống | `pages/config-system.md` | Login NV, Users, Configuration 9 tab, Activity log | M |

> Lý do thứ tự: Billing + CRM là luồng tiền mặt & doanh thu (giá trị cao nhất), Portal là mặt tiền thương hiệu với cư dân.

---

## 3. CHECKLIST TOÀN DỰÁN (áp cho MỌI PR UI)

### A. Token & màu
- [ ] Không hex literal mới (`bg-[#…]`) — dùng token (`accent`, `ink`, `surface`…)
- [ ] Không palette mặc định Tailwind (`gray-* blue-* slate-* emerald-* sky-* rose-* amber-*`)
- [ ] Semantic đúng: thành công `brand-success`, lỗi `brand-danger`, cảnh báo `brand-warning`, info `brand`
- [ ] Text chính ≥4.5:1; `ink-faint` KHÔNG dùng cho body/caption trên nền trắng

### B. Typography
- [ ] `font-sans` mặc định; số liệu `font-mono tabular-nums`
- [ ] `font-serif` CHỈ hero portal / tên khu đô thị / số StatCard lớn
- [ ] Scale: page-title `text-xl bold` · section `text-base semibold` · body `text-sm` · caption `text-xs`

### C. Icon & hình ảnh
- [ ] 0 emoji làm icon; mọi icon từ `src/components/icons.tsx` (24×24, `w-5 h-5`/`w-6 h-6`)
- [ ] Status dot = `<span class="w-2 h-2 rounded-full bg-brand-success">` chứ không 🟢🔴🟡
- [ ] Ảnh thật chất lượng cao cho surface marketing; có `alt`

### D. Component
- [ ] Dùng `ui/*` kit; KHÔNG viết inline markup trùng chức năng kit
- [ ] Mọi clickable có `cursor-pointer` + hover feedback đổi màu/shadow (150–300ms, không scale)
- [ ] Focus visible (`focus-visible:ring-2 ring-accent/40`)
- [ ] Form: label htmlFor + loading → toast thành công/lỗi (không im lặng)
- [ ] Table bọc `overflow-x-auto`; row clickable qua `TableRow isClickable`
- [ ] Modal duy nhất qua `ui/Modal`; xác nhậnxoá qua `useConfirm`; thông báo qua `useToast`

### E. Layout & responsive
- [ ] Responsive 375 / 768 / 1024 / 1440px, không scroll ngang
- [ ] Không content bị navbar che; max-width nhất quán mỗi vùng
- [ ] Spacing bước hợp lệ (KHÔNG `*-4.5`)

### F. Trạng thái
- [ ] Loading: Skeleton (list/table) + spinner (nút) — không flash trắng
- [ ] Empty: `EmptyState` với icon + CTA hành động
- [ ] Error: inline/toast, có nút thử lại
- [ ] Dữ liệu demo hardcode (DashboardPage `return 178`…) phải có cờ `isDemo` hiển thị rõ hoặc nối data thật

### G. Ràng buộc phạm vi
- [ ] KHÔNG sửa `services/api.ts`, backend, Prisma schema, types domain
- [ ] KHÔNG đổi route path / query contract (`?tab=`)
- [ ] Build + lint pass; smoke test các luồng chính sau mỗi giai đoạn

---

## 4. RỦI RO & GHI CHÚ

| Rủi ro | Giảm thiểu |
|---|---|
| Refactor hàng loạt gây hồi quy UI | Làm theo module, mỗi PR 1 module, chụp before/after |
| Gỡ `dark:` làm hỏng giao diện đang hoạt động | Class `dark:` hiện KHÔNG bao giờ kích hoạt (không toggle) → gỡ an toàn; vẫn smoke test |
| Emoji tiện ích (AmenityManager) là DATA người dùng nhập, không phải icon code | Chỉ thay emoji nằm trong CODE; emoji do admin nhập giữ nguyên, render trong chip avatar |
| Importmap CDN có thể đang được dùng khi dev offline | Kiểm tra app chạy bình thường từ node_modules trước khi xoá |
