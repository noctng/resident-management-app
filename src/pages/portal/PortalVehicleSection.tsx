import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../components/ui';
import {
  TruckIcon,
  PlusIcon,
  ArrowPathIcon,
  XMarkIcon,
  CheckCircleIcon,
} from '../../components/icons';

interface PortalVehicleSectionProps {
  apartmentId: string;
  apartmentCode: string;
}

export const PortalVehicleSection: React.FC<PortalVehicleSectionProps> = ({
  apartmentId,
  apartmentCode,
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const [registerForm, setRegisterForm] = useState({
    vehicle_type: 'MOTORBIKE',
    license_plate: '',
  });

  useEffect(() => {
    loadVehicles();
  }, [apartmentId]);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const res: any = await api.get(`/vehicles/apartment/${apartmentId}`);
      if (res && res.success) {
        setVehicles(res.vehicles || []);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách xe:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.post('/vehicles/register', {
        apartment_id: apartmentId,
        vehicle_type: registerForm.vehicle_type,
        license_plate: registerForm.license_plate,
      });
      if (res && res.success) {
        toast.success('Đăng ký phương tiện thành công! Thẻ xe đang được BQL kích hoạt.');
        setIsRegisterModalOpen(false);
        setRegisterForm({ vehicle_type: 'MOTORBIKE', license_plate: '' });
        loadVehicles();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi đăng ký xe');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-surface rounded-2xl p-5 border border-brand-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <TruckIcon className="w-5 h-5 text-accent" />
            <span>Quản Lý Thẻ Xe & Phương Tiện Căn {apartmentCode}</span>
          </h2>
          <p className="text-xs text-ink-soft mt-1">
            Đăng ký thẻ xe thông minh RFID cho ô tô và xe máy để thuận tiện ra vào hầm gửi xe KĐT.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsRegisterModalOpen(true)}
          className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <PlusIcon className="w-4 h-4" />
          <span>+ Đăng Ký Thẻ Xe Mới</span>
        </button>
      </div>

      {/* Vehicles Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-ink-soft bg-surface rounded-xl border border-brand-border">
          <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto text-accent mb-2" />
          <p className="text-xs">Đang tải danh sách phương tiện...</p>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="p-12 text-center text-ink-soft bg-surface rounded-xl border border-dashed border-brand-border space-y-3">
          <TruckIcon className="w-12 h-12 mx-auto text-ink-faint" />
          <p className="font-bold text-ink text-sm">Chưa có phương tiện nào được đăng ký</p>
          <p className="text-xs text-ink-soft max-w-md mx-auto">
            Bấm "+ Đăng Ký Thẻ Xe Mới" để cấp thẻ từ RFID cho phương tiện của gia đình bạn.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {vehicles.map((v) => (
            <div key={v.id} className="bg-surface rounded-2xl border border-brand-border p-4 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink-soft">
                  {v.vehicle_type === 'CAR' ? '🚗 Ô Tô' : '🛵 Xe Máy / Xe Điện'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-brand-success-soft text-brand-success text-[10px] font-bold">
                  Đang Sử Dụng
                </span>
              </div>

              <div className="text-lg font-bold font-mono text-accent text-center py-2 bg-surface-alt rounded-xl border border-brand-border">
                {v.license_plate}
              </div>

              <div className="text-[11px] text-ink-soft flex justify-between">
                <span>Ngày đăng ký:</span>
                <span className="font-mono text-ink">{new Date(v.created_at).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL: REGISTER VEHICLE ── */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-2xl border border-brand-border w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h3 className="font-bold text-ink text-sm flex items-center gap-2">
                <TruckIcon className="w-5 h-5 text-accent" />
                <span>Đăng Ký Thẻ Xe Căn Hộ {apartmentCode}</span>
              </h3>
              <button onClick={() => setIsRegisterModalOpen(false)} className="p-1 text-ink-soft hover:text-ink cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">Loại phương tiện</label>
                <select
                  value={registerForm.vehicle_type}
                  onChange={(e) => setRegisterForm({ ...registerForm, vehicle_type: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 cursor-pointer"
                >
                  <option value="MOTORBIKE">Xe Máy / Xe Máy Điện</option>
                  <option value="CAR">Ô Tô (4 - 7 Chỗ)</option>
                  <option value="BICYCLE">Xe Đạp / Xe Đạp Điện</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">
                  Biển kiểm soát (Biển số xe) <span className="text-brand-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={registerForm.license_plate}
                  onChange={(e) => setRegisterForm({ ...registerForm, license_plate: e.target.value.toUpperCase() })}
                  placeholder="VD: 47B1-123.45 hoặc 47A-888.88"
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink font-mono font-bold focus:outline-none focus:ring-2 focus:ring-accent/30 uppercase"
                />
              </div>

              <div className="pt-3 border-t border-brand-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl font-bold hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Đăng Ký Cấp Thẻ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalVehicleSection;
