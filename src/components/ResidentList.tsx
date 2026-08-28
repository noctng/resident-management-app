import React, { useState } from 'react';
import type { Resident } from '../types';
import { UserIcon } from './icons';

interface ResidentListProps {
  residents: Resident[];
  selectedResidentId: string | null;
  onSelectResident: (id: string) => void;
}

const relationshipStatusMap: Record<Resident['relationshipStatus'], string> = {
  OWNER: 'Chủ sở hữu',
  FAMILY: 'Thành viên',
  TENANT: 'Khách thuê',
};

const ResidentList: React.FC<ResidentListProps> = ({
  residents,
  selectedResidentId,
  onSelectResident,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const filteredResidents = residents
    .filter((res) => showInactive || res.isActive)
    .filter(
      (res) =>
        (res.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (res.idNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 space-y-2">
        <input
          type="text"
          placeholder="Tìm theo tên hoặc CCCD..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-brand-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-surface text-ink placeholder:text-ink-faint"
        />
        <div className="flex items-center">
          <input
            id="show-inactive"
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="h-4 w-4 rounded border-brand-border text-accent focus:ring-accent/30 cursor-pointer"
          />
          <label
            htmlFor="show-inactive"
            className="ml-2 block text-sm text-ink cursor-pointer"
          >
            Hiển thị cư dân đã ngừng kích hoạt
          </label>
        </div>
      </div>
      <div className="overflow-y-auto flex-grow">
        {filteredResidents.length === 0 ? (
          <p className="text-center text-ink-soft p-4">
            {residents.length === 0 ? 'Chưa có cư dân nào.' : 'Không tìm thấy cư dân.'}
          </p>
        ) : (
          <ul>
            {filteredResidents.map((res) => (
              <li key={res.id}>
                <button
                  onClick={() => onSelectResident(res.id)}
                  className={`w-full text-left p-3 flex items-center gap-4 transition-colors border-l-4 cursor-pointer ${
                    selectedResidentId === res.id
                      ? 'bg-accent-soft border-accent'
                      : 'border-transparent hover:bg-surface-alt'
                  } ${!res.isActive ? 'opacity-50' : ''}`}
                >
                  <div className="w-10 h-10 rounded-full bg-surface-alt flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-6 h-6 text-ink-soft" />
                  </div>
                  <div>
                    <p className={`font-semibold text-ink`}>{res.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-ink-soft">
                        CCCD: {res.idNumber}
                      </p>
                      <span className="text-xs text-ink-faint">•</span>
                      <p className="text-sm text-ink-soft">
                        {relationshipStatusMap[res.relationshipStatus]}
                      </p>
                    </div>
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

export default ResidentList;
