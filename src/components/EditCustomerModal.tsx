import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import type { Customer } from '../types';

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateCustomer: (customerId: string, customerData: Partial<Customer>) => Promise<void>;
  customer: Customer | null;
}

const EditCustomerModal: React.FC<EditCustomerModalProps> = ({
  isOpen,
  onClose,
  onUpdateCustomer,
  customer,
}) => {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (customer) {
      setName(customer.name || '');
      setPhoneNumber(customer.phone_number || '');
      setEmail(customer.email || '');
      setIdNumber(customer.id_number || '');
      setAddress(customer.address || '');
      setNotes(customer.notes || '');
      setError('');
    }
  }, [customer]);

  const validateForm = (): boolean => {
    if (!name.trim() || name.trim().length < 2) {
      setError('Tên khách hàng phải có ít nhất 2 ký tự');
      return false;
    }

    if (!phoneNumber.trim()) {
      setError('Số điện thoại là bắt buộc');
      return false;
    }

    // Validate Vietnamese phone number format
    const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      setError('Số điện thoại không hợp lệ');
      return false;
    }

    // Validate email if provided
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Email không hợp lệ');
        return false;
      }
    }

    // Validate ID number if provided (9 or 12 digits)
    if (idNumber.trim()) {
      const idRegex = /^\d{9}$|^\d{12}$/;
      if (!idRegex.test(idNumber.replace(/\s/g, ''))) {
        setError('CMND/CCCD phải có 9 hoặc 12 số');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!customer) return;

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onUpdateCustomer(customer.id, {
        name: name.trim(),
        phone_number: phoneNumber.trim(),
        email: email.trim() || undefined,
        id_number: idNumber.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError('Có lỗi xảy ra khi cập nhật thông tin khách hàng');
      console.error('Error updating customer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!customer) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Chỉnh Sửa Thông Tin: ${customer.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-brand-danger-soft border border-brand-danger/20 rounded-lg">
            <p className="text-sm text-brand-danger">{error}</p>
          </div>
        )}

        <div>
          <label
            htmlFor="edit-customer-name"
            className="block text-sm font-medium text-ink"
          >
            Họ và Tên <span className="text-brand-danger">*</span>
          </label>
          <input
            type="text"
            id="edit-customer-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-brand-border rounded-md shadow-sm focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none bg-surface text-ink"
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label
            htmlFor="edit-customer-phone"
            className="block text-sm font-medium text-ink"
          >
            Số Điện Thoại <span className="text-brand-danger">*</span>
          </label>
          <input
            type="tel"
            id="edit-customer-phone"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="0912345678"
            className="mt-1 block w-full px-3 py-2 border border-brand-border rounded-md shadow-sm focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none bg-surface text-ink font-mono tabular-nums placeholder:text-ink-faint"
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label
            htmlFor="edit-customer-email"
            className="block text-sm font-medium text-ink"
          >
            Email
          </label>
          <input
            type="email"
            id="edit-customer-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            className="mt-1 block w-full px-3 py-2 border border-brand-border rounded-md shadow-sm focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none bg-surface text-ink placeholder:text-ink-faint"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label
            htmlFor="edit-customer-id"
            className="block text-sm font-medium text-ink"
          >
            CMND/CCCD
          </label>
          <input
            type="text"
            id="edit-customer-id"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            placeholder="001234567891"
            className="mt-1 block w-full px-3 py-2 border border-brand-border rounded-md shadow-sm focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none bg-surface text-ink font-mono tabular-nums placeholder:text-ink-faint"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label
            htmlFor="edit-customer-address"
            className="block text-sm font-medium text-ink"
          >
            Địa Chỉ
          </label>
          <input
            type="text"
            id="edit-customer-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="TP. Hồ Chí Minh"
            className="mt-1 block w-full px-3 py-2 border border-brand-border rounded-md shadow-sm focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none bg-surface text-ink placeholder:text-ink-faint"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label
            htmlFor="edit-customer-notes"
            className="block text-sm font-medium text-ink"
          >
            Ghi Chú
          </label>
          <textarea
            id="edit-customer-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Ghi chú về khách hàng..."
            className="mt-1 block w-full px-3 py-2 border border-brand-border rounded-md shadow-sm focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none bg-surface text-ink placeholder:text-ink-faint"
            disabled={isSubmitting}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-surface-alt text-ink rounded-md hover:brightness-95 transition-colors cursor-pointer"
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditCustomerModal;
