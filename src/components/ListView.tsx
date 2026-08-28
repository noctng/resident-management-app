import React, { useState } from 'react';
import type { Apartment, Resident } from '../types';
import ApartmentList from './ApartmentList';
import ResidentList from './ResidentList';
import { PlusIcon } from './icons';

type ActiveTab = 'apartments' | 'residents';

interface ListViewProps {
  apartments: Apartment[];
  residents: Resident[];
  selectedItem: { type: 'apartment' | 'resident'; id: string } | null;
  onSelectItem: (item: { type: 'apartment' | 'resident'; id: string }) => void;
  onAddApartment: () => void;
  onAddResident: () => void;
  apartmentOccupancyStatus: Record<string, boolean>;
}

const ListView: React.FC<ListViewProps> = ({
  apartments,
  residents,
  selectedItem,
  onSelectItem,
  onAddApartment,
  onAddResident,
  apartmentOccupancyStatus,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('apartments');

  const getTabClass = (tabName: ActiveTab) => {
    const baseClass =
      'w-1/2 py-3 text-center font-semibold border-b-2 transition-colors focus:outline-none';
    if (activeTab === tabName) {
      return `${baseClass} text-accent border-accent`;
    }
    return `${baseClass} text-ink-soft border-transparent hover:bg-surface-alt hover:border-brand-border`;
  };

  const handleSelectApartment = (id: string) => {
    onSelectItem({ type: 'apartment', id });
  };

  const handleSelectResident = (id: string) => {
    onSelectItem({ type: 'resident', id });
  };

  return (
    <div className="bg-surface rounded-lg shadow-lg h-full flex flex-col">
      {/* Tab Headers */}
      <div className="flex border-b border-brand-border px-4">
        <button onClick={() => setActiveTab('apartments')} className={getTabClass('apartments')}>
          Căn Hộ
        </button>
        <button onClick={() => setActiveTab('residents')} className={getTabClass('residents')}>
          Cư Dân
        </button>
      </div>

      {/* Header with Add button */}
      <div className="p-4 border-b border-brand-border flex justify-between items-center">
        <h2 className="text-xl font-bold text-ink">
          {activeTab === 'apartments' ? 'Danh sách Căn hộ' : 'Danh sách Cư dân'}
        </h2>
        <button
          onClick={activeTab === 'apartments' ? onAddApartment : onAddResident}
          className="p-2 rounded-full bg-accent-soft text-accent-ink hover:brightness-95 transition-colors cursor-pointer"
          aria-label={activeTab === 'apartments' ? 'Thêm căn hộ mới' : 'Thêm cư dân mới'}
        >
          <PlusIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-grow overflow-hidden">
        {activeTab === 'apartments' && (
          <ApartmentList
            apartments={apartments}
            selectedApartmentId={selectedItem?.type === 'apartment' ? selectedItem.id : null}
            onSelectApartment={handleSelectApartment}
            apartmentOccupancyStatus={apartmentOccupancyStatus}
          />
        )}
        {activeTab === 'residents' && (
          <ResidentList
            residents={residents}
            selectedResidentId={selectedItem?.type === 'resident' ? selectedItem.id : null}
            onSelectResident={handleSelectResident}
          />
        )}
      </div>
    </div>
  );
};

export default ListView;
