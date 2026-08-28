# Phương án: Portal Cư dân (Giai đoạn 4) — MẶT TIỀN THƯƠNG HIỆU

> Đây là bề mặt "quiet luxury" mạnh nhất: cư dân là khách hàng của khu đô thị cao cấp. Dùng serif display + whitespace rộng + ảnh kiến trúc thật.

## Trang bao phủ
| Route | File |
|---|---|
| `/*` login + chọn căn hộ | `ResidentPortalHost.tsx` (đặc biệt dòng 302–342 còn palette gray/blue cũ) |
| Portal chính 6 tabs | `ResidentPortalPage.tsx` (1344 dòng) — query `?tab=news/utilities/unified/amenities/feedback/handbook` GIỮ NGUYÊN |

## Hiện trạng → vấn đề
| Vấn đề | Vị trí |
|---|---|
| Login/chọn căn hộ dùng palette indigo/gray/blue-500 theme CŨ xung khắc brand | ResidentPortalHost.tsx:302–342 |
| Body class `bg-gray-100 dark:bg-gray-900` sót theme cũ | index.html |
| 1344 dòng 1 file, tab inline khó bảo trì (chỉ refactor UI, KHÔNG đổi contract ?tab=) | ResidentPortalPage.tsx |

## Phương án chi tiết

### 1) Màn hình đăng nhập (Host)
- Split-screen 50/50 desktop (stack mobile):
  - **Trái:** ảnh kiến trúc khu đô thị chất lượng cao (object-cover full-height, overlay `bg-gradient-to-t from-sidebar-bg/80`); trên overlay: wordmark `font-serif text-4xl text-white` "Thành Phố Cà Phê" + tagline `tracking-[0.25em] uppercase text-xs text-white/70`
  - **Phải:** `bg-bg` form giữa max-w-sm: heading `font-serif text-2xl text-ink` "Cổng thông tin cư dân"; input SĐT/mật khẩu `.form-input`; nút Đăng nhập `Button primary` full-width; link quên mật khẩu `text-accent`
- Loading submit: spinner trong nút + disable; lỗi: inline `text-brand-danger text-sm` + shake nhẹ 300ms (respect reduced-motion)
- Chọn căn hộ (sau auth nếu nhiều hộ): danh sách Card chọn được — mỗi card: mã căn `font-mono` + vai trò (Chủ hộ/Thành viên) + chevron; hover border-accent; selected ring-accent

### 2) Shell portal sau đăng nhập
- Top nav ngang mobile-first: logo nhỏ trái · 6 tab icon+label · avatar phải
- Active tab: icon+label `text-accent` với indicator chấm 4px dưới; container `sticky top-0 bg-surface/95 backdrop-blur-sm border-b border-brand-border`

### 3) Tab Tin tức (?tab=news) — pattern "Hero + Testimonials" từ skill
- Featured post: card lớn ảnh thật 16:9, category chip accent-soft, tiêu đề `font-serif text-xl`, ngày `text-xs ink-soft`
- Grid 2 cột bài phụ: thumbnail 4:3 + title 2 dòng clamp; hover: ảnh scale-[1.03] 400ms ease-out (transform KHÔNG đẩy layout vì overflow-hidden) + title chuyển accent
- Chi tiết bài: đọc trong drawer/modal max-w-2xl, typography article: leading-relaxed, h2 serif, img rounded-lg

### 4) Tab Tiện ích (?tab=utilities) — xem chi tiết `utilities-community.md`
### 5) Tab Hóa đơn (?tab=unified)
- Kỳ hiện tại: Card lớn — tổng cần trả `font-serif text-4xl` + breakdown accordion từng khoản (điện/nước/phí quản lý) + progress đã trả `bg-accent`
- QR SePay: khung trắng viền brand-border, mã căn dưới QR `font-mono`
- Lịch sử: list row-card gọn, badge trạng thái như admin
- CTA "Nhận hóa đơn PDF" giữ API puppeteer/pdfjs hiện tại

### 6) Tab Đặt tiện ích (?tab=amenities)
- Card tiện ích: ảnh/emoji-data trong chip avatar tròn `bg-accent-soft` (emoji do data — cho phép, render trong chip), tên, giá `font-mono`, nút Đặt (Button primary sm)
- Flow đặt: modal chọn giờ/số lượng → confirm → toast + mục "Đặt của tôi"

### 7) Tab Phản ánh (?tab=feedback)
- Nút "Gửi phản ánh" floating/dài: mở modal form (loại phản ánh select, nội dung textarea, đính kèm ảnh) — submit loading→toast
- Danh sách của tôi: StatusBadge tiến trình (Tiếp nhận→Xử lý→Hoàn tất) + timeline ngắn

### 8) Tab Cẩm nang (?tab=handbook)
- Nội dung từ config RichTextEditor: style article reader (max-w-prose mx-auto, h2 serif, table overflow-x-auto, img rounded)

## Checklist riêng
- [ ] Palette indigo/blue/gray trong ResidentPortalHost → token brand 100%
- [ ] Wordmark + heading lớn dùng font-serif Playfair Display (đã thêm ở 0.3)
- [ ] body index.html: bỏ `dark:bg-gray-900`, nền `bg-bg`
- [ ] Query `?tab=` KHÔNG đổi — chỉ restyle
- [ ] Ảnh hero/post: srcset responsive + lazy + alt; aspect-ratio cố định tránh CLS
- [ ] Hover ảnh scale bên trong overflow-hidden (không đẩy layout)
- [ ] Form đăng nhập: label htmlFor, autocomplete đúng (tel/current-password), lỗi inline rõ
- [ ] Chọn căn hộ: role aria-selected, Enter mở
- [ ] Mobile 375px: mọi tab usable, không scroll ngang, target ≥44px
- [ ] Toast/confirm thay mọi alert trong portal flow
- [ ] prefers-reduced-motion: tắt scale/pulse/shake
