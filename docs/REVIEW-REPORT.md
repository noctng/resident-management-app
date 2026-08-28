# BÁO CÁO REVIEW — Dự án Resident Management App

> **Chuẩn đánh giá:** Smart City Platform multi-agent (L0–L3, 20 agent)
> **Ngày review:** 2026-08-28
> **Người review:** CTO (L0) via Hermes Agent
> **Đối tượng:** `~/workspace/resident-management-app`

---

## Tóm tắt

- **Backend:** 123 file src · 41 routes · 44 controllers · 10 services · **0 repository**
- **Frontend:** 151 file src · build **PASS** (sau khi fix 2 lỗi TS2882 — xem mục 3)
- **Điểm yếu cốt lõi:**
  - Vi phạm Clean Architecture (DB query nằm trực tiếp trong controller)
  - Test coverage thấp (<80%), toolchain backend hỏng
  - Không có CI/CD
  - Schema DB chưa chuẩn hóa (UUID / soft-delete / migrations rỗng)
- **Điểm mạnh:** RBAC middleware tốt, audit log có, design token UI đúng chuẩn, khai báo API URL qua relative path.

---

## 1. ADVISOR-TECH (L1A) — Kiến trúc / API

| Tiêu chuẩn | Thực tế | Đánh giá |
|---|---|---|
| Clean Architecture: route→controller→service→repository | 0 repository; **44/44 controller chứa truy vấn DB trực tiếp** (prisma.x / pool.query) | 🔴 Critical |
| OpenAPI docs cập nhật | Không có file OpenAPI/swagger nào | 🔴 Thiếu |
| Ưu tiên DDD, API version `/api/v1` | API base `/api` (không versioning) | 🟡 |
| Idempotency / Redis lock cho booking | Không thấy | ⚪ Chưa xác nhận |

👉 Kiến trúc hiện tại là **"controller-thick"**, không đạt Clean Architecture. Mọi endpoint thực thi SQL trong controller → khó test, khó tái dùng.

---

## 2. EMP-BACKEND (L2) — Backend Developer

| Tiêu chuẩn | Thực tế | Đánh giá |
|---|---|---|
| Mọi mutation qua service layer | 🔴 Thất bại (DB nằm trong controller) | 🔴 |
| Validation Zod ở boundary | Có 4 schema (`src/schemas/*`) nhưng chỉ phủ 1 phần nhỏ routes | 🟡 |
| Unit test ≥ 80% logic nghiệp vụ | Chỉ **5 file test / 123 file src** (~46 test func) | 🔴 |
| Không hard-code secret | Đạt (env qua `process.env`; không tìm thấy secret thật) | ✅ |
| Không tự chạy migration | Backend không tự chạy, nhưng **migrations rỗng** (xem emp-database) | 🟡 |

**Toolchain thực tế:**
- `eslint` **FAIL** — `.eslintrc.cjs` không tương thích ESLint v10 đã cài (cần migrate sang `eslint.config.js`).
- `vitest run` **không chạy được** — thiếu native binding `rolldown` (optional dependency hỏng).

---

## 3. EMP-FRONTEND (L2) + EMP-UIUX (L2) — Frontend / UI

| Tiêu chuẩn emp-frontend | Thực tế | Đánh giá |
|---|---|---|
| Data fetching chỉ qua React Query | 🔴 `@tanstack/react-query` **không được cài**; dùng `fetch` trực tiếp ở 12 file (ngoài `api.ts`) | 🔴 |
| Zod schema chia sẻ backend | Có Zod backend, nhưng frontend không import chung | 🟡 |
| Không hard-code API URL (env var) | ✅ `API_BASE_URL = '/api'` (relative path) | ✅ |
| State đầy đủ: loading/empty/error/confirm | ⚪ Cần review sâu từng page | ⚪ |

**UI / emp-uiux (Quiet Luxury):**
- ✅ `tailwind.config.js` có design tokens đúng tinh thần: bg `#F2F3EF`, accent `#B8722E` (đồng), serif Playfair Display heading, spacing scale 4/8/12/16/24/32/48/64.
- ✅ `npm run guard:ui` có sẵn (gate UI).
- ⚠️ `guard:ui` hiện **FAIL** ở 3 file cũ vi phạm token (`PdfCanvasReader.tsx`, `PdfViewerModal.tsx`, `ActivityLogPage.tsx`) — cần refactor sau.

**Build thực tế:**
- Trước fix: 2 lỗi TS2882 (thiếu khai báo type cho CSS import).
- **Đã fix (2026-08-28):** thêm `/// <reference types="vite/client" />` vào `src/vite-env.d.ts` → `tsc --noEmit` = 0 error, `npm run build` = PASS.
- Lưu ý môi trường: `node_modules` được cài trên Windows → thiếu native binary Linux cho rollup; đã `npm install @rollup/rollup-linux-x64-gnu` để build chạy được trên Linux.

---

## 4. EMP-DATABASE (L2) — Database Engineer

| Tiêu chuẩn | Thực tế | Đánh giá |
|---|---|---|
| UUID primary key | 🔴 `schema.prisma` dùng `String @id @db.VarChar(255)`; `apartments.id` là sequence `'apt_'||lpad` | 🔴 |
| Soft delete `deleted_at` | 🔴 **0** xuất hiện trong schema.sql | 🔴 |
| Migration history (Prisma) | 🔴 **Thư mục `migrations/` rỗng** — schema chưa từng migrate qua Prisma | 🔴 |
| Foreign keys + ON DELETE rõ ràng | 27 FK trong schema.sql | 🟡 |
| Index cho FK / cột search | 22 index | 🟡 |
| audit_logs ghi mutation nhạy cảm | Có bảng `activity_logs` + `auditLogMiddleware.js` (10 file ref) | 🟡 |

