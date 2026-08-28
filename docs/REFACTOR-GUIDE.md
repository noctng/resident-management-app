# REFACTOR GUIDE — Clean Architecture cho Backend

> **Mục đích:** Hướng dẫn refactor các module backend còn lại (43 controller) sang kiến trúc
> **route → controller → service → repository** theo chuẩn `emp-backend` / `advisor-tech`.
> **Template chuẩn:** module `announcements` đã refactor (xem `backend/src/{routes,controllers,services,repositories,schemas}/announcement*.js`).

---

## 1. Tại sao refactor

Review theo khung Smart City Platform phát hiện: **44/44 controller chứa truy vấn DB trực tiếp**
(`prisma.x` / `pool.query`), vi phạm nghiêm trọng Clean Architecture. Hậu quả:
- Khó test (logic nghiệp vụ lẫn với I/O)
- Không tái dùng query
- Vi phạm separation of duties (controller không được tự truy cập DB)

Module `announcements` là **template tham chiếu** — copy cấu trúc này cho mọi module khác.

---

## 2. Cấu trúc chuẩn (4 lớp)

```
backend/src/
├── routes/<module>Routes.js        # chỉ định tuyến + auth + validate(Zod)
├── controllers/<module>Controller.js  # MỎNG: parse req → gọi service → res
├── services/<module>Service.js     # nghiệp vụ (validation, file I/O, gọi repo/push)
├── repositories/<module>Repository.js  # CHỈ prisma query (CRUD)
├── schemas/<module>Schemas.js      # Zod validation (boundary)
└── tests/<module>.test.mjs         # unit test service (vitest, ESM)
```

**Quy tắc vàng:**
- Controller **KHÔNG** import `prisma` hay `../config/prisma`.
- Service **KHÔNG** viết SQL/Prisma query trực tiếp → gọi `repo.*`.
- Repository **KHÔNG** chứa `if` nghiệp vụ, file I/O, push → chỉ `prisma.<model>.*`.

---

## 3. Quy tắc bảo toàn (KHÔNG break frontend)

Khi refactor module cũ:
- [ ] Giữ nguyên **mọi route path** (`GET /api/x`, `POST /api/x/:id`, ...)
- [ ] Giữ nguyên **HTTP method** và **response shape** (vd: list trả `{ data, total }`)
- [ ] Giữ nguyên **tên export** controller (`exports.getList`, `exports.create`, ...) để `routes/*.js` không đổi import
- [ ] Giữ nguyên **status code** (`201` create, `204` delete, `400/404` lỗi)
- [ ] **KHÔNG đổi DB schema** (thuộc quyền `emp-database` + CTO approve)

---

## 4. Quy trình refactor (theo template announcements)

Thực hiện tuần tự, **mỗi bước 1 commit**:

### Bước 1 — Repository (mới)
Tạo `repositories/<module>Repository.js`. Chỉ chứa các hàm prisma thuần:
```js
const prisma = require('../config/prisma');

async function list(where = {}, opts = {}) {
  return prisma.<model>.findMany({ where, ...opts });
}
async function getById(id) {
  return prisma.<model>.findUnique({ where: { id } });
}
async function create(data) {
  return prisma.<model>.create({ data });
}
async function update(id, data) {
  return prisma.<model>.update({ where: { id }, data });
}
async function remove(id) {
  return prisma.<model>.delete({ where: { id } });
}
module.exports = { list, getById, create, update, remove };
```

### Bước 2 — Zod schema (mới)
Tạo `schemas/<module>Schemas.js`:
```js
const { z } = require('zod');
const createSchema = z.object({ /* ... */ });
const updateSchema = createSchema.partial();
module.exports = { createSchema, updateSchema };
```

### Bước 3 — Service (mới)
Tạo `services/<module>Service.js`. Chuyển MỌI logic từ controller cũ vào đây:
- Validation nghiệp vụ, tính toán, mapping DTO → entity
- File I/O (vd: `saveImage`) → để trong service, KHÔNG để controller
- Gọi side-effect (push/email) qua **object** (vd: `pushService.sendX()`), KHÔNG destructure:
  ```js
  const pushService = require('./pushService'); // ✅ đúng
  // const { sendX } = require('./pushService'); // ❝ không spy được trong test
  ```
- Throw lỗi kèm `err.status` để controller format response:
  ```js
  const e = new Error('Không tìm thấy'); e.status = 404; throw e;
  ```

