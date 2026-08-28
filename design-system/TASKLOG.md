# 📋 TASK LOG — Tái thiết kế UI/UX theo skill ui-ux-pro-max

> Nhật ký toàn bộ công việc đã thực hiện trên dự án Resident Management App.
> Kèm danh sách việc còn tồn để xử lý sau.
> Nguồn chuẩn thiết kế: [`resident-management-app/MASTER.md`](resident-management-app/MASTER.md) · Kế hoạch gốc: [`REDESIGN_ROADMAP.md`](REDESIGN_ROADMAP.md)
> Cập nhật lần cuối: 2026-08-26

---

## ✅ TRẠNG THÁI CHỐT HẠ (2026-08-26)

| Kiểm chứng | Kết quả |
|---|---|
| `npm run guard:ui` | **PASS — allowlist 0 file** (guard là luật tuyệt đối) |
| Class palette mặc định Tailwind | **0 / 138 file src** |
| Hex literal `[#...]` trong class | **0** |
| Native alert/confirm/prompt | **0** |
| Emoji làm icon | **0** trong module chính |
| `tsc --noEmit` | PASS |
| `npm run build` (kèm PWA) | PASS |

---

## GIAI ĐOẠN 0 — Nền móng ✅

| # | Công việc | File tác động | Kết quả |
|---|---|---|---|
| 0.1 | Xoá importmap CDN `aistudiocdn.com`; `lang="vi"`; body `bg-bg` | `index.html` | React load từ node_modules |
| 0.2 | `theme-color` indigo → `#122120` | `index.html`, `vite.config.ts` | Metadata đồng bộ brand |
| 0.3 | Thêm font serif Playfair Display (hỗ trợ tiếng Việt) | `tailwind.config.js`, `index.html` | Token `font-serif` khả dụng |
| 0.4 | Sửa 8 vị trí class vô hiệu `*-4.5` (Tailwind 3.4 không có bước này) | ui/Table, ui/Card, ui/Button, AdminLayout, DashboardPage, SePayConfigTab, AmenityManager | Layout hết lệch thầm lặng (2 match còn lại là tọa độ SVG path — giữ nguyên) |
| 0.5 | Gỡ dead-code dark mode: **4.693 class `dark:` khỏi 104 file** (script Node); bỏ `darkMode:'class'` | toàn src | CSS bundle giảm; đã xác minh không có toggle động nào |
| 0.6 | Thanh lý legacy: xoá `components/Sidebar.tsx`; re-point **17 file** từ `Modal.tsx` cũ sang `ui/Modal` (API tương thích) rồi xoá file cũ; bỏ `font-serif` tiêu đề modal | components/, crm/EarlyPaymentModal | 1 hệ modal duy nhất |
| 0.7 | Guard chống tái phát: script `scripts/check-ui-tokens.mjs` + `scripts/ui-guard-allowlist.json` + script npm `guard:ui` + ESLint override cấm alert/confirm trong `src/components/ui/**` | scripts/, .eslintrc.cjs, package.json | Allowlist khởi điểm 121 file |

## GIAI ĐOẠN 1 — UI Kit + Icon hoá + Dialog ✅

| Công việc | Chi tiết |
|---|---|
| Thay dialog native (**115 call-site / 35 file**) | 93 `alert()`→Toast (success/error/warning/info theo ngữ cảnh) · 21 `confirm()`→`useConfirm` async · 4 `prompt()`→dialog riêng (SalesMatrix "Giữ chỗ ngay" nâng cấp thành modal form nhập khách; RichTextEditor mini-dialog chèn link) |
| Thêm **9 icon SVG mới** vào `icons.tsx` | GolfFlag, Horseshoe, Museum, ZenTree, SaunaSteam, ArcheryTarget, Dumbbell, Lotus, Eye (+Bell/EyeSlash ở giai đoạn sau) |
| Icon hoá emoji | CrmSubNav 11 tab; AmenityManager/Stats chuyển config `icon:string`→component; nút hành động News/Apartments/Vehicles/ManagementFee/Portal; badge 🟢🔴🟡; option select |
| Contrast WCAG | 5 chỗ `#8B978E`(2.8:1)→`#5A6960`(≈5.9:1): Table count, Input helperText, Dashboard empty, SePay notes |

