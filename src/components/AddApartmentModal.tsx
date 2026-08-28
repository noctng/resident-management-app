import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import type { Apartment } from '../types';
import { api } from '../services/api';

interface AddApartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddApartment: (apartment: Omit<Apartment, 'id'>) => void;
}

const AddApartmentModal: React.FC<AddApartmentModalProps> = ({
  isOpen,
  onClose,
  onAddApartment,
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
          if (res.phases.length > 0 && !res.phases.some((p: any) => p.phase_code === houseType)) {
            setHouseType(res.phases[0].phase_code);
          }
        }
      }).catch(console.error);
    }
  }, [isOpen]);

  const resetForm = () => {
    setHouseType('CANTATA');
    setBuildingNumber('');
    setUnitNumber('');
    setFloor('');
    setArea('');
    setElectricityType('RESIDENTIAL');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getPrefix = (phaseCode: string) => {
    if (phaseCode === 'CANTATA') return 'CAN';
    if (phaseCode === 'TESLA') return 'TES';
    return phaseCode.slice(0, 3).toUpperCase();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseType || !buildingNumber || !unitNumber || !floor || !area) return;

    const prefix = getPrefix(houseType);
    const building = String(buildingNumber).padStart(2, '0');
    const unit = String(unitNumber).padStart(2, '0');
    const code = `${prefix}${building}-${unit}`;

    onAddApartment({
      houseType: houseType as any,
      code,
      floor: parseInt(floor),
      area: parseFloat(area),
      electricityType,
    });

    handleClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Thêm Căn Hộ Mới">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="houseType"
            className="block text-xs font-semibold text-ink-soft mb-1"
          >
            Phân Khu / Loại Nhà
          </label>
          <select
            id="houseType"
            value={houseType}
            onChange={(e) => setHouseType(e.target.value)}
            className="mt-1 block w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors font-semibold"
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
          <label className="block text-xs font-semibold text-ink-soft mb-1">
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
              className="block w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              required
              min="1"
              max="99"
            />
            <span className="text-ink-faint">-</span>
            <input
              type="number"
              placeholder="Số căn"
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              className="block w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              required
              min="1"
              max="99"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="floor"
            className="block text-xs font-semibold text-ink-soft mb-1"
          >
            Tầng
          </label>
          <input
            type="number"
            id="floor"
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            className="mt-1 block w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            required
          />
        </div>
        <div>
          <label
            htmlFor="area"
            className="block text-xs font-semibold text-ink-soft mb-1"
          >
            Diện tích (m²)
          </label>
          <input
            type="number"
            id="area"
            step="0.1"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="mt-1 block w-full px-3 py-2 rounded-lg border border-brand-border bg-surface-alt focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-soft mb-1">
            Loại hình Điện
          </label>
          <div className="mt-2 flex items-center gap-4">
            <div className="flex items-center">
              <input
                id="residential"
                name="electricityType"
                type="radio"
                value="RESIDENTIAL"
                checked={electricityType === 'RESIDENTIAL'}
                onChange={(e) => setElectricityType(e.target.value as 'RESIDENTIAL' | 'BUSINESS')}
                className="h-4 w-4 accent-accent cursor-pointer"
              />
              <label
                htmlFor="residential"
                className="ml-2 block text-sm text-ink"
              >
                Sinh hoạt
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="business"
                name="electricityType"
                type="radio"
                value="BUSINESS"
                checked={electricityType === 'BUSINESS'}
                onChange={(e) => setElectricityType(e.target.value as 'RESIDENTIAL' | 'BUSINESS')}
                className="h-4 w-4 accent-accent cursor-pointer"
              />
              <label
                htmlFor="business"
                className="ml-2 block text-sm text-ink"
              >
                Kinh doanh
              </label>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          {/* Fix: Changed closing tag from </b-button> to </button> */}
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-lg hover:bg-surface-alt transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors cursor-pointer"
          >
            Thêm
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddApartmentModal;