### Bước 4 — Controller (ghi đè, mỏng)
```js
const svc = require('../services/<module>Service');

exports.getById = async (req, res) => {
  try {
    const item = await svc.getById(req.params.id);
    res.json(item);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Lỗi máy chủ' });
  }
};
```

### Bước 5 — Route (sửa: gắn validate)
```js
const validate = require('../middleware/validate');
const { createSchema } = require('../schemas/<module>Schemas');
router.post('/', authenticateToken, checkPermission('<perm>'),
  express.json({ limit: '10mb' }), validate(createSchema), ctrl.create);
```

### Bước 6 — Test (mới, `.mjs`)
Xem `tests/announcement.test.mjs`. **Bắt buộc dùng `.mjs` (ESM)** vì vitest v4 không hỗ trợ
`require('vitest')` trong file `.js`. Mock Prisma bằng `createRequire` + `vi.spyOn` (xem mục 6).

---

## 5. Checklist tuân thủ chuẩn agent

- [ ] **advisor-tech**: Có repository layer? (route→controller→service→repository)
- [ ] **emp-backend**: Mọi mutation qua service? Không `prisma` trong controller?
- [ ] **emp-backend**: Zod validation ở boundary (route)?
- [ ] **emp-qa**: Unit test service ≥ 80% logic nghiệp vụ, pass trên vitest?
- [ ] **emp-security**: Auth (`authenticateToken` + `checkPermission`) giữ nguyên trên mọi admin route?
- [ ] **emp-database**: Không đổi schema/SQL DDL (chỉ dùng model đã có)?

---

## 6. LƯU Ý MÔI TRƯỜNG (quan trọng)

Backend chạy trên **Linux** nhưng `node_modules` được cài trên **Windows** → đã xảy ra các lỗi sau,
đã được fix một lần cho module announcements. Khi refactor module mới, đảm bảo:

1. **Native binding rolldown** (để vitest chạy):
   ```bash
   cd backend && npm install @rolldown/binding-linux-x64-gnu --no-save
   ```
2. **Prisma Client generate cho Linux** — `schema.prisma` đã có:
   ```prisma
   generator client {
     provider      = "prisma-client-js"
     binaryTargets = ["native", "debian-openssl-3.0.x"]
   }
   ```
   Nếu chưa generate hoặc đổi schema: `node node_modules/prisma/build/index.js generate`
   (dùng `node` trực tiếp vì `npx prisma` bị Permission denied trên máy này).
3. **Test file phải là `.mjs`** (vitest v4 + ESM). Không dùng `require('vitest')`.
4. **Mock Prisma đúng cách** (ESM/CJS interop): Dùng `createRequire` lấy singleton thật rồi `vi.spyOn`:
   ```js
   import { createRequire } from 'module';
   const require = createRequire(import.meta.url);
   const realPrisma = require('../config/prisma');
   const a = realPrisma.<model>;
   // trong test: vi.spyOn(a, 'findMany').mockResolvedValue(...)
   ```
   ⚠️ KHÔNG dùng `vi.mock('../config/prisma', ...)` — không intercept được CJS `require`
   bên trong module CJS khác (dual-registry limitation của vitest v4).
5. **Side-effect async** (push/email fire-and-forget): trong test dùng
   `await new Promise((r) => setImmediate(r));` trước khi assert spy được gọi.

---

## 7. Thứ tự đề xuất refactor các module còn lại

Ưu tiên module nhỏ, ít phụ thuộc trước (giống announcements):
1. `announcement` ✅ (done — template)
2. `vehicle`, `feedback`, `amenity` (đơn giản)
3. `resident`, `apartment` (lõi, lớn)
4. `contract`, `crm*`, `billing`, `utility` (phức tạp, nhiều cross-module)

Mỗi module: 1 PR riêng, qua gate review (advisor-tech → emp-security → advisor-qa-security → CTO).

---

## 8. Lệnh nhanh

```bash
cd backend
# chạy test 1 module
npx vitest run src/tests/<module>.test.mjs
# chạy toàn bộ
npx vitest run
# syntax check (parse-only, không cần Prisma)
node --check src/services/<module>Service.js
```

---

*Template reference: commit `6af4843` (repo+service+schema), `0d0f341` (controller+route),
`6201a2c` (test). Xem `docs/REVIEW-REPORT.md` để biết context review ban đầu.*
