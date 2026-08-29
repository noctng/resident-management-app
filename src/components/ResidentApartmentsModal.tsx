import React from 'react';
import { XMarkIcon } from './icons';
import ResidentDetail from './ResidentDetail';
import type { Resident, Apartment } from '../types';

interface ResidentApartmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  resident: Resident | null;
  apartmentsOfResident: Apartment[];
  allApartments: Apartment[];
  onAddApartmentToResident: (apartmentId: string) => void;
  onRemoveApartmentFromResident: (apartmentId: string) => void;
  onOpenEditResidentModal: () => void;
  onUpdateResidentStatus: (residentId: string, isActive: boolean) => void;
  onUpdateAmenityAccess: (residentId: string, canUseAmenities: boolean) => void;
}

const ResidentApartmentsModal: React.FC<ResidentApartmentsModalProps> = ({
  isOpen,
  onClose,
  resident,
  apartmentsOfResident,
  allApartments,
  onAddApartmentToResident,
  onRemoveApartmentFromResident,
  onOpenEditResidentModal,
  onUpdateResidentStatus,
  onUpdateAmenityAccess,
}) => {
  if (!isOpen || !resident) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-4xl max-h-[92vh] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-brand-border bg-surface-alt rounded-t-lg">
          <h3 className="text-xl font-semibold text-ink">
            Chi tiết cư dân - {resident.name}
          </h3>
          <button
            onClick={onClose}
            className="text-ink-faint hover:text-ink-soft transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
          <ResidentDetail
            resident={resident}
            apartmentsOfResident={apartmentsOfResident}
            allApartments={allApartments}
            onAddApartmentToResident={onAddApartmentToResident}
            onRemoveApartmentFromResident={onRemoveApartmentFromResident}
            onOpenEditResidentModal={onOpenEditResidentModal}
            onUpdateResidentStatus={onUpdateResidentStatus}
            onUpdateAmenityAccess={onUpdateAmenityAccess}
          />
        </div>
      </div>
    </div>
  );
};

export default ResidentApartmentsModal;
