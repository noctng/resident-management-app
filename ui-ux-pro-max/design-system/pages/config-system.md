# Phương án: Hệ thống — Login NV · Users · Configuration · Logs (Giai đoạn 7)

## Trang bao phủ
| Route | File |
|---|---|
| `/admin/login` | `LoginPage.tsx` |
| `/admin/users` | `UserManagementPage.tsx` |
| `/admin/configuration` (9 tab) | `ConfigurationPage.tsx` + `config/*.tsx` (AI, Email, SePay, VNPT Invoice, Handbook…) |
| `/admin/logs` | `ActivityLogPage.tsx` |

## Hiện trạng → vấn đề
| Vấn đề | Vị trí |
|---|---|
| Login dùng gradient teal/sky/rose theme cũ | LoginPage.tsx (toàn file) |
| 119 hex hardcoded — đỉnh điểm dự án | SePayConfigTab.tsx |
| alert() ×14 + ×7 | AdminHost.tsx, UserManagementPage.tsx |
| Palette cũ | RichTextEditor.tsx, HandbookConfigTab.tsx, VnptInvoiceConfigTab.tsx |

## Phương án chi tiết

### 1) LoginPage nhân viên
- Full-screen split như Portal nhưng đảo chiều nhấn mạnh: nền trái `bg-sidebar-bg` teal đen (thương hiệu nội bộ), wordmark serif trắng + "QUẢN TRỊ" tracking rộng
- Form phải trên bg-bg; input mật khẩu có toggle eye (eye/eye-off SVG); lỗi sai thông tin: inline danger + rung nhẹ
- Loading: spinner nút; nhớ tôi: checkbox accent; phiên hết hạn redirect giữ nguyên API
- ❌ Xoá toàn bộ gradient sky/rose/blue → 1 màu thương hiệu duy nhất

### 2) UserManagementPage
- Pattern Directory (xem residents-apartments.md): bảng NV — avatar chip + tên + email mono; vai trò Badge (Admin=accent-soft/accent-ink, Kỹ thuật=secondary/15, Kế toán=warning/15…)
- Phân quyền: drawer danh sách quyền theo nhóm với switch; lưu → toast
- Vô hiệu hoá tài khoản: useConfirm danger; tài khoản bị khoá row mờ opacity-60 + badge "Đã khoá"

### 3) ConfigurationPage — 9 tab
- **Shell cấu hình mới**: sidebar phụ dọc trái (w-56, list nav dọc: icon + label, active `bg-accent-soft text-accent-ink rounded-lg`) desktop; mobile = select dropdown
- Mỗi tab là 1 form section Card: heading mô tả ngắn + form controls chuẩn
- Trạng thái kết nối dịch vụ (SePay/VNPT/Email/AI): hàng status đầu card — dot (success=đã kết nối/warning=chưa test/danger=lỗi) + nút "Kiểm tra kết nối" secondary → loading → toast kết quả
- **SePayConfigTab** (119 hex!): rewrite token toàn bộ; các trường secret/API key: input password + nút reveal + nút copy (clipboard SVG, toast "Đã sao chép"); masked `••••1234`
- HandbookConfigTab/VNPT tab: giữ logic, restyle form + table theo pattern chung
- Nút Lưu mỗi section: sticky bottom bar trong card khi dirty ("Có thay đổi chưa lưu" + [Hoàn tác] [Lưu primary]) — dirty tracking qua form state hiện có

### 4) ActivityLogPage
- Filter bar: khoảng ngày (date inputs) · người thực hiện · loại hành động (chips)
- Timeline bảng: thời gian mono text-xs · actor avatar chip + tên · hành động (verb chip màu theo loại: tạo=success, sửa=warning, xoá=danger, đăng nhập=neutral) · đối tượng
- Virtualize nếu >200 dòng (web guideline) hoặc phân trang server-side giữ nguyên API
- Export CSV giữ API

## Checklist riêng
- [ ] LoginPage: 0 palette cũ, 1 ngôn ngữ thương hiệu; password toggle + autocomplete đúng
- [ ] Config shell: nav dọc nhất quán, deep-link tab giữ contract route hiện tại
- [ ] Secret fields: masked mặc định + reveal + copy, KHÔNG log giá trị ra console
- [ ] Sticky save-bar chỉ hiện khi dirty; Hoàn tác restore giá trị ban đầu
- [ ] Connection status: dot màu + text rõ, test connection có loading→toast
- [ ] UserManagement: alert() ×7 → toast/confirm; row khoá có style phân biệt
- [ ] Logs: verb chip màu semantic; timestamp mono; filter áp dụng không reload trang
- [ ] SePayConfigTab: audit grep còn 0 hex literal
- [ ] Mọi tab config responsive: mobile stack 1 cột, nav thành dropdown
