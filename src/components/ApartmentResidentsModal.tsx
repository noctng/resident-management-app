import React from 'react';
import { XMarkIcon } from './icons';
import ApartmentDetail from './ApartmentDetail';
import type { Apartment, Resident } from '../types';

interface ApartmentResidentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apartment: Apartment | null;
  residentsInApartment: Resident[];
  allResidents: Resident[];
  onAddResidentToApartment: (residentId: string) => void;
  onRemoveResidentFromApartment: (residentId: string) => void;
  onEditResident: (resident: Resident) => void;
  onOpenEditApartmentModal: () => void;
}

const ApartmentResidentsModal: React.FC<ApartmentResidentsModalProps> = ({
  isOpen,
  onClose,
  apartment,
  residentsInApartment,
  allResidents,
  onAddResidentToApartment,
  onRemoveResidentFromApartment,
  onEditResident,
  onOpenEditApartmentModal,
}) => {
  if (!isOpen || !apartment) return null;

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
            Chi tiết cư dân - {apartment.code}
          </h3>
          <button
            onClick={onClose}
            className="text-ink-faint hover:text-ink-soft transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
          <ApartmentDetail
            apartment={apartment}
            residentsInApartment={residentsInApartment}
            allResidents={allResidents}
            onAddResidentToApartment={onAddResidentToApartment}
            onRemoveResidentFromApartment={onRemoveResidentFromApartment}
            onOpenEditApartmentModal={onOpenEditApartmentModal}
            onEditResident={onEditResident}
          />
        </div>
      </div>
    </div>
  );
};

export default ApartmentResidentsModal;
