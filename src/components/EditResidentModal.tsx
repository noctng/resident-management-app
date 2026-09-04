import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import type { Resident } from '../types';
import { DocumentTextIcon, MagnifyingGlassIcon } from './icons';
import { useTaxLookup } from '../services/taxLookup';

interface EditResidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateResident: (
    residentId: string,
    residentData: Omit<Resident, 'id' | 'isActive' | 'canUseAmenities'>
  ) => void;
  resident: Resident | null;
}

const EditResidentModal: React.FC<EditResidentModalProps> = ({
  isOpen,
  onClose,
  onUpdateResident,
  resident,
}) => {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [zaloId, setZaloId] = useState('');
  const [email, setEmail] = useState('');
  const [relationshipStatus, setRelationshipStatus] = useState<'OWNER' | 'FAMILY' | 'TENANT'>(
    'FAMILY'
  );
  // E-Invoice information
  const [companyName, setCompanyName] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [invoiceAddress, setInvoiceAddress] = useState('');

  const { lookingUp, lookup } = useTaxLookup();

  const handleTaxLookup = () => {
    lookup(taxCode, {
      setCompanyName,
      setBuyerName,
      setInvoiceAddress,
    });
  };

  useEffect(() => {
    if (resident) {
      setName(resident.name);
      // Format ISO date (e.g. 1991-11-20T...) to yyyy-MM-dd for <input type="date" />
      const formattedDob = resident.dob ? resident.dob.toString().split('T')[0] : '';
      setDob(formattedDob);
      setIdNumber(resident.idNumber);
      setPhoneNumber(resident.phoneNumber || '');
      setZaloId(resident.zaloId || '');
      setEmail(resident.email || '');
      setRelationshipStatus(resident.relationshipStatus || 'FAMILY');
      setCompanyName(resident.companyName || '');
      setBuyerName(resident.buyerName || '');
      setTaxCode(resident.taxCode || '');
      setInvoiceAddress(resident.invoiceAddress || '');
    }
  }, [resident]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (resident && name && dob && idNumber) {
      onUpdateResident(resident.id, {
        name,
        dob,
        idNumber,
        phoneNumber,
        zaloId,
        email,
        relationshipStatus,
        companyName: companyName.trim() || undefined,
        buyerName: buyerName.trim() || undefined,
        taxCode: taxCode.trim() || undefined,
        invoiceAddress: invoiceAddress.trim() || undefined,
      });
      onClose();
    }
  };

  if (!resident) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Chỉnh Sửa Thông Tin: ${resident.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        <div>
          <label
            htmlFor="edit-name"
            className="block text-xs font-semibold text-ink-soft mb-1"
          >
            Họ và Tên <span className="text-brand-danger">*</span>
          </label>
          <input
            type="text"
            id="edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            required
          />
        </div>
        <div>
          <label
            htmlFor="edit-dob"
            className="block text-xs font-semibold text-ink-soft mb-1"
          >
            Ngày Sinh <span className="text-brand-danger">*</span>
          </label>
          <input
            type="date"
            id="edit-dob"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="mt-1 block w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            required
          />
        </div>
        <div>
          <label
            htmlFor="edit-idNumber"
            className="block text-xs font-semibold text-ink-soft mb-1"
          >
            Số CCCD/Passport <span className="text-brand-danger">*</span>
          </label>
          <input
            type="text"
            id="edit-idNumber"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            className="mt-1 block w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink font-mono tabular-nums placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            required
          />
        </div>
        <div>
          <label
            htmlFor="edit-phoneNumber"
            className="block text-xs font-semibold text-ink-soft mb-1"
          >
            Số Điện Thoại (Tùy chọn)
          </label>
          <input
            type="tel"
            id="edit-phoneNumber"
            value={phoneNumber ?? ''}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="mt-1 block w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink font-mono tabular-nums placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
          />
        </div>
        <div>
          <label
            htmlFor="edit-zaloId"
            className="block text-xs font-semibold text-ink-soft mb-1"
          >
            Zalo ID (Tùy chọn)
          </label>
          <input
            type="text"
            id="edit-zaloId"
            value={zaloId ?? ''}
            onChange={(e) => setZaloId(e.target.value)}
            className="mt-1 block w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
          />
        </div>
        <div>
          <label
            htmlFor="edit-email"
            className="block text-xs font-semibold text-ink-soft mb-1"
          >
            Email (Tùy chọn)
          </label>
          <input
            type="email"
            id="edit-email"
            value={email ?? ''}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
          />
        </div>
        <div>
          <label
            htmlFor="edit-relationshipStatus"
            className="block text-xs font-semibold text-ink-soft mb-1"
          >
            Trạng thái quan hệ
          </label>
          <select
            id="edit-relationshipStatus"
            value={relationshipStatus}
            onChange={(e) => setRelationshipStatus(e.target.value as 'OWNER' | 'FAMILY' | 'TENANT')}
            className="mt-1 block w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
          >
            <option value="FAMILY">Thành viên gia đình</option>
            <option value="OWNER">Chủ sở hữu (Dùng xuất hóa đơn)</option>
            <option value="TENANT">Khách thuê</option>
          </select>
        </div>

        {/* ── Thông tin Xuất Hóa Đơn Điện Tử (VNPT) ── */}
        <div className="bg-accent-soft/60 p-4 rounded-xl border border-accent/40 space-y-3 mt-4">
          <div className="flex items-center gap-2 text-accent-ink font-bold text-sm">
            <DocumentTextIcon className="w-4 h-4 text-accent" />
            <span>Thông Tin Xuất Hóa Đơn Điện Tử (HĐĐT)</span>
          </div>
          <p className="text-[11px] text-ink-soft">
            Thông tin này sẽ được tự động điền khi xuất hóa đơn Điện Nước & Hóa Đơn Tổng Hợp cho căn hộ của cư dân này.
          </p>

          <div>
            <label
              htmlFor="edit-taxCode"
              className="block text-xs font-semibold text-ink-soft mb-1"
            >
              Mã Số Thuế (Tax Code)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="edit-taxCode"
                placeholder="VD: 0309613403 hoặc MST cá nhân"
                value={taxCode}
                onChange={(e) => setTaxCode(e.target.value)}
                className="flex-1 block w-full px-3 py-2 text-xs rounded-lg border border-brand-border bg-surface-alt text-ink font-mono tabular-nums placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              />
              <button
                type="button"
                onClick={handleTaxLookup}
                disabled={!taxCode.trim() || lookingUp}
                className="px-3 py-2 rounded-lg bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 text-xs font-medium"
              >
                {lookingUp ? (
                  <span className="inline-block h-4 w-4 border-2 border-accent/40 border-t-accent rounded-full animate-spin" />
                ) : (
                  <MagnifyingGlassIcon className="w-4 h-4" />
                )}
                {lookingUp ? 'Đang tra...' : 'Tra cứu'}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-companyName"
              className="block text-xs font-semibold text-ink-soft mb-1"
            >
              Tên Công Ty / Đơn Vị (Company's name)
            </label>
            <input
              type="text"
              id="edit-companyName"
              placeholder="VD: CÔNG TY TNHH ABC (để trống nếu là cá nhân)"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="block w-full px-3 py-2 text-xs rounded-lg border border-brand-border bg-surface-alt text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="edit-buyerName"
              className="block text-xs font-semibold text-ink-soft mb-1"
            >
              Họ Tên Người Mua Hàng (Buyer)
            </label>
            <input
              type="text"
              id="edit-buyerName"
              placeholder={name || 'Họ tên người đại diện mua hàng'}
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              className="block w-full px-3 py-2 text-xs rounded-lg border border-brand-border bg-surface-alt text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="edit-invoiceAddress"
              className="block text-xs font-semibold text-ink-soft mb-1"
            >
              Địa Chỉ Xuất Hóa Đơn (Address)
            </label>
            <textarea
              id="edit-invoiceAddress"
              rows={2}
              placeholder="VD: Tổ dân phố 1, đường Nguyễn Đình Chiểu, P. Tân Lợi, TP. Buôn Ma Thuột, Đắk Lắk"
              value={invoiceAddress}
              onChange={(e) => setInvoiceAddress(e.target.value)}
              className="block w-full px-3 py-2 text-xs rounded-lg border border-brand-border bg-surface-alt text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-brand-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-surface border border-brand-border text-ink hover:bg-surface-alt transition-colors text-sm font-medium"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors"
          >
            Lưu thay đổi
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditResidentModal;