---

## 5. EMP-SECURITY (L2) + ADVISOR-QA-SECURITY (L1C)

| Checklist bảo mật | Thực tế | Đánh giá |
|---|---|---|
| RBAC check ở middleware | ✅ `authMiddleware.js`: `authenticateToken` + `checkPermission` + `isAdmin` | ✅ |
| Auth bảo vệ routes | ✅ **40/41 route files** import middleware auth (duy nhất `webhookRoutes.js` không — hợp lý) | ✅ |
| IDOR (object-level auth) | ⚪ Chưa audit sâu từng endpoint; cần test ownership trên `/residents/:id`, `/invoices/:id` | ⚪ |
| Rate limit | 🟡 Chỉ **1 file** dùng `express-rate-limit` (có trong deps nhưng chưa phủ auth/booking/payment) | 🟡 |
| Secrets trong git | ✅ `.env` không commit (chỉ `.env.example`); `.env.production` chỉ URL/path | ✅ |
| SQL injection | ✅ Quét không thấy string-concat query nguy hiểm (dùng Prisma / parameterized) | ✅ |
| Audit log | 🟡 Có `activity_logs` + middleware | 🟡 |

---

## 6. EMP-QA (L2) — Test coverage

- Backend: **5 file test** (auth, billing, utilityAI, notification, residentDelete) → coverage **rất thấp** vs chuẩn ≥80%.
- Frontend: **5 file test** (ít).
- Toolchain test **bị hỏng** (rolldown binding thiếu) → **không thể chạy regression suite**.
- 🔴 **NO-GO** theo chuẩn advisor-qa-security nếu xét riêng tiêu chí test.

---

## 7. EMP-DEVOPS (L2) + CI/CD

| Tiêu chuẩn | Thực tế |
|---|---|
| CI: lint→test→build→security scan | 🔴 **Không có `.github/workflows`** (no CI) |
| docker-compose | 🟡 Có `docker-compose.yml` |
| Backup / restore drill | ⚪ Có script `db:backup`, chưa thấy runbook |

---

## 8. CÁC AGENT PHÂN TÍCH (L1B / emp-realestate / emp-resident / emp-ai)

- **advisor-product (L1B):** Không tìm thấy PRD / user-story documents trong repo (chỉ code, không có thư mục docs nghiệp vụ).
- **emp-ai:** Không thấy pgvector/RAG. Có `utilityAI.test.js` + `@n8n/chat` ở frontend (chat widget). Chưa rõ AI Assistant theo chuẩn (guardrail PII chéo hộ khẩu chưa xác nhận).
- **emp-realestate / emp-resident:** Domain đã implement rộng (CRM, residents, apartments, vehicles, complaints, announcements…) → nghiệp vụ phong phú, phù hợp phân tích.

---

## TỔNG KẾT ĐIỂM (theo chuẩn)

| Agent | Trạng thái | Mức độ |
|---|---|---|
| advisor-tech (L1A) | Kiến trúc controller-thick, thiếu repository | 🔴 Critical |
| emp-backend (L2) | Vi phạm Clean Arch, test <80% | 🔴 Critical |
| emp-database (L2) | Thiếu UUID, soft-delete, migrations rỗng | 🔴 High |
| emp-frontend (L2) | Thiếu React Query/Zustand (không cài) | 🔴 High |
| emp-qa (L2) | Test ít, toolchain hỏng | 🔴 High |
| emp-security (L2) | RBAC/audit OK, rate-limit thiếu | 🟡 Medium |
| emp-devops (L2) | Không có CI | 🟡 Medium |
| emp-uiux (L2) | Design tokens đúng chuẩn | ✅ Pass |
| CTO (L0) | Repo commit sạch, guard:UI có | ✅ Pass |

---

## KHUYẾN NGHỊƯ U TIÊN (cho CTO)

1. **🔴 P0 — Tái cấu trúc kiến trúc backend:** Tách DB query từ controller → service → repository (vi phạm nghiêm trọng nhất, ảnh hưởng mọi module).
2. **🔴 P0 — Sửa toolchain:** Cài đủ `rolldown` binding + migrate ESLint config (`.eslintrc.cjs` → `eslint.config.js`) để test/lint chạy được.
3. **🔴 P1 — Database:** Bổ sung soft-delete, chuẩn hóa ID (UUID hoặc sequence rõ ràng), tạo Prisma migrations.
4. **🔴 P1 — Frontend:** Quyết định có adopt React Query/Zustand không; nếu chuẩn bắt buộc → cài và refactor data fetching.
5. **🟡 P2 — CI/CD:** Thêm GitHub Actions (lint→test→build→security scan) theo chuẩn emp-devops.
6. **🟡 P2 — Security:** Phủ rate-limit lên auth/booking/payment; audit IDOR sâu.
7. **✅ Giữ nguyên:** Design tokens UI, RBAC middleware, audit log, khai báo API URL relative.

---

## LỊCH SỬ THAY ĐỔI

- **2026-08-28 (Phần A):** Fix 2 lỗi TS2882 bằng cách thêm `/// <reference types="vite/client" />` vào `src/vite-env.d.ts`. `npm run build` pass (commit `f6da672`). Cài `@rollup/rollup-linux-x64-gnu` bổ sung native binary Linux.
- **2026-08-28 (Phần B):** Tạo báo cáo này tại `docs/REVIEW-REPORT.md`.
