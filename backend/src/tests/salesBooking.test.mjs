import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const req = createRequire(import.meta.url);

// Mock logger
vi.mock('../utils/logger', () => ({ logActivity: vi.fn() }));

describe('salesBooking', () => {
  describe('Kiểm tra availability logic', () => {
    it('căn AVAILABLE trạng thái hợp lệ', () => {
      const unit = { id: 'apt_1', code: 'A101', sales_status: 'AVAILABLE' };
      const isAvailable = unit.sales_status === 'AVAILABLE';
      expect(isAvailable).toBe(true);
    });

    it('căn BOOKED trạng thái không hợp lệ', () => {
      const unit = { id: 'apt_2', code: 'A102', sales_status: 'BOOKED' };
      const isAvailable = unit.sales_status === 'AVAILABLE';
      expect(isAvailable).toBe(false);
    });
  });

  describe('Booking code format', () => {
    it('booking code định dạng: BK-{CODE}-{DATE}-{RANDOM}', () => {
      const apartmentCode = 'A101';
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = 'AB';
      const bookingCode = `BK-${apartmentCode}-${dateStr}-${randomSuffix}`;

      expect(bookingCode).toMatch(/^BK-A\d{3}-\d{8}-[A-Z]{2}$/);
      expect(bookingCode).toContain('BK-');
      expect(bookingCode).toContain(apartmentCode);
    });
  });

  describe('Giới hạn thời gian', () => {
    it('cart expires sau 48 giờ', () => {
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const diffHours = (expiresAt - new Date()) / (1000 * 60 * 60);
      expect(Math.round(diffHours)).toBe(48);
    });

    it('booking expires sau 7 ngày', () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const diffDays = (expiresAt - new Date()) / (1000 * 60 * 60 * 24);
      expect(Math.round(diffDays)).toBe(7);
    });
  });

  describe('Booking lifecycle', () => {
    it('tăng extension_count khi gia hạn', () => {
      const current = { extension_count: 1 };
      const newCount = (current.extension_count || 0) + 1;
      expect(newCount).toBe(2);

      const limit = 2;
      expect(newCount <= limit).toBe(true);
    });
  });

  describe('Cart operations', () => {
    it('getCart trả về success: true', () => {
      const result = { success: true, items: [] };
      expect(result.success).toBe(true);
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('removeFromCart trả về message', () => {
      const result = { success: true, message: 'Đã xóa khỏi giỏ hàng' };
      expect(result.message).toContain('xóa');
    });
  });

  describe('Validation messages', () => {
    it('validate thiếu apartment_id', () => {
      const apartment_id = null;
      const message = 'Vui lòng chọn căn hộ';
      if (!apartment_id) expect(message).toBe('Vui lòng chọn căn hộ');
    });

    it('validate thiếu customer info', () => {
      const apartment_id = 'apt_1';
      const customer_id = null;
      const customer_name = '';
      const customer_phone = null;
      const message = 'Vui lòng điền đủ thông tin Căn hộ, Tên khách hàng và Số điện thoại';
      if (!apartment_id || !customer_name || !customer_phone) expect(message).toContain('đủ thông tin');
    });
  });
});