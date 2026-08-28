import React, { useState } from 'react';
import type { Apartment } from '../types';
import { BuildingOfficeIcon } from './icons';

interface ApartmentListProps {
  apartments: Apartment[];
  selectedApartmentId: string | null;
  onSelectApartment: (id: string) => void;
  apartmentOccupancyStatus: Record<string, boolean>;
}

const ApartmentList: React.FC<ApartmentListProps> = ({
  apartments,
  selectedApartmentId,
  onSelectApartment,
  apartmentOccupancyStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredApartments = apartments.filter((apt) =>
    (apt.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getHouseTypeBadgeColor = (houseType: string) => {
    switch (houseType) {
      case 'CANTATA':
      case 'SHOPHOUSE':
        return 'bg-brand-teal-soft text-brand-teal ';
      case 'TESLA':
      case 'VILLA':
        return 'bg-accent-soft text-accent-ink ';
      default:
        return 'bg-surface-alt text-ink ';
        return 'bg-surface-alt text-ink ';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4">
        <input
          type="text"
          placeholder="Tìm theo mã căn hộ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-brand-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-surface text-ink placeholder:text-ink-faint"
        />
      </div>
      <div className="overflow-y-auto flex-grow">
        {filteredApartments.length === 0 ? (
          <p className="text-center text-ink-soft p-4">
            {apartments.length === 0 ? 'Chưa có căn hộ nào.' : 'Không tìm thấy căn hộ.'}
          </p>
        ) : (
          <ul>
            {filteredApartments.map((apt) => (
              <li key={apt.id}>
                <button
                  onClick={() => onSelectApartment(apt.id)}
                  className={`w-full text-left p-3 flex items-center gap-4 transition-colors border-l-4 cursor-pointer ${
                    selectedApartmentId === apt.id
                      ? 'bg-accent-soft border-accent'
                      : 'border-transparent hover:bg-surface-alt'
                  }`}
                >
                  <div className="flex items-center justify-center w-8 h-8 flex-shrink-0">
                    <div
                      className={`w-3 h-3 rounded-full ${apartmentOccupancyStatus[apt.id] ? 'bg-brand-success' : 'bg-ink-faint'}`}
                      title={apartmentOccupancyStatus[apt.id] ? 'Đang có cư dân' : 'Trống'}
                    ></div>
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-ink">{apt.code}</p>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${getHouseTypeBadgeColor(apt.houseType)}`}
                      >
                        {apt.houseType}
                      </span>
                    </div>
                    <p className="text-sm text-ink-soft">
                      Tầng {apt.floor} • {apt.area}m²
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ApartmentList;
