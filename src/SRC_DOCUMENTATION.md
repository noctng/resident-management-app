# Tài Liệu Mô Tả Thư Mục `src`

> **Phiên bản:** 1.0  
> **Ngày tạo:** 28/01/2026  
> **Mục đích:** Tài liệu này mô tả chi tiết chức năng của từng file và thư mục trong thư mục `src` của ứng dụng Quản Lý Cư Dân.

---

## 📋 Mục Lục

- [Tổng Quan](#tổng-quan)
- [Files Gốc](#files-gốc)
- [Thư Mục Components](#thư-mục-components)
- [Thư Mục Pages](#thư-mục-pages)
- [Thư Mục Services](#thư-mục-services)
- [Thư Mục Types](#thư-mục-types)
- [Thư Mục Utils](#thư-mục-utils)

---

## 🎯 Tổng Quan

Thư mục `src` chứa toàn bộ mã nguồn frontend của ứng dụng Quản Lý Cư Dân, được xây dựng bằng React + TypeScript. Ứng dụng bao gồm hai phần chính:

- **Admin Portal**: Quản lý toàn bộ hệ thống (căn hộ, cư dân, hợp đồng, tiện ích, CRM)
- **Resident Portal**: Cổng thông tin dành cho cư dân

### Cấu Trúc Thư Mục

```
src/
├── App.tsx                 # Component gốc, định tuyến chính
├── index.tsx              # Entry point của ứng dụng
├── index.css              # Styles toàn cục
├── vite-env.d.ts          # Type definitions cho Vite
├── components/            # Các component tái sử dụng
│   ├── crm/              # Components cho module CRM
│   └── icons/            # Icon components
├── pages/                # Các trang chính của ứng dụng
│   └── crm/              # Pages cho module CRM
├── services/             # API service layer
├── types/                # TypeScript type definitions
├── utils/                # Utility functions
└── hooks/                # Custom React hooks (trống)
```

---

## 📄 Files Gốc

### `App.tsx`

**Chức năng:** Component gốc của ứng dụng, quản lý routing chính

**Nhiệm vụ:**

- Định tuyến giữa Admin Portal (`/`) và Resident Portal (`/resident-portal/*`)
- Import styles cho n8n chat integration
- Sử dụng React Router để điều hướng

**Routes:**

- `/resident-portal/*` → `ResidentPortalHost`
- `/*` → `AdminHost`

---

### `index.tsx`

**Chức năng:** Entry point của ứng dụng React

**Nhiệm vụ:**

- Khởi tạo React application
- Wrap app với `BrowserRouter` cho routing
- Render vào DOM element `#root`
- Enable React Strict Mode

---

### `index.css`

**Chức năng:** Global styles cho toàn bộ ứng dụng

**Nội dung:**

- Reset CSS mặc định
- Font family và base styles
- Color variables
- Layout utilities

---

### `vite-env.d.ts`

**Chức năng:** TypeScript type definitions cho Vite

**Nhiệm vụ:**

- Cung cấp type support cho Vite client APIs
- Import meta environment variables

---

## 🧩 Thư Mục Components

Chứa 45 component files và 2 thư mục con. Các components được chia thành các nhóm chức năng:

### 🏢 Admin & Layout Components

#### `AdminHost.tsx`

**Chức năng:** Container chính cho Admin Portal

**Nhiệm vụ:**

- Quản lý authentication và authorization
- Routing cho tất cả admin pages
- Sidebar navigation
- Permission-based access control
- State management cho toàn bộ admin features

**Routes quản lý:**

- Dashboard, Apartments, Residents, Utilities
- Amenities, Feedback, User Management
- Configuration, Activity Logs
- CRM Module, Unified Billing

---

#### `Sidebar.tsx`

**Chức năng:** Navigation sidebar cho Admin Portal

**Nhiệm vụ:**

- Hiển thị menu điều hướng
- Permission-based menu items
- Active route highlighting
- User info display
- Logout functionality

---

#### `ResidentPortalHost.tsx`

**Chức năng:** Container chính cho Resident Portal

**Nhiệm vụ:**

- Resident authentication
- Display apartment info
- Utility bills viewing
- Amenity booking
- Feedback submission
- n8n chatbot integration

---

### 🏠 Apartment Management Components

#### `AddApartmentModal.tsx`

**Chức năng:** Modal thêm căn hộ mới

**Fields:**

- House Type (CANTATA/TESLA)
- Code (mã căn hộ)
- Floor
- Area (diện tích)
- Electricity Type (RESIDENTIAL/BUSINESS)

---

#### `EditApartmentModal.tsx`

**Chức năng:** Modal chỉnh sửa thông tin căn hộ

**Features:**

- Pre-fill existing data
- Validation
- Update apartment info

---

#### `ApartmentDetail.tsx`

**Chức năng:** Hiển thị chi tiết căn hộ

**Thông tin hiển thị:**

- Thông tin cơ bản
- Danh sách cư dân đang ở
- Lịch sử tiện ích
- Trạng thái thanh toán

---

#### `ApartmentList.tsx`

**Chức năng:** Danh sách căn hộ dạng bảng

**Features:**

- Sortable columns
- Filter by house type
- Search functionality
- Quick actions (edit, view details)

---

#### `ApartmentResidentsModal.tsx`

**Chức năng:** Modal hiển thị danh sách cư dân của căn hộ

**Thông tin:**

- Resident name
- Relationship status (OWNER/FAMILY/TENANT)
- Contact info

---

### 👥 Resident Management Components

#### `AddResidentModal.tsx`

**Chức năng:** Modal thêm cư dân mới

**Fields:**

- Name, DOB, ID Number
- Phone, Email, Zalo ID
- Relationship Status
- Apartment assignment
- Amenity access permission

---

#### `EditResidentModal.tsx`

**Chức năng:** Modal chỉnh sửa thông tin cư dân

**Features:**

- Update personal info
- Change apartment assignment
- Toggle amenity access

---

#### `ResidentDetail.tsx`

**Chức năng:** Hiển thị chi tiết cư dân

**Thông tin:**

- Personal information
- Apartment occupancy
- Amenity usage history
- Account status

---

#### `ResidentList.tsx`

**Chức năng:** Danh sách cư dân dạng bảng

**Features:**

- Search by name/phone/ID
- Filter by status
- Quick actions

---

#### `ResidentApartmentsModal.tsx`

**Chức năng:** Modal hiển thị các căn hộ của cư dân

**Use case:** Cư dân có thể sở hữu/thuê nhiều căn hộ

---

### 💡 Utility Management Components

#### `AddUtilityRecordModal.tsx`

**Chức năng:** Modal thêm bản ghi tiện ích (điện, nước)

**Fields:**

- Apartment selection
- Month/Year
- Electricity: old reading, new reading
- Water: old reading, new reading
- Auto-calculate consumption and cost

---

#### `UtilityRecordDetailModal.tsx`

**Chức năng:** Modal chi tiết hóa đơn tiện ích

**Features:**

- Hiển thị breakdown chi phí điện/nước
- Hiển thị breakdown phí quản lý
- Payment status
- QR code thanh toán
- Send email reminder
- Mark as paid

---

#### `MonthlyInvoiceModal.tsx`

**Chức năng:** Modal hóa đơn tổng hợp hàng tháng

**Features:**

- Unified billing (utilities + management fees)
- Detailed breakdown
- Payment tracking
- Export invoice

---

### 🎯 Amenity Management Components

#### `AmenityManager.tsx`

**Chức năng:** Quản lý tiện ích chung cư

**Amenities:**

- Golf 3D, Horse Riding, Museum
- Zen Garden, Sauna, Archery
- Gym, Yoga

**Features:**

- View bookings by date
- Approve/cancel bookings
- Check-in via QR code

---

#### `BookAmenityModal.tsx`

**Chức năng:** Modal đặt tiện ích (cho cư dân)

**Features:**

- Select amenity type
- Choose date and time slot
- Validate availability
- Generate booking code

---

#### `BookingConfirmationModal.tsx`

**Chức năng:** Modal xác nhận đặt tiện ích

**Features:**

- Display booking details
- Show QR code for check-in
- Booking code display

---

#### `QRCodeModal.tsx`

**Chức năng:** Modal hiển thị QR code

**Use cases:**

- Amenity booking check-in
- Payment QR codes

---

#### `QRCodeScannerModal.tsx`

**Chức năng:** Modal quét QR code

**Use case:** Check-in tiện ích bằng QR scanner

---

#### `AmenityStats.tsx`

**Chức năng:** Widget thống kê sử dụng tiện ích

**Metrics:**

- Total bookings
- Most popular amenity
- Usage trends

---

### 💬 Feedback Management Components

#### `FeedbackDetailModal.tsx`

**Chức năng:** Modal chi tiết phản hồi từ cư dân

**Features:**

- View feedback content
- View attached images
- Admin response form
- Upload response images
- Mark as resolved

---

#### `FeedbackStats.tsx`

**Chức năng:** Widget thống kê phản hồi

**Metrics:**

- Total feedback
- Resolved vs pending
- Response time

---

### 👤 User Management Components

#### `AddUserModal.tsx`

**Chức năng:** Modal thêm user admin

**Fields:**

- Username
- Password
- Role (Admin/Amenity Manager)
- Permissions

---

#### `EditUserModal.tsx`

**Chức năng:** Modal chỉnh sửa user

**Features:**

- Update role
- Update permissions

---

#### `ChangeUserPasswordModal.tsx`

**Chức năng:** Modal đổi mật khẩu user (admin action)

---

#### `ChangePasswordModal.tsx`

**Chức năng:** Modal đổi mật khẩu (self-service)

**Fields:**

- Current password
- New password
- Confirm password

---

#### `PermissionSelector.tsx`

**Chức năng:** Component chọn permissions

**Permissions:**

- dashboard, apartments, residents
- utilities, amenities, feedback
- resident_accounts, users, configuration
- logs, crm, unified_billing

---

### 📊 Dashboard & Stats Components

#### `DashboardStats.tsx`

**Chức năng:** Widget thống kê tổng quan

**Metrics:**

- Total apartments
- Total residents
- Pending payments
- Active amenity bookings

---

#### `RecentActivityWidget.tsx`

**Chức năng:** Widget hoạt động gần đây

**Activities:**

- User actions
- System events
- Recent changes

---

### 🔧 Utility Components

#### `Modal.tsx`

**Chức năng:** Base modal component

**Features:**

- Reusable modal wrapper
- Close on overlay click
- Keyboard support (ESC)

---

#### `ListView.tsx`

**Chức năng:** Generic list view component

**Features:**

- Pagination
- Sorting
- Filtering

---

#### `SearchableSelect.tsx`

**Chức năng:** Dropdown với search functionality

**Use cases:**

- Apartment selection
- Resident selection
- Customer selection

---

#### `ImageViewerModal.tsx`

**Chức năng:** Modal xem ảnh full-size

**Features:**

- Zoom
- Navigation (prev/next)
- Close on overlay

---

#### `EmailPreviewModal.tsx`

**Chức năng:** Modal preview email trước khi gửi

**Use case:** Preview payment reminder emails

---

#### `BulkGenerateModal.tsx`

**Chức năng:** Modal tạo hàng loạt QR code thanh toán

**Features:**

- Select month/year
- Generate QR for all apartments
- Download as ZIP
- Save to selected folder

---

### 📄 CRM Components (`components/crm/`)

#### `ContractLifecycleTimeline.tsx`

**Chức năng:** Timeline hiển thị vòng đời hợp đồng

**Events:**

- DEPOSIT, SIGNED, AMENDED
- TRANSFERRED, CANCELLED
- COMPLETED, HANDOVER

---

#### `PaymentScheduleView.tsx`

**Chức năng:** Hiển thị lịch thanh toán hợp đồng

**Features:**

- Payment installments table
- Status tracking (PENDING/PAID/OVERDUE)
- Late fee calculation
- Send payment reminders
- Mark as paid

---

#### `HandoverChecklistView.tsx`

**Chức năng:** Checklist bàn giao căn hộ

**Features:**

- Required items tracking
- Completion status
- Notes for each item
- Handover eligibility check

---

#### `EarlyPaymentModal.tsx`

**Chức năng:** Modal thanh toán sớm với chiết khấu

**Features:**

- Calculate early payment discount
- Apply discount to payment
- Update payment schedule

---

#### `PaymentRestructureModal.tsx`

**Chức năng:** Modal tái cấu trúc lịch thanh toán

**Features:**

- Extend payment deadline
- Adjust installment amounts
- Requires approval workflow

---

#### `RevenueChart.tsx`

**Chức năng:** Biểu đồ doanh thu

**Metrics:**

- Monthly revenue
- Payment collection rate
- Overdue trends

---

#### `EmailPreviewModal.tsx` (CRM)

**Chức năng:** Preview email nhắc thanh toán CRM

**Features:**

- Preview email content
- Edit before sending
- Send to customer

---

### 🎨 Icons Components

#### `icons.tsx`

**Chức năng:** Tập hợp tất cả icon components

**Icons:**

- Navigation icons
- Action icons
- Status icons
- Amenity icons

---

## 📑 Thư Mục Pages

Chứa 16 page files và 1 thư mục con (`crm/`). Mỗi page tương ứng với một route trong ứng dụng.

### 🏠 Main Pages

#### `LoginPage.tsx`

**Route:** `/login`  
**Chức năng:** Trang đăng nhập

**Features:**

- Username/password authentication
- Role-based redirect
- Remember me
- Error handling

---

#### `DashboardPage.tsx`

**Route:** `/dashboard`  
**Chức năng:** Trang tổng quan admin

**Widgets:**

- DashboardStats
- RecentActivityWidget
- Quick actions
- System alerts

---

#### `ApartmentsPage.tsx`

**Route:** `/apartments`  
**Chức năng:** Quản lý căn hộ

**Features:**

- ApartmentList display
- Add/Edit/Delete apartments
- View apartment details
- Filter and search

---

#### `ResidentsPage.tsx`

**Route:** `/residents`  
**Chức năng:** Quản lý cư dân

**Features:**

- ResidentList display
- Add/Edit residents
- View resident details
- Apartment assignment

---

#### `UtilityPage.tsx`

**Route:** `/utilities`  
**Chức năng:** Quản lý tiện ích điện nước

**Features:**

- View utility records by month/year
- Add utility records
- View detailed invoices
- Send email reminders
- Mark payments as paid
- Generate QR codes
- Bulk QR generation

---

#### `UnifiedBillingPage.tsx`

**Route:** `/unified-billing`  
**Chức năng:** Quản lý hóa đơn tổng hợp (điện + nước + phí quản lý)

**Features:**

- Unified view of all charges
- Monthly/History toggle
- Detailed invoice modal
- Payment tracking
- Debt summary

---

#### `ManagementFeePage.tsx`

**Route:** `/management-fees`  
**Chức năng:** Quản lý phí quản lý

**Features:**

- View management fee invoices
- Generate monthly fees
- Payment tracking
- Fee breakdown

---

#### `FeeConfigPage.tsx`

**Route:** `/fee-config`  
**Chức năng:** Cấu hình phí dịch vụ

**Features:**

- Set management fee per sqm
- Set service fees (internet, cable TV, parking, etc.)
- Enable/disable fee types
- Effective date management
- Fee history tracking

---

#### `AmenityPage.tsx`

**Route:** `/amenities`  
**Chức năng:** Quản lý tiện ích chung cư

**Features:**

- View bookings by date
- Approve/cancel bookings
- QR code check-in
- Amenity statistics

---

#### `FeedbackManagementPage.tsx`

**Route:** `/feedback`  
**Chức năng:** Quản lý phản hồi cư dân

**Features:**

- View all feedback
- Filter by status
- Respond to feedback
- Upload response images
- Mark as resolved

---

#### `ResidentAccountsPage.tsx`

**Route:** `/resident-accounts`  
**Chức năng:** Quản lý tài khoản cư dân

**Features:**

- View resident accounts
- Reset passwords
- Enable/disable accounts

---

#### `UserManagementPage.tsx`

**Route:** `/users`  
**Chức năng:** Quản lý user admin

**Features:**

- Add/Edit/Delete users
- Assign roles and permissions
- Change passwords

---

#### `ConfigurationPage.tsx`

**Route:** `/configuration`  
**Chức năng:** Cấu hình hệ thống

**Features:**

- Pricing configuration (electricity, water)
- n8n webhook URL for chatbot
- System settings
- Pricing history

---

#### `ActivityLogPage.tsx`

**Route:** `/logs`  
**Chức năng:** Nhật ký hoạt động hệ thống

**Features:**

- View all system activities
- Filter by user, action, target type
- Search by details
- Export logs

---

#### `DebtDashboardPage.tsx`

**Route:** `/debt-dashboard`  
**Chức năng:** Dashboard công nợ

**Features:**

- Debt summary by apartment
- Overdue payments tracking
- Debt aging analysis
- Export debt reports

---

#### `ResidentPortalPage.tsx`

**Route:** `/resident-portal`  
**Chức năng:** Cổng thông tin cư dân

**Features:**

- View apartment info
- View utility bills
- Book amenities
- Submit feedback
- n8n chatbot integration
- Change password

---

### 💼 CRM Pages (`pages/crm/`)

#### `CrmDashboardPage.tsx`

**Route:** `/crm/dashboard`  
**Chức năng:** Dashboard CRM

**Metrics:**

- Total contracts
- Revenue statistics
- Payment collection rate
- Overdue contracts

---

#### `CustomerListPage.tsx`

**Route:** `/crm/customers`  
**Chức năng:** Danh sách khách hàng

**Features:**

- Add/Edit customers
- View customer details
- Search and filter
- Convert to resident

---

#### `CustomerDetailPage.tsx`

**Route:** `/crm/customers/:id`  
**Chức năng:** Chi tiết khách hàng

**Features:**

- Customer information
- Contract history
- Payment history
- Convert to resident action

---

#### `ContractListPage.tsx`

**Route:** `/crm/contracts`  
**Chức năng:** Danh sách hợp đồng

**Features:**

- View all contracts
- Filter by status
- Search by contract code
- Quick actions

---

#### `ContractDetailPage.tsx`

**Route:** `/crm/contracts/:id`  
**Chức năng:** Chi tiết hợp đồng

**Features:**

- Contract information
- Payment schedule
- Lifecycle timeline
- Handover checklist
- Document management
- Contract actions (transfer, cancel, amend)

---

#### `ApprovalQueuePage.tsx`

**Route:** `/crm/approvals`  
**Chức năng:** Hàng đợi phê duyệt

**Features:**

- View pending approvals
- Approve/reject requests
- Request types: EXTENSION, DISCOUNT, TRANSFER, CANCELLATION

---

#### `OverduePaymentsPage.tsx`

**Route:** `/crm/overdue`  
**Chức năng:** Thanh toán quá hạn

**Features:**

- View overdue payments
- Send reminders
- Late fee tracking
- Payment restructure

---

#### `RevenueReportPage.tsx`

**Route:** `/crm/revenue`  
**Chức năng:** Báo cáo doanh thu

**Features:**

- Revenue charts
- Monthly/yearly comparison
- Payment collection analysis
- Export reports

---

## 🌐 Thư Mục Services

### `api.ts`

**Chức năng:** API service layer - Centralized HTTP client

**Class:** `ApiService`

**Methods:**

- `get<T>(endpoint, params?)` - GET request
- `post<T>(endpoint, body?)` - POST request
- `put<T>(endpoint, body?)` - PUT request
- `delete<T>(endpoint)` - DELETE request
- `upload<T>(endpoint, formData)` - File upload
- `download(endpoint, data?)` - File download (returns Blob)

**Features:**

- Automatic JSON parsing
- Error handling
- Query parameter building
- Credentials included (cookies)
- Base URL configuration (`/api`)

**Export:** `api` instance

**Usage example:**

```typescript
import { api } from '../services/api';

const apartments = await api.get<Apartment[]>('/apartments');
await api.post('/apartments', { code: 'A101', floor: 1 });
```

---

## 📘 Thư Mục Types

### `index.ts`

**Chức năng:** TypeScript type definitions cho toàn bộ ứng dụng

**Type Categories:**

#### Core Types

- `Resident` - Cư dân
- `Apartment` - Căn hộ
- `Occupancy` - Quan hệ cư dân-căn hộ
- `User` - Admin user
- `Permission` - Quyền hạn

#### Utility Types

- `UtilityUsage` - Sử dụng điện/nước
- `UtilityRecord` - Bản ghi tiện ích
- `PricingTier` - Bậc giá
- `PricingConfig` - Cấu hình giá
- `PricingHistory` - Lịch sử thay đổi giá

#### Amenity Types

- `AmenityType` - Loại tiện ích
- `AmenityUsage` - Đặt tiện ích
- `AmenityBookingData` - Dữ liệu đặt tiện ích

#### Feedback Types

- `Feedback` - Phản hồi
- `FeedbackSubmissionData` - Dữ liệu gửi phản hồi

#### Activity Types

- `ActivityLog` - Nhật ký hoạt động

#### Management Fee Types

- `FeeConfig` - Cấu hình phí
- `ManagementFee` - Phí quản lý
- `ManagementFeeSummary` - Tổng hợp phí
- `BulkGenerateResult` - Kết quả tạo hàng loạt

#### CRM Types

- `Customer` - Khách hàng
- `Contract` - Hợp đồng
- `ContractPayment` - Thanh toán hợp đồng
- `ContractDocument` - Tài liệu hợp đồng
- `ContractLifecycleEvent` - Sự kiện vòng đời
- `PaymentSchedule` - Lịch thanh toán
- `HandoverChecklistItem` - Mục checklist bàn giao
- `ApprovalWorkflow` - Quy trình phê duyệt
- `ContractFinancialSummary` - Tổng hợp tài chính

#### Resident Account Types

- `ResidentAccountInfo` - Thông tin tài khoản cư dân

**Total:** 30+ type definitions

---

## 🛠️ Thư Mục Utils

### `formatters.ts`

**Chức năng:** Utility functions cho formatting

**Functions:**

#### `formatDate(date)`

**Mục đích:** Format date sang định dạng Việt Nam (dd/MM/yyyy)

**Input:** `string | Date | null | undefined`  
**Output:** `string` (e.g., "28/01/2026")

**Example:**

```typescript
formatDate('2026-01-28'); // "28/01/2026"
formatDate(null); // "-"
```

---

#### `formatDateTime(date)`

**Mục đích:** Format datetime sang định dạng Việt Nam (dd/MM/yyyy HH:mm)

**Input:** `string | Date | null | undefined`  
**Output:** `string` (e.g., "28/01/2026 15:30")

**Example:**

```typescript
formatDateTime('2026-01-28T15:30:00'); // "28/01/2026 15:30"
```

---

#### `formatCurrency(amount)`

**Mục đích:** Format số tiền sang định dạng VND

**Input:** `number | string | null | undefined`  
**Output:** `string` (e.g., "1.000.000 ₫")

**Example:**

```typescript
formatCurrency(1000000); // "1.000.000 ₫"
formatCurrency(null); // "0 ₫"
```

---

#### `formatNumber(num)`

**Mục đích:** Format số với dấu phân cách hàng nghìn

**Input:** `number | string | null | undefined`  
**Output:** `string` (e.g., "1.000.000")

**Example:**

```typescript
formatNumber(1000000); // "1.000.000"
formatNumber(null); // "0"
```

---

## 🔗 Thư Mục Hooks

**Trạng thái:** Hiện tại trống

**Mục đích:** Chứa custom React hooks trong tương lai

**Ví dụ hooks có thể thêm:**

- `useAuth()` - Authentication hook
- `usePermissions()` - Permission checking
- `useDebounce()` - Debounce input
- `usePagination()` - Pagination logic

---

## 📊 Thống Kê Tổng Quan

| Loại                  | Số lượng             |
| --------------------- | -------------------- |
| **Total Files**       | 73                   |
| **Components**        | 52 (45 main + 7 CRM) |
| **Pages**             | 24 (16 main + 8 CRM) |
| **Services**          | 1                    |
| **Type Definitions**  | 30+                  |
| **Utility Functions** | 4                    |
| **Hooks**             | 0 (empty)            |

---

## 🎯 Luồng Hoạt Động Chính

### 1. Authentication Flow

```
index.tsx → App.tsx → AdminHost/ResidentPortalHost → LoginPage
                    ↓
              Check authentication
                    ↓
              Redirect to Dashboard/Portal
```

### 2. Admin Management Flow

```
AdminHost → Sidebar → Select Page → Load Data (api.ts)
                                   ↓
                            Display Components
                                   ↓
                            User Actions (Modals)
                                   ↓
                            Update via API
                                   ↓
                            Refresh Data
```

### 3. Resident Portal Flow

```
ResidentPortalHost → Login → View Bills/Book Amenities/Submit Feedback
                                   ↓
                            API Calls (api.ts)
                                   ↓
                            Display Results
```

### 4. CRM Flow

```
CRM Dashboard → Customer/Contract Management
                    ↓
            Payment Tracking & Lifecycle
                    ↓
            Approval Workflows
                    ↓
            Revenue Reports
```

---

## 🔐 Permission System

Các quyền được định nghĩa trong `types/index.ts`:

| Permission          | Mô tả                    |
| ------------------- | ------------------------ |
| `dashboard`         | Xem dashboard            |
| `apartments`        | Quản lý căn hộ           |
| `residents`         | Quản lý cư dân           |
| `utilities`         | Quản lý tiện ích         |
| `amenities`         | Quản lý tiện ích chung   |
| `feedback`          | Quản lý phản hồi         |
| `resident_accounts` | Quản lý tài khoản cư dân |
| `users`             | Quản lý user admin       |
| `configuration`     | Cấu hình hệ thống        |
| `logs`              | Xem nhật ký              |
| `crm`               | Module CRM               |
| `unified_billing`   | Hóa đơn tổng hợp         |

---

## 🚀 Tech Stack

- **Framework:** React 18
- **Language:** TypeScript
- **Routing:** React Router v6
- **Styling:** CSS (index.css)
- **Build Tool:** Vite
- **HTTP Client:** Fetch API (wrapped in api.ts)
- **Chat Integration:** @n8n/chat

---

## 📝 Naming Conventions

### Files

- **Components:** PascalCase (e.g., `AddApartmentModal.tsx`)
- **Pages:** PascalCase with "Page" suffix (e.g., `DashboardPage.tsx`)
- **Services:** camelCase (e.g., `api.ts`)
- **Types:** camelCase (e.g., `index.ts`)
- **Utils:** camelCase (e.g., `formatters.ts`)

### Code

- **Interfaces:** PascalCase (e.g., `Apartment`, `Resident`)
- **Functions:** camelCase (e.g., `formatDate`, `formatCurrency`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)

---

## 🔄 State Management

**Current:** Component-level state with React hooks (`useState`, `useEffect`)

**Data Flow:**

1. Page components fetch data via `api.ts`
2. Pass data to child components via props
3. Child components emit events via callbacks
4. Parent updates state and re-fetches if needed

**Future considerations:**

- Context API for global state
- Redux/Zustand for complex state management

---

## 🎨 UI/UX Patterns

### Modals

- Consistent modal structure using `Modal.tsx` base
- Form validation
- Loading states
- Error handling

### Tables

- Sortable columns
- Pagination
- Search/filter
- Row actions

### Forms

- Controlled inputs
- Validation feedback
- Submit/cancel actions
- Loading states

---

## 📱 Responsive Design

- Desktop-first approach
- Mobile-friendly layouts
- Responsive tables
- Touch-friendly buttons

---

## 🔍 Search & Filter

**Implemented in:**

- ApartmentList (by code, house type)
- ResidentList (by name, phone, ID)
- CustomerList (by name, phone)
- ContractList (by contract code, status)
- FeedbackList (by status)
- ActivityLog (by user, action, target)

---

## 📧 Email Integration

**Features:**

- Payment reminders (utilities + management fees)
- Email preview before sending
- Template-based emails
- Batch email sending

**Components:**

- `EmailPreviewModal.tsx`
- `crm/EmailPreviewModal.tsx`

---

## 💳 Payment Features

**QR Code Generation:**

- Individual QR codes for payments
- Bulk QR generation
- VietQR standard

**Payment Tracking:**

- Payment status (PENDING/PAID/OVERDUE)
- Payment history
- Late fee calculation
- Early payment discounts

---

## 📈 Reporting & Analytics

**Dashboards:**

- Admin Dashboard (overall stats)
- CRM Dashboard (sales & revenue)
- Debt Dashboard (collections)

**Reports:**

- Revenue reports
- Overdue payments
- Amenity usage
- Feedback statistics

---

## 🔒 Security Considerations

**Authentication:**

- Session-based auth (cookies)
- Credentials included in API calls

**Authorization:**

- Permission-based access control
- Route guards
- Component-level permission checks

**Data Validation:**

- Client-side validation
- Server-side validation (backend)

---

## 🐛 Error Handling

**API Errors:**

- Centralized error handling in `api.ts`
- User-friendly error messages
- Error logging

**UI Errors:**

- Try-catch blocks in async operations
- Error state display
- Fallback UI

---

## 🧪 Testing Considerations

**Recommended:**

- Unit tests for utility functions
- Component tests for reusable components
- Integration tests for critical flows
- E2E tests for user journeys

**Tools:**

- Jest for unit tests
- React Testing Library for component tests
- Playwright/Cypress for E2E tests

---

## 📦 Dependencies

**Main:**

- react
- react-dom
- react-router-dom
- @n8n/chat

**Dev:**

- typescript
- vite
- @types/react
- @types/react-dom

---

## 🚧 Future Enhancements

**Suggested:**

1. Add custom hooks for common logic
2. Implement global state management
3. Add loading skeletons
4. Improve error boundaries
5. Add unit tests
6. Optimize bundle size
7. Add PWA support
8. Implement real-time updates (WebSocket)

---

## 📞 Support & Maintenance

**Code Organization:**

- Clear separation of concerns
- Reusable components
- Type safety with TypeScript
- Consistent naming conventions

**Documentation:**

- Inline comments for complex logic
- Type definitions for all data structures
- This documentation file

---

## 📅 Version History

| Version | Date       | Changes               |
| ------- | ---------- | --------------------- |
| 1.0     | 28/01/2026 | Initial documentation |

---

**Tài liệu này được tạo tự động bởi AI Assistant**  
**Cập nhật lần cuối:** 28/01/2026
