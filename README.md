# Resident Management Full-Stack App

Đây là một ứng dụng full-stack để quản lý cư dân và căn hộ, bao gồm một frontend React (sử dụng Vite) và một backend Node.js (sử dụng Express).

## Cấu Trúc Thư Mục

- `/`: Chứa mã nguồn của frontend (React, Vite, TypeScript).
- `/backend`: Chứa mã nguồn của backend (Node.js, Express).

## Hướng Dẫn Cài Đặt và Chạy

Bạn sẽ cần mở hai cửa sổ terminal để chạy đồng thời cả frontend và backend.

### 1. Cài Đặt Backend

- **Bước 1:** Di chuyển vào thư mục backend:
  ```bash
  cd backend
  ```
- **Bước 2:** Cài đặt các gói phụ thuộc:
  ```bash
  npm install
  ```
- **Bước 3:** Thiết lập database và file `.env` như hướng dẫn trong file `backend/README.md`.
- **Bước 4 (Quan trọng):** Nếu bạn đã cài đặt database trước đó, hãy chạy các script cập nhật (`database_update_v2.sql`, `database_update_v3.sql`, `database_update_v4.sql`, `database_update_v5.sql`, etc.) để thêm các trường và bảng cần thiết cho các tính năng mới.
- **Bước 5:** Chạy backend server:
  ```bash
  npm run dev
  ```
  Server sẽ chạy tại `http://localhost:3002`.

### 2. Cài Đặt Frontend

- **Bước 1:** Mở một terminal **mới** và đảm bảo bạn đang ở thư mục gốc của dự án.
- **Bước 2:** Cài đặt các gói phụ thuộc:
  ```bash
  npm install
  ```
- **Bước 3:** Chạy frontend development server:
  ```bash
  npm run dev
  ```
  Frontend sẽ chạy tại một địa chỉ như `http://localhost:5173`.

### Cách Hoạt Động của API

Trong môi trường phát triển, frontend sử dụng proxy của Vite để chuyển tiếp các yêu cầu API (bắt đầu bằng `/api/` hoặc `/picture_feedback/`) đến backend server. Máy chủ backend được cấu hình trong file `vite.config.js`. Điều này cho phép sử dụng đường dẫn tương đối (ví dụ: `/api/apartments`) trong code.

Khi triển khai lên production, bạn cần cấu hình web server (như Nginx) để chuyển tiếp các yêu cầu này đến backend một cách tương tự. Điều này giúp backend và frontend có thể chạy độc lập và làm cho việc triển khai dễ dàng hơn.
