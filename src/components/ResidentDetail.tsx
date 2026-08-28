import React, { useState } from 'react';
import type { Apartment, Resident } from '../types';
import { BuildingOfficeIcon, TrashIcon, PencilIcon, DocumentTextIcon } from './icons';
import SearchableSelect from './SearchableSelect';

interface ResidentDetailProps {
  resident: Resident;
  apartmentsOfResident: Apartment[];
  allApartments: Apartment[];
  onAddApartmentToResident: (apartmentId: string) => void;
  onRemoveApartmentFromResident: (apartmentId: string) => void;
  onOpenEditResidentModal: () => void;
  onUpdateResidentStatus: (residentId: string, isActive: boolean) => void;
  onUpdateAmenityAccess: (residentId: string, canUseAmenities: boolean) => void;
}

const relationshipStatusMap: Record<Resident['relationshipStatus'], string> = {
  OWNER: 'Chủ sở hữu',
  FAMILY: 'Thành viên gia đình',
  TENANT: 'Khách thuê',
};

const relationshipStatusBadgeClass: Record<Resident['relationshipStatus'], string> = {
  OWNER: 'bg-accent-soft text-accent-ink',
  FAMILY: 'bg-brand-teal-soft text-brand-teal',
  TENANT: 'bg-brand-warning-soft text-brand-warning',
};

const relationshipStatusDotClass: Record<Resident['relationshipStatus'], string> = {
  OWNER: 'bg-accent',
  FAMILY: 'bg-brand-teal',
  TENANT: 'bg-brand-warning',
};

