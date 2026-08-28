# Phương án: Cư dân · Tài khoản · Căn hộ · Phương tiện (Giai đoạn 5b)

> Nhóm CRUD danh mục — chuẩn hoá theo 1 pattern "Directory" duy nhất để 4 trang đồng nhất.

## Trang bao phủ
| Route | File |
|---|---|
| `/admin/residents` | `ResidentsPage.tsx` |
| `/admin/resident_accounts` | `ResidentAccountsPage.tsx` |
| `/admin/apartments` | `ApartmentsPage.tsx` |
| `/admin/vehicles` | `VehicleManagementPage.tsx` |

## Hiện trạng → vấn đề
| Vấn đề | Vị trí |
|---|---|
| Nút hành động dùng emoji (✏️🗑️…) | ApartmentsPage.tsx:170,176,405,471… |
| Modal tự viết inline mỗi kiểu | các *Modal.tsx liên quan |
| Palette cũ + hex rải rác | cả 4 trang |

## Pattern "Directory" chung cho 4 trang

```
PageHeader (title + đếm bản ghi text-sm ink-soft + [Thêm mới primary])
├── Toolbar: Search (.form-input + icon) · Filter chips (toà/loại/trạng thái) · View toggle nếu cần
├── Table (ui/Table):
│   ├── Row: avatar-chip (chữ cái, bg-accent-soft) + tên chính + meta phụ text-xs ink-soft
│   ├── Cột dữ liệu định danh: font-mono (mã căn hộ, biển số, SĐT)
│   ├── StatusBadge semantic (Đang ở/Tạm vắng/Khóa…)
│   └── Hành động: icon-button ghost w-8 h-8 (Sửa ✏️→pencil SVG, Xoá 🗑️→trash SVG,
│       menu ⋯ nếu >3 hành động) — tooltip title + aria-label + cursor-pointer
├── Pagination: text-xs ink-soft "1–20 / 134" + prev/next icon-button
└── Empty state: EmptyState icon module + CTA "Thêm … đầu tiên"
```

### Chi tiết từng trang

**Residents**: filter nhóm theo toà/căn hộ; drawer chi tiết cư dân (ảnh đại diện, thông tin liên lạc mono, lịch sử căn hộ, thành viên hộ). Thêm/sửa → ui/Modal form 2 cột desktop.

**ResidentAccounts**: bảng tài khoản — trạng thái kích hoạt = switch component (accent khi bật, transition-colors); reset mật khẩu → useConfirm + toast; SĐT/username `font-mono`.

**Apartments**: 
- Hai view mode: Bảng (mặc định) ↔ Lưới sơ đồ toà (ô vuông như Sales Matrix CRM, tái dùng component) — toggle Segmented control
- Ô căn hộ tô theo trạng thái sở hữu/thuê; click mở drawer chi tiết (cư dân hiện tại + lịch sử phí nhanh)

**Vehicles**: biển số `font-mono font-semibold uppercase`; loại xe icon (car/motorbike SVG); badge hạn gửi xe hết hạn gần (<30 ngày) warning.

### Form chuẩn (Add/Edit mọi trang)
- Grid 2 cột ≥sm, 1 cột mobile; label trên input; trường bắt buộc đánh dấu * accent
- Validate on-blur + submit; lỗi inline `text-brand-danger text-xs` dưới field
- Submit: nút loading → toast success + đóng modal; lỗi giữ modal mở + toast danger

## Checklist riêng
- [ ] 0 emoji hành động — pencil/trash/dots từ icons.tsx; icon-button có aria-label
- [ ] Avatar chip + tên + meta thống nhất cả 4 trang
- [ ] Dữ liệu định danh font-mono; biển số uppercase
- [ ] Modal thêm/sửa/xoá qua ui/Modal + useConfirm (không window.confirm)
- [ ] Switch/badge trạng thái dùng token; contrast đạt
- [ ] Table overflow-x-auto; sticky header khi dài (>10 row)
- [ ] Pagination không giật layout (chiều cao cố định)
- [ ] Drawer chi tiết: ESC/backdrop đóng, focus trap
- [ ] Lọc chips: aria-pressed, số kết quả `text-ink-soft` (không ink-faint)
