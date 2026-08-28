import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast, useConfirm } from './ui';
import {
  BuildingOfficeIcon,
  PlusIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  SparklesIcon,
  Squares2x2Icon,
} from './icons';

export interface ProjectPhase {
  id: string;
  phase_code: string;
  phase_name: string;
  description?: string | null;
  apartment_count?: number;
  display_order?: number;
  is_active: boolean;
  created_at?: string;
}

interface PhaseManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhaseUpdated?: () => void;
}

export const PhaseManagementModal: React.FC<PhaseManagementModalProps> = ({
  isOpen,
  onClose,
  onPhaseUpdated,
}) => {
  const toast = useToast();
  const { confirm } = useConfirm();

  const [loading, setLoading] = useState(false);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [editingPhase, setEditingPhase] = useState<ProjectPhase | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [form, setForm] = useState({
    phase_code: '',
    phase_name: '',
    description: '',
    display_order: 0,
  });

  useEffect(() => {
    if (isOpen) {
      loadPhases();
    }
  }, [isOpen]);

  const loadPhases = async () => {
    try {
      setLoading(true);
      const res: any = await api.get('/project-phases');
      if (res && res.success) {
        setPhases(res.phases || []);
      }
    } catch (err: any) {
      toast.error('Lỗi tải danh sách phân khu: ' + (err.message || 'Lỗi server'));
    } finally {
      setLoading(false);
    }
  };

  const handleStartCreate = () => {
    setEditingPhase(null);
    setForm({
      phase_code: '',
      phase_name: '',
      description: '',
      display_order: phases.length + 1,
    });
    setIsCreating(true);
  };

  const handleStartEdit = (p: ProjectPhase) => {
    setIsCreating(false);
    setEditingPhase(p);
    setForm({
      phase_code: p.phase_code,
      phase_name: p.phase_name,
      description: p.description || '',
      display_order: p.display_order || 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phase_name.trim()) {
      toast.error('Vui lòng nhập tên phân khu');
      return;
    }

    try {
      if (isCreating) {
        if (!form.phase_code.trim()) {
          toast.error('Vui lòng nhập mã viết tắt phân khu');
          return;
        }
        const res: any = await api.post('/project-phases', form);
        if (res && res.success) {
          toast.success(res.message || 'Thêm phân khu thành công!');
          setIsCreating(false);
          loadPhases();
          if (onPhaseUpdated) onPhaseUpdated();
        }
      } else if (editingPhase) {
        const res: any = await api.put(`/project-phases/${editingPhase.id}`, {
          phase_name: form.phase_name,
          description: form.description,
          display_order: form.display_order,
        });
        if (res && res.success) {
          toast.success('Cập nhật phân khu thành công!');
          setEditingPhase(null);
          loadPhases();
          if (onPhaseUpdated) onPhaseUpdated();
        }
      }
    } catch (err: any) {
      toast.error('Lỗi thao tác: ' + (err.message || 'Lỗi server'));
    }
  };

  const handleDelete = async (p: ProjectPhase) => {
    if (p.apartment_count && p.apartment_count > 0) {
      toast.error(`Phân khu "${p.phase_name}" đang có ${p.apartment_count} căn hộ. Không thể xóa!`);
      return;
    }

    const isOk = await confirm({
      title: 'Xóa Phân Khu Dự Án',
      description: `Bạn có chắc muốn xóa phân khu "${p.phase_name}" (${p.phase_code}) không?`,
      variant: 'danger',
      confirmLabel: 'Xác Nhận Xóa',
      cancelLabel: 'Hủy',
    });

    if (!isOk) return;

    try {
      const res: any = await api.delete(`/project-phases/${p.id}`);
      if (res && res.success) {
        toast.success(res.message || 'Đã xóa phân khu thành công!');
        loadPhases();
        if (onPhaseUpdated) onPhaseUpdated();
      }
    } catch (err: any) {
      toast.error('Lỗi xóa: ' + (err.message || 'Lỗi server'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-surface rounded-2xl shadow-2xl border border-brand-border w-full max-w-3xl overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
              <Squares2x2Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-ink text-base">Quản Lý Danh Sách Phân Khu Dự Án</h3>
              <p className="text-xs text-ink-soft">Thêm, sửa và định hình phân khu / phân kỳ bán hàng BĐS</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-ink-soft hover:text-ink rounded-lg transition-colors cursor-pointer">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Top Actions */}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink text-sm">
              Hiện có {phases.length} phân khu quy hoạch
            </span>
            {!isCreating && !editingPhase && (
              <button
                type="button"
                onClick={handleStartCreate}
                className="px-3.5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <PlusIcon className="w-4 h-4" />
                <span>+ Thêm Phân Khu Mới</span>
              </button>
            )}
          </div>

          {/* Form (Create or Edit) */}
          {(isCreating || editingPhase) && (
            <form onSubmit={handleSubmit} className="bg-surface-alt p-4 rounded-xl border border-accent/30 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-brand-border">
                <span className="font-bold text-ink text-sm">
                  {isCreating ? '➕ Thêm Phân Khu Quy Hoạch Mới' : `✏️ Chỉnh Sửa Phân Khu: ${editingPhase?.phase_name}`}
                </span>
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); setEditingPhase(null); }}
                  className="text-ink-soft hover:text-ink font-semibold"
                >
                  Đóng Form
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">
                    Mã Viết Tắt <span className="text-brand-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isCreating}
                    placeholder="VD: TESLA, CANTATA, DA_VINCI"
                    value={form.phase_code}
                    onChange={(e) => setForm({ ...form, phase_code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-ink font-mono font-bold focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
                  />
                  {isCreating && (
                    <span className="text-[10px] text-ink-faint mt-0.5 block">Chữ hoa không dấu, viết liền</span>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-ink-soft mb-1">
                    Tên Hiển Thị Phân Khu <span className="text-brand-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Phân khu Da Vinci - Biệt thự đơn lập ven hồ"
                    value={form.phase_name}
                    onChange={(e) => setForm({ ...form, phase_name: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Mô Tả Quy Hoạch & Đặc Điểm BĐS</label>
                <textarea
                  rows={2}
                  placeholder="Mô tả loại hình sản phẩm, tiện ích cảnh quan, tiêu chuẩn xây dựng..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); setEditingPhase(null); }}
                  className="px-3 py-1.5 bg-surface border border-brand-border text-ink rounded-lg font-semibold hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-bold transition-colors cursor-pointer shadow-xs"
                >
                  {isCreating ? 'Lưu Phân Khu' : 'Cập Nhật'}
                </button>
              </div>
            </form>
          )}

          {/* Table of Phases */}
          <div className="border border-brand-border rounded-xl overflow-hidden bg-surface">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-alt border-b border-brand-border text-[11px] text-ink-soft uppercase tracking-wider">
                  <th className="py-3 px-4 font-bold">Mã Phân Khu</th>
                  <th className="py-3 px-4 font-bold">Tên Phân Khu</th>
                  <th className="py-3 px-4 font-bold">Quy Mô</th>
                  <th className="py-3 px-4 font-bold">Mô Tả Quy Hoạch</th>
                  <th className="py-3 px-4 font-bold text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {phases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-ink-soft">
                      Chưa có phân khu nào được tạo.
                    </td>
                  </tr>
                ) : (
                  phases.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-alt/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-accent">
                        {p.phase_code}
                      </td>
                      <td className="py-3 px-4">
                        <strong className="text-ink font-semibold block">{p.phase_name}</strong>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-soft text-accent">
                          {p.apartment_count || 0} căn hộ
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-ink-soft" title={p.description || ''}>
                        {p.description || <span className="italic text-ink-faint">Chưa có mô tả</span>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(p)}
                            className="p-1.5 text-ink-soft hover:text-accent hover:bg-surface-alt rounded-lg transition-colors cursor-pointer"
                            title="Chỉnh sửa"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p)}
                            disabled={Boolean(p.apartment_count && p.apartment_count > 0)}
                            className="p-1.5 text-ink-soft hover:text-brand-danger hover:bg-brand-danger-soft rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title={p.apartment_count && p.apartment_count > 0 ? 'Không thể xóa phân khu đang có căn hộ' : 'Xóa phân khu'}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-brand-border bg-surface-alt flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl font-bold hover:bg-surface-alt transition-colors cursor-pointer text-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhaseManagementModal;
