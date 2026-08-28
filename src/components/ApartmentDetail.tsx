import React, { useState } from 'react';
import type { Apartment, Resident } from '../types';
import { UserIcon, TrashIcon, PencilIcon, UsersIcon, BuildingOfficeIcon, DocumentTextIcon, PhoneIcon, EnvelopeIcon } from './icons';
import SearchableSelect from './SearchableSelect';

interface ApartmentDetailProps {
  apartment: Apartment;
  residentsInApartment: Resident[];
  allResidents: Resident[];
  onAddResidentToApartment: (residentId: string) => void;
  onRemoveResidentFromApartment: (residentId: string) => void;
  onOpenEditApartmentModal: () => void;
  onEditResident: (resident: Resident) => void;
}

const ApartmentDetail: React.FC<ApartmentDetailProps> = ({
  apartment,
  residentsInApartment,
  allResidents,
  onAddResidentToApartment,
  onRemoveResidentFromApartment,
  onOpenEditApartmentModal,
  onEditResident,
}) => {
  const [selectedResident, setSelectedResident] = useState('');

  const availableResidents = allResidents.filter(
    (res) => res.isActive && !residentsInApartment.some((r) => r.id === res.id)
  );

  const residentOptions = availableResidents.map((res) => ({
    value: res.id,
    label: `${res.name} (${res.idNumber})`,
  }));

  const handleAddResident = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedResident) {
      onAddResidentToApartment(selectedResident);
      setSelectedResident('');
    }
  };

  const getRelationshipBadge = (status: string) => {
    const badges = {
      OWNER: 'bg-accent-soft text-accent-ink',
      FAMILY: 'bg-brand-teal-soft text-brand-teal',
      TENANT: 'bg-brand-warning-soft text-brand-warning',
    };
    const dots = {
      OWNER: 'bg-accent',
      FAMILY: 'bg-brand-teal',
      TENANT: 'bg-brand-warning',
    };
    const labels = {
      OWNER: 'Chủ hộ',
      FAMILY: 'Gia đình',
      TENANT: 'Thuê',
    };
    const key = (status as keyof typeof badges) in badges ? (status as keyof typeof badges) : 'FAMILY';
    return {
      class: badges[key],
      dot: dots[key],
      label: labels[status as keyof typeof labels] || status,
    };
  };

  return (
    <div className="h-full flex flex-col space-y-6 overflow-y-auto pr-2">
      {/* Apartment Info Card - Enhanced */}
      <div className="bg-surface rounded-lg shadow-lg p-5">
        <div className="flex justify-between items-start mb-4 gap-3">
          <div className="flex-1 flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full bg-accent-soft text-accent-ink font-bold flex items-center justify-center shrink-0">
              <BuildingOfficeIcon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-ink mb-0.5 truncate">
                Căn hộ {apartment.code}
              </h2>
              <p className="text-sm text-ink-soft font-mono">Thông tin chi tiết căn hộ</p>
            </div>
          </div>
          <button
            onClick={onOpenEditApartmentModal}
            className="p-2 text-ink-soft hover:bg-surface-alt rounded-full transition-colors duration-200 cursor-pointer"
            aria-label="Edit apartment"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-surface-alt/50 p-3 rounded-lg border border-brand-border">
            <p className="text-[11px] uppercase tracking-wide text-ink-soft font-semibold mb-1">Loại nhà</p>
            <p className="text-lg font-bold text-ink">
              {apartment.houseType}
            </p>
          </div>
          <div className="bg-surface-alt/50 p-3 rounded-lg border border-brand-border">
            <p className="text-[11px] uppercase tracking-wide text-ink-soft font-semibold mb-1">Tầng</p>
            <p className="text-lg font-bold text-ink font-mono">
              {apartment.floor}
            </p>
          </div>
          <div className="bg-surface-alt/50 p-3 rounded-lg border border-brand-border">
            <p className="text-[11px] uppercase tracking-wide text-ink-soft font-semibold mb-1">Diện tích</p>
            <p className="text-lg font-bold text-ink font-mono tabular-nums">
              {apartment.area} m²
            </p>
          </div>
          <div className="bg-surface-alt/50 p-3 rounded-lg border border-brand-border">
            <p className="text-[11px] uppercase tracking-wide text-ink-soft font-semibold mb-1">Loại điện</p>
            <p className="text-sm font-bold text-ink mt-1">
              {apartment.electricityType === 'RESIDENTIAL' ? 'Sinh Hoạt' : 'Kinh Doanh'}
            </p>
          </div>
        </div>
      </div>

      {/* Resident Statistics Card */}
      <div className="bg-surface rounded-lg shadow-lg p-5">
        <h3 className="text-xl font-semibold text-ink mb-4">
          Thống Kê Cư Dân
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-surface-alt/50 rounded-lg border border-brand-border">
            <p className="text-3xl font-bold text-accent font-mono tabular-nums">
              {residentsInApartment.length}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-ink-soft font-semibold mt-1">Tổng cư dân</p>
          </div>
          <div className="text-center p-3 bg-surface-alt/50 rounded-lg border border-brand-border">
            <p className="text-3xl font-bold text-brand-teal font-mono tabular-nums">
              {residentsInApartment.filter((r) => r.relationshipStatus === 'OWNER').length}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-ink-soft font-semibold mt-1">Chủ hộ</p>
          </div>
          <div className="text-center p-3 bg-surface-alt/50 rounded-lg border border-brand-border">
            <p className="text-3xl font-bold text-brand-success font-mono tabular-nums">
              {residentsInApartment.filter((r) => r.isActive).length}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-ink-soft font-semibold mt-1">Đang hoạt động</p>
          </div>
        </div>
      </div>

      {/* Residents Card - Enhanced */}
      <div className="bg-surface rounded-lg shadow-lg p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-4">
          <UsersIcon className="w-6 h-6 text-ink-soft" />
          <h3 className="text-xl font-semibold text-ink">
            Danh Sách Cư Dân
          </h3>
        </div>

        <div className="flex-grow overflow-y-auto mb-4 min-h-[200px] pr-2">
          {residentsInApartment.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-ink-soft">
                Chưa có cư dân nào trong căn hộ này.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {residentsInApartment.map((res) => {
                const badge = getRelationshipBadge(res.relationshipStatus);
                return (
                  <li
                    key={res.id}
                    className="bg-surface-alt/50 p-4 rounded-lg border border-brand-border hover:border-accent/40 transition-colors duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <UserIcon className="w-5 h-5 text-ink-soft mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-semibold text-ink">
                              {res.name}
                            </p>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold rounded-full ${badge.class}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dot}`}></span>
                              {badge.label}
                            </span>
                            {!res.isActive && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold rounded-full bg-brand-danger-soft text-brand-danger">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-brand-danger"></span>
                                Không hoạt động
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-ink-soft flex items-center gap-1.5">
                            <DocumentTextIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>CCCD: <span className="font-mono">{res.idNumber}</span></span>
                          </p>
                          {res.phoneNumber && (
                            <p className="text-sm text-ink-soft flex items-center gap-1.5 mt-0.5">
                              <PhoneIcon className="w-3.5 h-3.5 shrink-0" />
                              <span className="font-mono">{res.phoneNumber}</span>
                            </p>
                          )}
                          {res.email && (
                            <p className="text-sm text-ink-soft truncate flex items-center gap-1.5 mt-0.5">
                              <EnvelopeIcon className="w-3.5 h-3.5 shrink-0" />
                              {res.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onEditResident(res)}
                          className="p-2 text-accent hover:bg-accent-soft rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0"
                          aria-label={`Chỉnh sửa ${res.name}`}
                          title="Chỉnh sửa thông tin"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => onRemoveResidentFromApartment(res.id)}
                          className="p-2 text-brand-danger hover:bg-brand-danger-soft rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0"
                          aria-label={`Xóa ${res.name}`}
                          title="Xóa khỏi căn hộ"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <form
          onSubmit={handleAddResident}
          className="pt-4 border-t border-brand-border"
        >
          <h4 className="font-semibold text-ink mb-2">
            Thêm cư dân vào căn hộ
          </h4>
          <div className="flex gap-2">
            <SearchableSelect
              value={selectedResident}
              onChange={setSelectedResident}
              options={residentOptions}
              placeholder={
                availableResidents.length > 0
                  ? 'Tìm và chọn cư dân...'
                  : 'Không có cư dân nào để thêm'
              }
              disabled={availableResidents.length === 0}
              direction="up"
            />
            <button
              type="submit"
              disabled={!selectedResident}
              className="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent/40 disabled:bg-surface-alt disabled:text-ink-faint disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
            >
              Thêm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApartmentDetail;