## GIAI ĐOẠN 2 — Tài chính/Hóa đơn ✅ (`pages/billing-finance.md`)

- **UnifiedBillingPage**: 2 `window.confirm`→useConfirm; StatusBadge semantic; toolbar primary accent + secondary outline
- **UnifiedMonthlyView** *(rewrite)*: 4 KPI mới (Tổng phát sinh/Đã thu+progress/Còn nợ/**Tỷ lệ thu ring SVG accent**); filter chips `aria-pressed`; bảng tiền mono + chip căn hộ BuildingOfficeIcon + **hàng Tổng cộng** `border-t-2 border-accent/30`
- **UnifiedHistoryView** *(rewrite)*: timeline row-card kỳ serif `T07` + progress bar theo trạng thái + **click kỳ → Monthly View đúng kỳ** (`onSelectPeriod`)
- **DebtDashboard** *(agent)*: header Swiss; "Còn Nợ" font-serif danger; thanh phân bổ Thu/Nợ; xoá 4 hover-scale; rank badge phẳng
- **ManagementFee + FeeConfig** *(agent)*: StatCard chuẩn mono; form ring-accent/30; FeeConfig bỏ gradient emerald/indigo → accent system

## GIAI ĐOẠN 3 — CRM Suite ✅ (`pages/crm-suite.md`)

- **CrmDashboardPage** *(rewrite)*: hero band teal + wordmark serif; `PHASE_STYLES` map (TESLA=success/CANTATA=accent/NOXH=teal); funnel 6 stage hover accent; quick-nav chip xoay soft
- **13 trang qua 5 agent**: SalesMatrix+Inventory (mapping 6 trạng thái ô căn hộ chuẩn, ô ≥44px, ring-accent/60); LeadKanban+CartAndBooking+Deposit (badge nhiệt độ lead, countdown warning); ContractList/Detail+CustomerList/Detail (avatar chip, timeline LTT dot, bỏ font-serif label sai); Handover+Overdue+RevenueReport (stepper icon, stat viền trái semantic, 📊💰→SVG); ApprovalQueue (bắt sót — badge PENDING/APPROVED/REJECTED)

## GIAI ĐOẠN 4 — Portal cư dân ✅ (`pages/resident-portal.md`)

- **ResidentPortalHost** *(rewrite)*: split-screen — panel trái teal + wordmark serif; form phải chuẩn token, autocomplete tel/current-password, lỗi inline danger; chọn căn hộ `role="listbox"` chevron hover
- **ResidentPortalPage shell**: NAV_ITEMS 6 emoji→SVG (thêm Newspaper dùng sẵn, thêm BellIcon); active nav = **accent bar dọc trái**; title serif; drawer/menu token; push prompt teal-soft; `handleCancelBooking`→useConfirm
- **Tabs** *(3 agent)*: Điện nước + Hóa đơn ("Tổng cần phải trả" = **serif text-4xl**, QR khung trắng, banner success solid); Tin tức (featured 16:9 serif title, grid hover scale-[1.03] trong overflow-hidden, lazy+alt); Phản ánh+Sổ tay (dropzone dashed, hotline cards, skeleton shimmer)
- **statusLabels.ts**: 3 hàm badge chung (payment/contract/feedback) token hoá

## GIAI ĐOẠN 5 — Dashboard + Directory ✅ (`dashboard.md`, `residents-apartments.md`)

- **DashboardPage** *(rewrite)*: bỏ fallback giả im lặng → ribbon cảnh báo trống; **recharts BarChart** thay SVG tay (Cell tô tháng cuối, tooltip card) + nhãn **"Dữ liệu mẫu"** công khai; KPI: Cư dân/Tỷ lệ lấp đầy **ring teal**/Phản ánh mở/Tiện ích chờ duyệt (real props); panel Phản ánh mới nhất; 4 tile Truy cập nhanh; stagger fade-up `motion-safe`
- **Residents/ResidentAccounts/Apartments/Vehicles** *(2 agent)*: Directory pattern — avatar chip chữ cái, SĐT/CCCD/biển số mono uppercase, search pl-9 ring-accent/30, icon-button ghost + aria-label, badge pill+dot, filter chips aria-pressed

## GIAI ĐOẠN 6 — Điện nước + Cộng đồng ✅ (`utilities-community.md`)

- **Utility trio** *(agent)*: segmented control; ApartmentViewMode badge pill; MonthlyViewMode stat token hoá, mã căn chip accent
- **TechnicianMeter** *(agent)*: mobile-first max-w-md; **target ≥48px** toàn bộ; progress bar ghi chỉ số (fill accent); kết quả AI font-mono lớn
- **AmenityPage + NewsManagement + RichTextEditor** *(agent)*: Duyệt/Hủy inline success/danger; thumbnail 16:9 w-20; editor toolbar ghost/tab accent (không đổi props)
- **FeedbackManagement** *(agent)*: LIST + filter chips (type chỉ có SUBMITTED|RESOLVED — không bịa board 3 cột); tái dùng helper badge chung
- **Tự xử lý phát sinh**: FeedbackStats, BulkReportModal, **AmenityManager/AmenityStats** (xoá field `bgGradient` đa sắc → card surface + chip xoay 4 họ token; fix lỗi syntax do regex script)

## GIAI ĐOẠN 7 — Hệ thống ✅ (`config-system.md`)

- **LoginPage NV** *(rewrite)*: split-screen đồng bộ portal + badge viền QUẢN TRỊ; password toggle Eye/EyeSlash (icon mới); lỗi shake `motion-safe:animate-shake` (keyframe mới)
- **Users + ActivityLog** *(agent)*: directory pattern; **verb chip** CREATE=success/UPDATE=warning/DELETE=danger/CONVERT=teal (tái dùng hàm phân loại sẵn)
- **ConfigurationPage shell** *(agent)*: **sidebar dọc w-56** 9 tab mỗi tab 1 icon riêng; mobile select dropdown; key contract giữ nguyên
- **9 config tabs** *(2 agent)*: SePay/VNPT secret fields eye-reveal + copy; QR guide ol steps; Pricing card Tổng Quan Biểu Phí mono; AmenityCfg 8 SVG icon map

## SWEEP CUỐI — Dọn 57 file palette còn sót ✅

- UI kit 6 file (Toast/ConfirmDialog/EmptyState/Skeleton/LoadingSpinner/PageHeader) — tự làm
- CrmSubNav topbar breadcrumb — tự làm
- **51 file qua 5 agent song song** (modal lớn / detail views / CRUD modals / CRM comps / 24 file nhỏ)
- Bắt sót & tự sửa: AddApartmentModal, BookAmenityModal, FeedbackStats, BulkReportModal, AmenityManager/AmenityStats
- **Hex literal ~90 chỗ** → token (UI kit, AdminLayout sidebar rgba accent → accent/15…)
- **Guard bắt được 7 `window.confirm` sống sót** mà các đợt agent trước báo sạch (chỉ grep palette) → đã chuyển hết sang useConfirm — bằng chứng giá trị của guard

---

## 🔧 HOTFIX 26/08 — Layout trang Sổ Tay Cư Dân (Config)

| Vấn đề theo ảnh chụp | Nguyên nhân | Đã sửa |
|---|---|---|
| "Lịch sử Thay đổi" chiếm 1/3 màn hình, chèn ép nội dung | `ConfigurationPage` grid `xl:grid-cols-3` (content 2 + history 1) | Đổi `grid-cols-4` (content **3/4**, history 1/4) + compact rail: p-4, timeline dot/pl nhỏ, text 11px, nowrap |
| Hotline cards nhảy dòng ("An Ninh 24/7" xếp dọc), chật chội | 3 card dọc `sm:grid-cols-3` trong cột hẹp | Đổi sang **hàng ngang compact**: label nowrap shrink-0 + input mono `text-right flex-1 min-w-0`, xếp chồng 3 row — không bao giờ wrap |
| PDF preview bị bóp hẹp trong khung tối | `PdfCanvasReader` dùng **hệ số cứng ×1.2** + canvas pixel cố định, không theo container | Thêm **ResizeObserver + auto fit-width**: `scale=1 ≡ vừa bề ngang` (công thức `available/base.width`); nút "Vừa trang" = reset 1; zoom % giữ nguyên ngữ nghĩa; Handbook đổi `initialScale 0.9→1` |
| Chia lại cột tab Sổ Tay | Trước 5/7 | Sau **4/8** nghiêng về PDF viewer |

File: `ConfigurationPage.tsx`, `HandbookConfigTab.tsx`, `PdfCanvasReader.tsx` · Verify: tsc 0 · guard PASS · build PASS

---

## 📌 VIỆC CÒN TỒN / DEFERRED (xử lý sau)

### Cần backend/API mới (đang bịa-free, chờ dữ liệu)
| # | Việc | Chặn bởi | Ghi chú |
|---|---|---|---|
| B1 | Aging bars công nợ 30/60/90 ngày (DebtDashboard) | API `/debt-dashboard/stats` chưa có buckets | Đã thay bằng thanh phân bổ Thu/Nợ |
| B2 | Bulk-bar chọn nhiều căn hộ ở Unified Billing | API bulk notify chỉ nhận month/year | Không làm fake action |
| B3 | Badge hạn gửi xe <30 ngày (Vehicles) | Type `Vehicle` chưa có field ngày hết hạn | Spec sẵn trong code comment |
| B4 | Doanh thu thật Dashboard (hiện nhãn "Dữ liệu mẫu") | Chưa có API revenue | Recharts đã sẵn sàng nối data |
| B5 | Badge "Chưa đồng bộ" TechnicianMeter | Chưa có trạng thái sync trong data | |

### Kỹ thuật còn lại
| # | Việc | Ghi chú |
|---|---|---|
| T1 | `src/components/crm/RevenueChart.tsx` chưa token màu recharts | Nằm ngoài phạm vi agent giai đoạn 3; chart dùng chung, sửa cẩn thận |
| T2 | Baseline `npm run lint` fail ~2282 problems (prettier chiếm đa số, auto-fixable) | Chạy `npm run format` trong nhánh riêng rồi review diff lớn |
| T3 | `_backup_before_refactor/` chứa code cũ | Cân nhắc xoá khi chắc chắn không cần |
| T4 | **Repo chưa có git** — nên `git init` + commit đầu tiên ngay để khoá trạng thái sạch này | Rủi ro mất việc nếu không version control |
| T5 | Smoke test thủ công các luồng chính sau refactor: login NV/cư dân → billing → portal tabs → CRM matrix | Chưa chạy được (cần DB/backend) |
| T6 | Dark mode đã gỡ sạch — nếu muốn tái lập phải thiết kế palette tối riêng cho brand cà phê | Quyết định tại Giai đoạn 0.5 |

### Bảo trì design system
- Khi tạo file/trang mới: chạy `npm run guard:ui` — vi phạm sẽ FAIL ngay (allowlist đã rỗng)
- Mọi màu mới phải thêm vào `tailwind.config.js` làm token trước, không viết hex/palette trực tiếp
- Icon mới bổ sung vào `src/components/icons.tsx` (chuẩn Heroicons outline 24×24, strokeWidth 1.5)
- Thiết kế trang mới: đọc `MASTER.md` trước, override riêng đặt tại `pages/<page>.md`

---

## 🛠️ TOOL & SCRIPT ĐÃ TẠO

| Tool | Vị trí | Công dụng |
|---|---|---|
| UI Token Guard | `scripts/check-ui-tokens.mjs` + `npm run guard:ui` | Chặn: native dialog, hex class, palette mặc định, spacing `-4.5`. `--init` để cấp lại allowlist (hiện rỗng) |
| Allowlist | `scripts/ui-guard-allowlist.json` | **Đã rỗng `[]`** — mọi file đều chịu luật |
| ESLint override | `.eslintrc.cjs` | Error-level cấm alert/window.confirm trong `src/components/ui/**` |
| Design tokens | `tailwind.config.js` | Brand cà phê + serif Playfair Display + keyframe shake |
| Task log | `design-system/TASKLOG.md` | File này |