const ResidentDetail: React.FC<ResidentDetailProps> = ({
  resident,
  apartmentsOfResident,
  allApartments,
  onAddApartmentToResident,
  onRemoveApartmentFromResident,
  onOpenEditResidentModal,
  onUpdateResidentStatus,
  onUpdateAmenityAccess,
}) => {
  const [selectedApartment, setSelectedApartment] = useState('');

  const availableApartments = allApartments.filter(
    (apt) => !apartmentsOfResident.some((a) => a.id === apt.id)
  );

  const apartmentOptions = availableApartments.map((apt) => ({
    value: apt.id,
    label: apt.code,
  }));

  const handleAddApartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedApartment) {
      onAddApartmentToResident(selectedApartment);
      setSelectedApartment('');
    }
  };

  const statusBadgeClass = resident.isActive
    ? 'bg-brand-success-soft text-brand-success'
    : 'bg-brand-danger-soft text-brand-danger';

  const statusDotClass = resident.isActive ? 'bg-brand-success' : 'bg-brand-danger';

  const statusToggleButtonClass = resident.isActive
    ? 'bg-brand-danger hover:bg-brand-danger/90 focus:ring-brand-danger/40'
    : 'bg-accent hover:bg-accent-hover focus:ring-accent/40';

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateString; // Fallback to original string if split fails
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 overflow-y-auto pr-2">
      {/* Resident Info Card */}
      <div className="bg-surface rounded-lg shadow-lg p-5">
        <div className="flex justify-between items-start mb-2 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full bg-accent-soft text-accent-ink font-bold flex items-center justify-center shrink-0">
              {resident.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-ink truncate">{resident.name}</h2>
              <div className="flex items-center flex-wrap gap-2 mt-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${statusBadgeClass}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDotClass}`}></span>
                  {resident.isActive ? 'Đang hoạt động' : 'Đã ngừng kích hoạt'}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${relationshipStatusBadgeClass[resident.relationshipStatus]}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${relationshipStatusDotClass[resident.relationshipStatus]}`}></span>
                  {relationshipStatusMap[resident.relationshipStatus]}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onOpenEditResidentModal}
              className="p-2 text-ink-soft hover:bg-surface-alt rounded-full transition-colors duration-200 cursor-pointer"
              aria-label="Edit resident"
            >
              <PencilIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => onUpdateResidentStatus(resident.id, !resident.isActive)}
              className={`px-3 py-1.5 text-white text-xs font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${statusToggleButtonClass}`}
            >
              {resident.isActive ? 'Ngừng kích hoạt' : 'Kích hoạt lại'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-ink-soft mt-4 border-t border-brand-border pt-4 text-xs">
          <span>
            Ngày sinh: <strong className="text-ink">{formatDate(resident.dob)}</strong>
          </span>
          <span>
            CCCD: <strong className="text-ink font-mono">{resident.idNumber}</strong>
          </span>
          <span>
            SĐT: <strong className="text-ink font-mono">{resident.phoneNumber || 'N/A'}</strong>
          </span>
          <span>
            Zalo ID: <strong className="text-ink font-mono">{resident.zaloId || 'N/A'}</strong>
          </span>
          <span>
            Email: <strong className="text-ink">{resident.email || 'N/A'}</strong>
          </span>
        </div>

        {/* E-Invoice Information block */}
        <div className="mt-4 pt-3 border-t border-brand-border">
          <div className="bg-surface-alt/50 rounded-xl p-3.5 border border-brand-border">
            <div className="flex items-center gap-2 mb-2 text-ink font-semibold text-xs flex-wrap">
              <DocumentTextIcon className="w-4 h-4 text-accent" />
              <span>Thông tin Xuất Hóa Đơn Điện Tử (VNPT)</span>
              {resident.relationshipStatus === 'OWNER' && (
                <span className="text-[10px] bg-accent-soft text-accent-ink px-2 py-0.5 rounded-full font-medium">
                  Chủ sở hữu • Dùng xuất HĐ
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-ink-soft">
              <div>
                <span className="text-[11px] uppercase tracking-wide font-semibold">Tên đơn vị/công ty:</span>{' '}
                <strong className="text-ink">
                  {resident.companyName || 'Chưa thiết lập (Mặc định theo tên)'}
                </strong>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wide font-semibold">Người mua hàng:</span>{' '}
                <strong className="text-ink">
                  {resident.buyerName || resident.name}
                </strong>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wide font-semibold">Mã số thuế:</span>{' '}
                <strong className="text-ink font-mono">
                  {resident.taxCode || 'Chưa có'}
                </strong>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wide font-semibold">Địa chỉ xuất HĐ:</span>{' '}
                <strong className="text-ink">
                  {resident.invoiceAddress || 'Mặc định theo địa chỉ căn hộ'}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-brand-border flex items-center justify-between">
          <h4 className="font-semibold text-ink">Quyền sử dụng Tiện ích</h4>
          <label
            htmlFor="amenity-toggle"
            className="relative inline-flex items-center cursor-pointer"
          >
            <input
              type="checkbox"
              id="amenity-toggle"
              className="sr-only peer"
              checked={resident.canUseAmenities}
              onChange={(e) => onUpdateAmenityAccess(resident.id, e.target.checked)}
            />
            <div className="w-11 h-6 bg-surface-alt peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/40 rounded-full peer  peer-checked:after:translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-brand-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all  peer-checked:bg-accent"></div>
            <span className="ml-3 text-sm font-medium text-ink">
              {resident.canUseAmenities ? 'Được phép' : 'Bị chặn'}
            </span>
          </label>
        </div>
      </div>

      {/* Apartments Card */}
      <div className="bg-surface rounded-lg shadow-lg p-5 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <BuildingOfficeIcon className="w-6 h-6 text-ink-soft" />
          <h3 className="text-xl font-semibold text-ink">
            Các căn hộ sở hữu/sinh sống
          </h3>
        </div>

        <div className="flex-grow overflow-y-auto mb-4 min-h-[100px]">
          {apartmentsOfResident.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-ink-soft">Cư dân này chưa có căn hộ nào.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {apartmentsOfResident.map((apt) => (
                <li
                  key={apt.id}
                  className="flex items-center justify-between bg-surface-alt/50 p-3 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <BuildingOfficeIcon className="w-5 h-5 text-ink-soft" />
                    <div>
                      <p className="font-medium text-ink font-mono">{apt.code}</p>
                      <p className="text-sm text-ink-soft">Tầng {apt.floor}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveApartmentFromResident(apt.id)}
                    className="p-2 text-brand-danger hover:bg-brand-danger-soft rounded-full transition-colors duration-200 cursor-pointer"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form
          onSubmit={handleAddApartment}
          className="pt-4 border-t border-brand-border"
        >
          <h4 className="font-semibold text-ink mb-2">Gán vào căn hộ</h4>
          <div className="flex gap-2">
            <SearchableSelect
              value={selectedApartment}
              onChange={setSelectedApartment}
              options={apartmentOptions}
              placeholder={
                availableApartments.length > 0
                  ? 'Tìm và chọn căn hộ...'
                  : 'Không có căn hộ nào để gán'
              }
              disabled={availableApartments.length === 0 || !resident.isActive}
              direction="up"
            />
            <button
              type="submit"
              disabled={!selectedApartment || !resident.isActive}
              className="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent/40 disabled:bg-surface-alt disabled:text-ink-faint disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
            >
              Gán
            </button>
          </div>
          {!resident.isActive && (
            <p className="text-sm text-brand-warning mt-2">
              Cư dân cần được kích hoạt lại để có thể gán vào căn hộ mới.
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default ResidentDetail;
