import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import type { Customer, Contract } from '../types';
import { CheckCircleIcon, ExclamationTriangleIcon } from './icons';

interface ExistingResident {
  id: string;
  name: string;
  phone_number: string | null;
  relationship_status: string;
}

interface ConvertToResidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer & { contracts: Contract[] };
  onConvert: (contractId?: string) => Promise<{
    existingResidents: ExistingResident[];
    warnings: string[];
    hasPhoneNumber: boolean;
    isNewResident: boolean;
    accountCreated: boolean;
  }>;
}

const ConvertToResidentModal: React.FC<ConvertToResidentModalProps> = ({
  isOpen,
  onClose,
  customer,
  onConvert,
}) => {
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [conversionResult, setConversionResult] = useState<any>(null);

  const completedContracts = customer.contracts.filter((c) => c.status === 'COMPLETED');
  const missingIdNumber = !customer.id_number || customer.id_number.trim() === '';
  const missingPhoneNumber = !customer.phone_number || customer.phone_number.trim() === '';

  useEffect(() => {
    if (isOpen) {
      setError('');
      setShowSuccess(false);
      setConversionResult(null);
      if (completedContracts.length === 1) {
        setSelectedContractId(completedContracts[0].id);
      } else {
        setSelectedContractId('');
      }
    }
  }, [isOpen, completedContracts.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (completedContracts.length === 0) {
      setError('Khách hàng chưa có hợp đồng hoàn thành nào');
      return;
    }

    if (missingIdNumber) {
      setError('Khách hàng chưa có CMND/CCCD. Vui lòng cập nhật thông tin trước.');
      return;
    }

    if (completedContracts.length > 1 && !selectedContractId) {
      setError('Vui lòng chọn hợp đồng');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await onConvert(selectedContractId || undefined);
      setConversionResult(result);
      setShowSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi chuyển đổi');
      console.error('Error converting to resident:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (showSuccess) {
      window.location.reload(); // Reload to update UI
    }
    onClose();
  };

  if (showSuccess && conversionResult) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Chuyển Đổi Thành Công">
        <div className="space-y-4">
          <div className="p-4 bg-brand-success-soft border border-brand-success/30 rounded-lg">
            <p className="text-brand-success font-medium flex items-center gap-1.5">
              <CheckCircleIcon className="w-4 h-4" />
              Đã chuyển khách hàng thành cư dân thành công!
            </p>
          </div>

          {conversionResult.warnings && conversionResult.warnings.length > 0 && (
            <div className="p-4 bg-brand-warning-soft border border-brand-warning/30 rounded-lg">
              <p className="text-sm font-medium text-brand-warning mb-2">Lưu ý:</p>
              <ul className="list-disc list-inside text-sm text-brand-warning">
                {conversionResult.warnings.map((warning: string, idx: number) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {conversionResult.existingResidents && conversionResult.existingResidents.length > 0 && (
            <div className="p-4 bg-brand-teal-soft border border-brand-teal/30 rounded-lg">
              <p className="text-sm font-medium text-brand-teal mb-2">
                Cư dân hiện tại trong căn hộ ({conversionResult.existingResidents.length}):
              </p>
              <ul className="space-y-1">
                {conversionResult.existingResidents.map((resident: ExistingResident) => (
                  <li key={resident.id} className="text-sm text-brand-teal">
                    • {resident.name} - {resident.phone_number || 'Không có SĐT'}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chuyển Thành Cư Dân">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-brand-danger-soft border border-brand-danger/30 rounded-lg">
            <p className="text-sm text-brand-danger">{error}</p>
          </div>
        )}

        {/* Customer Info */}
        <div className="p-4 bg-surface-alt rounded-lg">
          <h3 className="font-semibold text-ink mb-3">Thông tin khách hàng</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-soft">Tên:</span>
              <span className="font-medium text-ink">{customer.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Số điện thoại:</span>
              <span className="font-medium text-ink font-mono tabular-nums">
                {customer.phone_number || <span className="text-brand-warning">Chưa có</span>}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">CMND/CCCD:</span>
              <span className="font-medium text-ink font-mono tabular-nums">
                {customer.id_number || <span className="text-brand-danger">Chưa có</span>}
              </span>
            </div>
          </div>
        </div>

        {/* Validation Warnings */}
        {missingIdNumber && (
          <div className="p-3 bg-brand-danger-soft border border-brand-danger/30 rounded-lg">
            <p className="text-sm text-brand-danger flex items-center gap-1.5">
              <ExclamationTriangleIcon className="w-4 h-4" />
              Bắt buộc: Khách hàng phải có CMND/CCCD trước khi chuyển đổi
            </p>
          </div>
        )}

        {missingPhoneNumber && !missingIdNumber && (
          <div className="p-3 bg-brand-warning-soft border border-brand-warning/30 rounded-lg">
            <p className="text-sm text-brand-warning flex items-center gap-1.5">
              <ExclamationTriangleIcon className="w-4 h-4" />
              Cảnh báo: Không có số điện thoại, sẽ không tạo tài khoản cư dân
            </p>
          </div>
        )}

        {/* Contract Selection */}
        {completedContracts.length > 1 && (
          <div>
            <label
              htmlFor="contract-select"
              className="block text-xs font-semibold text-ink-soft mb-1"
            >
              Chọn hợp đồng <span className="text-brand-danger">*</span>
            </label>
            <select
              id="contract-select"
              value={selectedContractId}
              onChange={(e) => setSelectedContractId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              required
              disabled={isSubmitting}
            >
              <option value="">-- Chọn hợp đồng --</option>
              {completedContracts.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {contract.contract_code} - Căn hộ: {contract.apartments?.code}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Selected Apartment Info */}
        {(completedContracts.length === 1 || selectedContractId) && (
          <div className="p-4 bg-brand-teal-soft border border-brand-teal/30 rounded-lg">
            <h3 className="font-semibold text-brand-teal mb-2">
              Căn hộ sẽ được gán
            </h3>
            {(() => {
              const contract =
                completedContracts.find((c) => c.id === selectedContractId) ||
                completedContracts[0];
              return (
                <div className="text-sm space-y-1">
                  <p className="text-brand-teal">
                    <span className="font-medium">Mã căn hộ:</span>{' '}
                    <span className="font-mono tabular-nums">{contract.apartments?.code}</span>
                  </p>
                  <p className="text-brand-teal">
                    <span className="font-medium">Loại:</span> {contract.apartments?.houseType}
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* Info Box */}
        <div className="p-3 bg-brand-teal-soft border border-brand-teal/30 rounded-lg">
          <p className="text-sm text-brand-teal">
            <strong>Lưu ý:</strong> Mật khẩu mặc định cho tài khoản cư dân:{' '}
            <code className="bg-surface px-1 rounded font-mono tabular-nums">Abc@12345</code>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t border-brand-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-surface border border-brand-border text-ink hover:bg-surface-alt transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={isSubmitting || missingIdNumber || completedContracts.length === 0} aria-label="Đóng">
            {isSubmitting && (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {isSubmitting ? 'Đang xử lý...' : 'Xác nhận chuyển đổi'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ConvertToResidentModal;
