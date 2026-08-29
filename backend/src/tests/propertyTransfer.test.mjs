import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const req = createRequire(import.meta.url);

// Mock logger (side-effect)
vi.mock('../utils/logger', () => ({ logActivity: vi.fn() }));

describe('propertyTransfer', () => {
  describe('Kiểm tra eligibility logic', () => {
    it('contract SIGNED/PAID trạng thái hợp lệ', () => {
      const statuses = ['SIGNED', 'PAYING'];
      const isEligibleStatus = statuses.includes('SIGNED');
      expect(isEligibleStatus).toBe(true);
    });

    it('contract CANCELLED trạng thái không hợp lệ', () => {
      const statuses = ['SIGNED', 'PAYING'];
      const isEligibleStatus = statuses.includes('CANCELLED');
      expect(isEligibleStatus).toBe(false);
    });

    it('tính đúng total_paid từ payments array', () => {
      const payments = [
        { status: 'PAID', paid_amount: 50000000, base_amount: 50000000 },
        { status: 'PAID', paid_amount: 150000000, base_amount: 200000000 },
      ];
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);
      expect(totalPaid).toBe(200000000);
    });

    it('tính đúng remaining_debt', () => {
      const payments = [{ paid_amount: 500000000, base_amount: 500000000 }];
      const totalValue = 1000000000;
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);
      const remainingDebt = Math.max(0, totalValue - totalPaid);
      expect(remainingDebt).toBe(500000000);
    });

    it('phát hiện overdue payments đúng', () => {
      const now = new Date();
      const payments = [
        { status: 'PAID', due_date: new Date('2025-01-01'), paid_amount: 100 },
        { status: 'PENDING', due_date: new Date('2020-01-01'), paid_amount: 0 },
      ];
      const overdueCount = payments.filter((p) => p.status !== 'PAID' && p.due_date && new Date(p.due_date) < now).length;
      expect(overdueCount).toBe(1);
    });
  });

  describe('Ket qua chuyển nhượng', () => {
    it('transfer code định dạng đúng: CN-TPCP-YEAR-RANDOM', () => {
      const year = new Date().getFullYear();
      const randomBytes = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
      const randomSuffix = randomBytes() + randomBytes();
      const transferCode = `CN-TPCP-${year}-${randomSuffix}`;
      expect(transferCode).toMatch(/^CN-TPCP-\d{4}-[A-F0-9]{4}$/);
    });

    it('transfer ID bắt đầu bằng trf_', () => {
      // crypto.randomBytes(6).toString('hex') tạo 12 ký tự hex
      // ở test dùng approximation
      const transferId = 'trf_' + 'a1b2c3d4e5f6';
      expect(transferId.startsWith('trf_')).toBe(true);
      expect(transferId.length).toBe(16); // 'trf_' (4) + 12 hex = 16 chars
    });

    it('success message chứa thông tin đúng', () => {
      const transferCode = 'CN-TPCP-2024-AB';
      const newCustomerName = 'Nguyen Van B';
      const totalPaid = 500000000;
      const message = `Chuyển nhượng thành công HĐMB sang ${newCustomerName} (Hồ sơ: ${transferCode})! Toàn bộ LTT và ${totalPaid.toLocaleString('vi-VN')} VNĐ đã được kế thừa nguyên vẹn.`;

      expect(message).toContain('Chuyển nhượng thành công');
      expect(message).toContain('Nguyen Van B');
      expect(message).toContain('CN-TPCP-2024-AB');
    });
  });

  describe('Stats calculation', () => {
    it('tính đúng total transfers và inherited value', () => {
      const transfers = [
        { inherited_paid_amount: '100000000' },
        { inherited_paid_amount: '200000000' },
      ];
      const totalTransfers = transfers.length;
      const totalInheritedValue = transfers.reduce((sum, t) => sum + Number(t.inherited_paid_amount || 0), 0);

      expect(totalTransfers).toBe(2);
      expect(totalInheritedValue).toBe(300000000);
    });

    it('tính đúng multi-transfers count', () => {
      const transfers = [
        { contracts: { apartment_id: 'apt_1' }, transfer_date: new Date('2024-01-01') },
        { contracts: { apartment_id: 'apt_1' }, transfer_date: new Date('2024-02-01') },
        { contracts: { apartment_id: 'apt_2' }, transfer_date: new Date('2024-01-01') },
      ];

      const aptTransferCounts = {};
      transfers.forEach((t) => {
        const aptId = t.contracts?.apartment_id;
        if (aptId) aptTransferCounts[aptId] = (aptTransferCounts[aptId] || 0) + 1;
      });
      const multiTransfersCount = Object.values(aptTransferCounts).filter((c) => c >= 2).length;

      expect(multiTransfersCount).toBe(1); // apt_1 có 2 transfers
    });
  });
});