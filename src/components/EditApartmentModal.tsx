import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import type { Apartment } from '../types';
import { api } from '../services/api';

interface EditApartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateApartment: (apartmentId: string, apartmentData: Omit<Apartment, 'id'>) => void;
  apartment: Apartment | null;
}

const EditApartmentModal: React.FC<EditApartmentModalProps> = ({
  isOpen,
  onClose,
  onUpdateApartment,
  apartment,
}) => {
  const [phases, setPhases] = useState<any[]>([]);
  const [houseType, setHouseType] = useState<string>('CANTATA');
  const [buildingNumber, setBuildingNumber] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [area, setArea] = useState('');
  const [electricityType, setElectricityType] = useState<'RESIDENTIAL' | 'BUSINESS'>('RESIDENTIAL');

  useEffect(() => {
    if (isOpen) {
      api.get('/project-phases').then((res: any) => {
        if (res && res.success && res.phases) {
          setPhases(res.phases);
        }
      }).catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (apartment) {
      setHouseType(apartment.houseType);
      setFloor(String(apartment.floor));
      setArea(String(apartment.area));
      setElectricityType(apartment.electricityType || 'RESIDENTIAL');

      const codeParts = apartment.code.split('-');
      if (codeParts.length === 2) {
        const prefix = apartment.houseType === 'CANTATA' ? 'CAN' : apartment.houseType === 'TESLA' ? 'TES' : apartment.houseType.slice(0, 3).toUpperCase();
        setBuildingNumber(codeParts[0].replace(prefix, ''));
        setUnitNumber(codeParts[1]);
      }
    }
  }, [apartment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apartment || !houseType || !buildingNumber || !unitNumber || !floor || !area) return;

    const prefix = houseType === 'CANTATA' ? 'CAN' : houseType === 'TESLA' ? 'TES' : houseType.slice(0, 3).toUpperCase();
    const building = String(buildingNumber).padStart(2, '0');
    const unit = String(unitNumber).padStart(2, '0');
    const code = `${prefix}${building}-${unit}`;

    onUpdateApartment(apartment.id, {
      houseType: houseType as any,
      code,
      floor: parseInt(floor),
      area: parseFloat(area),
      electricityType,
    });

    onClose();
  };

  if (!apartment) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Chỉnh Sửa Căn Hộ: ${apartment.code}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="houseType-edit"
            className="block text-sm font-medium text-ink"
          >
            Phân Khu / Loại Nhà
          </label>
          <select
            id="houseType-edit"
            value={houseType}
            onChange={(e) => setHouseType(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-brand-border rounded-md shadow-sm focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none bg-surface text-ink font-semibold"
          >
            {phases.length > 0 ? (
              phases.map((p) => (
                <option key={p.id} value={p.phase_code}>
                  {p.phase_code} - {p.phase_name}
                </option>
              ))
            ) : (
              <>
                <option value="CANTATA">CANTATA</option>
                <option value="TESLA">TESLA</option>
              </>
            )}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">
            Mã Căn Hộ
          </label>
          <div className="mt-1 grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2">
            <span className="text-ink-soft font-semibold">
              {houseType === 'CANTATA' ? 'CAN' : 'TES'}
            </span>
            <input
              type="number"
              placeholder="Số toà"
              value={buildingNumber}
              onChange={(e) => setBuildingNumber(e.target.value)}
              className="block w-full px-3 py-2 border border-brand-border rounded-md shadow-sm focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none bg-surface text-ink placeholder:text-ink-faint"
              required
              min="1"
              max="99"
            />
            <span className="text-ink-soft">-</span>
            <input
              type="number"
              placeholder="Số căn"
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              className="block w-full px-3 py-2 border border-brand-border rounded-md shadow-sm focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none bg-surface text-ink placeholder:text-ink-faint"
              required
              min="1"
              max="99"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="floor-edit"
            className="block text-sm font-medium text-ink"
          >
            Tầng
          </label>
          <input
            type="number"
            id="floor-edit"
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-brand-border rounded-md shadow-sm focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none bg-surface text-ink"
            required
          />
        </div>
        <div>
          <label
            htmlFor="area-edit"
            className="block text-sm font-medium text-ink"
          >
            Diện tích (m²)
          </label>
          <input
            type="number"
            id="area-edit"
            step="0.1"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-brand-border rounded-md shadow-sm focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none bg-surface text-ink"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink">
            Loại hình Điện
          </label>
          <div className="mt-2 flex items-center gap-4">
            <div className="flex items-center">
              <input
                id="residential-edit"
                name="electricityType-edit"
                type="radio"
                value="RESIDENTIAL"
                checked={electricityType === 'RESIDENTIAL'}
                onChange={(e) => setElectricityType(e.target.value as 'RESIDENTIAL' | 'BUSINESS')}
                className="h-4 w-4 text-accent border-brand-border focus:ring-accent/30 cursor-pointer"
              />
              <label
                htmlFor="residential-edit"
                className="ml-2 block text-sm text-ink cursor-pointer"
              >
                Sinh hoạt
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="business-edit"
                name="electricityType-edit"
                type="radio"
                value="BUSINESS"
                checked={electricityType === 'BUSINESS'}
                onChange={(e) => setElectricityType(e.target.value as 'RESIDENTIAL' | 'BUSINESS')}
                className="h-4 w-4 text-accent border-brand-border focus:ring-accent/30 cursor-pointer"
              />
              <label
                htmlFor="business-edit"
                className="ml-2 block text-sm text-ink cursor-pointer"
              >
                Kinh doanh
              </label>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-surface-alt text-ink rounded-md hover:brightness-95 transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md transition-colors cursor-pointer"
          >
            Lưu thay đổi
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditApartmentModal;
