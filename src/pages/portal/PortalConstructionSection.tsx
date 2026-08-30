import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../components/ui';
import {
  BuildingOfficeIcon,
  PlusIcon,
  ArrowPathIcon,
  XMarkIcon,
  UsersIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '../../components/icons';

interface PortalConstructionSectionProps {
  apartmentId: string;
  apartmentCode: string;
}

export const PortalConstructionSection: React.FC<PortalConstructionSectionProps> = ({
  apartmentId,
  apartmentCode,
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [selectedReg, setSelectedReg] = useState<any>(null);

  const [createForm, setCreateForm] = useState({
    contractor_name: '',
    contact_person: '',
    phone: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    scope_description: '',
    notes: '',
  });

  const [workerForm, setWorkerForm] = useState({
    full_name: '',
    id_number: '',
    phone: '',
    role: 'THO_CHINH',
  });

  useEffect(() => {
    loadRegistrations();
  }, [apartmentId]);

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      const res: any = await api.get(`/resident-portal/construction?apartmentId=${apartmentId}`);
      if (res && res.success) {
        const myRegs = (res.registrations || []).filter((r: any) => r.apartment_id === apartmentId);
        setRegistrations(myRegs);
      }
    } catch (err) {
      console.error('Lỗi tải hồ sơ thi công:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.post('/resident-portal/construction/register', {
        ...createForm,
        apartment_id: apartmentId,
      });
      if (res && res.success) {
        toast.success('Nộp hồ sơ đăng ký cải tạo thành công! Vui lòng nộp 100Tr tiền ký quỹ cho BQL.');
        setIsCreateModalOpen(false);
        loadRegistrations();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi lập hồ sơ thi công');
    }
  };

  const handleWorkerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReg) return;
    try {
      const res: any = await api.post(`/operations/construction/${selectedReg.id}/workers`, workerForm);
      if (res && res.success) {
        toast.success('Cấp thẻ tạm thi công thành công! Công nhân có thể dùng mã thẻ qua cổng bảo vệ.');
        setIsWorkerModalOpen(false);
        setWorkerForm({ full_name: '', id_number: '', phone: '', role: 'THO_CHINH' });
        loadRegistrations();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cấp thẻ thợ');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-surface rounded-2xl p-5 border border-brand-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <BuildingOfficeIcon className="w-5 h-5 text-accent" />
            <span>Đăng Ký Thi Công & Ký Quỹ Hoàn Thiện Căn {apartmentCode}</span>
          </h2>
          <p className="text-xs text-ink-soft mt-1">
            Quy định hoàn thiện trong vòng 6 tháng kể từ ngày bàn giao. Ký quỹ 100.000.000đ bảo lãnh mặt bằng (hoàn trả 100% sau nghiệm thu).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <PlusIcon className="w-4 h-4" />
          <span>+ Đăng Ký Thi Công Mới</span>
        </button>
      </div>

      {/* Registrations List */}
      {loading ? (
        <div className="p-12 text-center text-ink-soft bg-surface rounded-xl border border-brand-border">
          <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto text-accent mb-2" />
          <p className="text-xs">Đang tải hồ sơ thi công...</p>
        </div>
      ) : registrations.length === 0 ? (
        <div className="p-12 text-center text-ink-soft bg-surface rounded-xl border border-dashed border-brand-border space-y-3">
          <BuildingOfficeIcon className="w-12 h-12 mx-auto text-ink-faint" />
          <p className="font-bold text-ink text-sm">Chưa có hồ sơ đăng ký cải tạo nội thất</p>
          <p className="text-xs text-ink-soft max-w-md mx-auto">
            Trước khi tiến hành sửa chữa hoặc đóng đồ gỗ nội thất, bạn cần nộp hồ sơ đăng ký và nộp tiền ký quỹ để bảo vệ cấp phép cho thợ vào thi công.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {registrations.map((reg) => (
            <div key={reg.id} className="bg-surface rounded-2xl border border-brand-border p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-border pb-3">
                <div>
                  <strong className="font-mono text-accent text-base block">{reg.reg_code}</strong>
                  <span className="text-xs text-ink-soft">
                    Đơn vị thi công: <strong className="text-ink">{reg.contractor_name}</strong> ({reg.contact_person} - {reg.phone})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    reg.deposit_status === 'DEPOSITED'
                      ? 'bg-brand-success-soft text-brand-success'
                      : 'bg-brand-warning-soft text-brand-warning'
                  }`}>
                    {reg.deposit_status === 'DEPOSITED' ? '✓ Đã Nộp Ký Quỹ 100Tr' : 'Chờ Nộp 100Tr'}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-surface-alt text-ink">
                    {reg.status}
                  </span>
                </div>
              </div>

              {/* Workers passes */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-xs text-ink flex items-center gap-1.5">
                    <UsersIcon className="w-4 h-4 text-accent" />
                    <span>Danh Sách Thẻ Tạm Công Nhân ({reg.construction_workers?.length || 0})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReg(reg);
                      setIsWorkerModalOpen(true);
                    }}
                    className="px-2.5 py-1 bg-surface border border-brand-border text-ink hover:bg-surface-alt rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    + Đăng Ký Thợ Mới
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {reg.construction_workers?.map((w: any) => (
                    <div key={w.id} className="p-3 bg-surface-alt rounded-xl border border-brand-border text-xs space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span className="text-ink">{w.full_name}</span>
                        <span className="text-brand-success font-bold text-[10px]">{w.status}</span>
                      </div>
                      <p className="font-mono text-accent font-bold text-[11px]">Mã thẻ: {w.pass_code}</p>
                      <p className="text-ink-soft text-[10px]">Vai trò: {w.role} • CCCD: {w.id_number || 'N/A'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL: CREATE REGISTRATION ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h3 className="font-bold text-ink text-sm flex items-center gap-2">
                <BuildingOfficeIcon className="w-5 h-5 text-accent" />
                <span>Đăng Ký Cải Tạo Căn Hộ {apartmentCode}</span>
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 text-ink-soft hover:text-ink cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">Tên Đơn Vị Thi Công</label>
                <input
                  type="text"
                  required
                  value={createForm.contractor_name}
                  onChange={(e) => setCreateForm({ ...createForm, contractor_name: e.target.value })}
                  placeholder="VD: Công ty Nội Thất Nhà Xinh"
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Người Phụ Trách</label>
                  <input
                    type="text"
                    value={createForm.contact_person}
                    onChange={(e) => setCreateForm({ ...createForm, contact_person: e.target.value })}
                    placeholder="VD: Anh Hải"
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Số Điện Thoại</label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="09..."
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Ngày Bắt Đầu</label>
                  <input
                    type="date"
                    required
                    value={createForm.start_date}
                    onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Ngày Hoàn Thành</label>
                  <input
                    type="date"
                    required
                    value={createForm.end_date}
                    onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Phạm vi hạng mục cải tạo</label>
                <textarea
                  rows={2}
                  value={createForm.scope_description}
                  onChange={(e) => setCreateForm({ ...createForm, scope_description: e.target.value })}
                  placeholder="Lắp đặt tủ bếp, giường tủ, lát sàn gỗ..."
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>

              <div className="p-3 bg-brand-success-soft text-brand-success rounded-xl text-[11px]">
                <strong>Tiền ký quỹ 100.000.000đ:</strong> Nộp qua chuyển khoản BQL trước ngày bắt đầu thi công.
              </div>

              <div className="pt-3 border-t border-brand-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl font-bold hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Gửi Hồ Sơ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD WORKER ── */}
      {isWorkerModalOpen && selectedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h3 className="font-bold text-ink text-sm flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-accent" />
                <span>Đăng Ký Thẻ Tạm Cho Công Nhân</span>
              </h3>
              <button onClick={() => setIsWorkerModalOpen(false)} className="p-1 text-ink-soft hover:text-ink cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWorkerSubmit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">Họ và tên công nhân</label>
                <input
                  type="text"
                  required
                  value={workerForm.full_name}
                  onChange={(e) => setWorkerForm({ ...workerForm, full_name: e.target.value })}
                  placeholder="VD: Nguyễn Văn Nam"
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Số CCCD</label>
                  <input
                    type="text"
                    value={workerForm.id_number}
                    onChange={(e) => setWorkerForm({ ...workerForm, id_number: e.target.value })}
                    placeholder="0400..."
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink font-mono focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Vai trò</label>
                  <select
                    value={workerForm.role}
                    onChange={(e) => setWorkerForm({ ...workerForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 cursor-pointer"
                  >
                    <option value="THO_CHINH">Thợ chính</option>
                    <option value="THO_DIEN">Thợ điện</option>
                    <option value="THO_NUOC">Thợ nước</option>
                    <option value="THO_MOC">Thợ mộc</option>
                    <option value="THO_NE">Thợ nề / ốp lát</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-brand-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsWorkerModalOpen(false)}
                  className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl font-bold hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Cấp Thẻ Tạm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalConstructionSection;
