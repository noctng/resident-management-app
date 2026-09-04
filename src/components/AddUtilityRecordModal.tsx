import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import type { Apartment, UtilityRecord } from '../types';

interface AddUtilityRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRecord: (data: {
    apartmentId: string;
    month: number;
    year: number;
    newElectricityReading: number;
    newWaterReading: number;
  }) => void;
  apartment: Apartment | null;
  latestRecord: UtilityRecord | null;
}

const AddUtilityRecordModal: React.FC<AddUtilityRecordModalProps> = ({
  isOpen,
  onClose,
  onAddRecord,
  apartment,
  latestRecord,
}) => {
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [newElectricity, setNewElectricity] = useState('');
  const [newWater, setNewWater] = useState('');
  const [error, setError] = useState('');

  const oldElectricityReading = latestRecord?.electricity_new_reading ?? 0;
  const oldWaterReading = latestRecord?.water_new_reading ?? 0;

  const inputStyle =
    'mt-1 block w-full px-3 py-2 border border-brand-border rounded-md shadow-sm focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none bg-surface text-ink';

  useEffect(() => {
    if (isOpen) {
      const nextDate = new Date();
      if (latestRecord) {
        const lastDate = new Date(latestRecord.year, latestRecord.month - 1);
        lastDate.setMonth(lastDate.getMonth() + 1);
        nextDate.setFullYear(lastDate.getFullYear());
        nextDate.setMonth(lastDate.getMonth());
      }
      setMonth((nextDate.getMonth() + 1).toString());
      setYear(nextDate.getFullYear().toString());
      setNewElectricity('');
      setNewWater('');
      setError('');
    }
  }, [isOpen, latestRecord]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apartment || !month || !year || !newElectricity || !newWater) return;

    const newElecValue = parseFloat(newElectricity);
    const newWaterValue = parseFloat(newWater);

    if (newElecValue < oldElectricityReading || newWaterValue < oldWaterReading) {
      setError('Chỉ số mới không được nhỏ hơn chỉ số cũ.');
      return;
    }
    setError('');

    onAddRecord({
      apartmentId: apartment.id,
      month: parseInt(month),
      year: parseInt(year),
      newElectricityReading: newElecValue,
      newWaterReading: newWaterValue,
    });

    onClose();
  };

  if (!apartment) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Thêm Điện Nước cho ${apartment.code}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="month"
              className="block text-sm font-medium text-ink"
            >
              Tháng
            </label>
            <input
              type="number"
              id="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              required
              min="1"
              max="12"
              className={inputStyle}
            />
          </div>
          <div>
            <label
              htmlFor="year"
              className="block text-sm font-medium text-ink"
            >
              Năm
            </label>
            <input
              type="number"
              id="year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              required
              min="2000"
              className={inputStyle}
            />
          </div>
        </div>

        {/* Electricity */}
        <fieldset className="border border-brand-border p-4 rounded-md">
          <legend className="text-sm font-medium text-ink px-2">
            Chỉ số Điện (kWh)
          </legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-soft">
                Chỉ số cũ
              </label>
              <p className="mt-1 p-2 bg-surface-alt font-mono tabular-nums rounded-md text-ink">
                {oldElectricityReading}
              </p>
            </div>
            <div>
              <label
                htmlFor="new-electricity"
                className="block text-xs font-medium text-ink-soft"
              >
                Chỉ số mới
              </label>
              <input
                type="number"
                step="0.1"
                id="new-electricity"
                value={newElectricity}
                onChange={(e) => setNewElectricity(e.target.value)}
                required
                min={oldElectricityReading}
                className={inputStyle}
              />
            </div>
          </div>
        </fieldset>

        {/* Water */}
        <fieldset className="border border-brand-border p-4 rounded-md">
          <legend className="text-sm font-medium text-ink px-2">
            Chỉ số Nước (m³)
          </legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-soft">
                Chỉ số cũ
              </label>
              <p className="mt-1 p-2 bg-surface-alt font-mono tabular-nums rounded-md text-ink">
                {oldWaterReading}
              </p>
            </div>
            <div>
              <label
                htmlFor="new-water"
                className="block text-xs font-medium text-ink-soft"
              >
                Chỉ số mới
              </label>
              <input
                type="number"
                step="0.1"
                id="new-water"
                value={newWater}
                onChange={(e) => setNewWater(e.target.value)}
                required
                min={oldWaterReading}
                className={inputStyle}
              />
            </div>
          </div>
        </fieldset>

        {error && <p className="text-sm text-brand-danger text-center">{error}</p>}

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
            Lưu
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddUtilityRecordModal;
