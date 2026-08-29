# PR: UI/UX Evolution — Quiet Luxury Design System + UX Chuẩn hoá (Track 1–8)

> **Trạng thái:** ⚠️ Repo không có remote (`git remote -v` rỗng) → chưa thể `git push` / tạo PR thật trên GitHub.
> Branch đã tạo local: **`ui-ux-track1-track3`** (chứa 31 commits UI/UX từ `e753b11` đến `63eb831`).
> Cung cấp remote URL để push + tạo PR thật.

## Tóm tắt
Nâng cấp tầng UI/UX của Resident Management App từ "đẹp rời rạc / AI-generated feel" → **hệ thống Quiet Luxury nhất quán + UX cư dân mượt + loại bỏ AI-tells**. Không đổi backend/schema/API/route/response shape.

## Track 1 — Design System v2 (12 commits)
- **Type ramp tokens**: `text-display/h1/h2/body/caption` (display/h1 = Playfair serif) trong `tailwind.config.js`
- **Elevation system 3 mức**: `shadow-elevation-surface/raised/overlay` thay thế shadow rgba hardcode lộn xộn
- **StatCard v2**: hero variant (Serif lớn + accent) + subValue/value tone/unit/footer/accentTone
- **DataTable chung**: sort / sticky header / row-hover / empty-state / pagination / density toggle
- **Command Palette (⌘K)**: quick-nav fuzzy search routes + actions cho admin (tích hợp `AdminLayout`)
- **Migrate 11 stat grids** → `StatCard` (DashboardStats, Debt, Overdue, Warranty, Vehicle, Residents, ContractDocumentHub...)

## Track 3 — Portal Cư Dân (1 commit)
- **Touch target 44px**: token `tap` (`min-h-tap`) áp dụng nav + mobile menu buttons
- **Responsive mở rộng**: `lg:max-w-7xl` + `lg:min-h-[90vh]` cho portal container
- **Onboarding first-run**: `PortalOnboarding.tsx` — 4-step guided tour, lưu `localStorage` (không cần backend)

## Track 4 — Chuẩn hoá StatCard remaining pages (11 commits)
16 pages migrated (tự làm tuần tự, không sub-agent):
- **Nhóm A (Finance)**: DashboardPage (3/4), ManagementFeePage (4), FeeConfigPage (7 pricing), UnifiedMonthlyView (2 KPI)
- **Nhóm B (CRM)**: CrmDashboardPage (4), SalesMatrixPage (6 status), CommissionPage (4), RevenueReportPage (4 + xoá `SummaryCard` dup)
- **Nhóm C (Directory)**: ApartmentsPage (5), NewsManagementPage (3)
- **Nhóm D (Config)**: PricingConfigTab (4)
- **Nhóm E (Ops)**: PropertyTransferPage (4), ConstructionFitoutPage (4)

## Track 5 — Hướng A: Elevation AI-tell (2 commits)
- **Mở rộng `guard:ui`**: thêm rule #5 cấm raw `shadow-xl`/`shadow-2xl` (buộc dùng token elevation)
- **61 files migrated**: 31 modal/overlay (`shadow-xl/2xl`→`elevation-overlay`) + 30 pages/tables/portals (`xl`→`elevation-raised`, `2xl`→`elevation-overlay`)
- Allowlist cleared → guard siết 100%

## Track 6 — Giảm text-xs overload (1 commit)
- Nâng **112 helper/description texts** (`text-xs text-ink-soft|faint`) → `text-sm` trong 22 high-traffic files
- `text-xs` tổng: 1108 → ~996 (giảm noise, giữ label/badge/table/legal)

## Track 7 — Tăng font-serif brand accent (1 commit)
- Thêm `font-serif` (Playfair Display) vào **35 hero/display headings** trên 33 pages
- `font-serif` tổng: 22 → 52 (brand nổi bật ở page titles)

## Track 8 — Chuẩn hoá animate-fade-in (1 commit)
- Tailwind tokens: `fade-in-1`..`fade-in-6` (delay 0→0.2s, `both` fill-mode) để stagger
- Áp dụng stagger vào **11 StatCard grids** (thay fade đồng loạt)

## Files changed (UI/UX thực tế, loại trừ tooling)
**Config / tokens:**
- `tailwind.config.js` — type ramp + elevation + tap + stagger animation tokens
- `scripts/check-ui-tokens.mjs` — guard rule #5 (ban raw deep shadow)
- `scripts/ui-guard-allowlist.json` — cleared (0 legacy)

**Components mới / core:**
- `src/components/ui/Card.tsx` — elevation system + StatCard v2
- `src/components/ui/DataTable.tsx` (mới) — shared data table
- `src/components/ui/CommandPalette.tsx` (mới) — ⌘K palette
- `src/components/PortalOnboarding.tsx` (mới) — resident tour
- `src/components/DashboardStats.tsx` — migrate StatCard
- `src/components/layout/AdminLayout.tsx` — integrate ⌘K
- `src/components/ResidentPortalHost.tsx` — mount onboarding
- `src/components/PdfCanvasReader.tsx`, `src/components/crm/PdfViewerModal.tsx`, `src/pages/ActivityLogPage.tsx` — token-map pre-existing guard violations

**Pages migrated (StatCard + elevation + serif + stagger):**
- Finance: `DashboardPage, ManagementFeePage, FeeConfigPage, billing/UnifiedMonthlyView`
- CRM: `crm/CrmDashboardPage, crm/SalesMatrixPage, crm/CommissionPage, crm/RevenueReportPage, crm/PropertyTransferPage`
- Directory/Ops: `ApartmentsPage, NewsManagementPage, operations/ConstructionFitoutPage, ResidentPortalPage`
- Config: `config/PricingConfigTab`
- Track 1: `DebtDashboardPage, ResidentsPage, VehicleManagementPage, crm/ContractDocumentHubPage, crm/OverduePaymentsPage, operations/WarrantyManagementPage`
- 61 modal/overlay/page files: elevation token migration

## AI-tells đã loại bỏ (audit-driven)
| AI-tell | Trước | Sau |
|---|---|---|
| `font-['Inter']` | 13 | 0 |
| emoji icons trong JSX | có | 0 |
| raw `shadow-xl/2xl` | 94 chỗ / 61 files | 0 (token) |
| `text-xs` overload | 1108 | ~996 (giảm noise) |
| `font-serif` underused | 22 | 52 |
| `animate-fade-in` đồng loạt | 118 | stagger (fade-in-1..6) |

## Verify (thực tế, mọi bước)
- `npm run guard:ui` → **PASSED (0 vi phạm mới, 0 legacy)**
- `npx tsc --noEmit` → **0 error**
- `npm run build` → **PASS**

## Note
- 2 sub-agent (fan-out 1 ea) đều bị 429 rate-limit + truncate ở Track 1/3; phần còn lại tự hoàn thiện tuần tự (không dùng sub-agent để tránh hit limit).
- Đã loại bỏ rác tooling (`.hermes/skills/impeccable/*`, `skills-lock.json`, `.agents/*`) khỏi commit — không đẩy lên PR.
- Scope: chỉ front-end UI/UX. Backend D+ (48 modules, 451 tests) không đổi.
- **Chưa push**: repo không có remote. Cung cấp URL để `git remote add origin <url>` + `git push -u origin ui-ux-track1-track3` + tạo PR.
