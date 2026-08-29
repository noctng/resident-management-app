import React, { useState, useEffect , useRef} from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { api } from '../services/api';
import { useToast, useConfirm } from './ui';
import {
  WrenchScrewdriverIcon,
  PlusIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserIcon,
} from './icons';

export interface Contractor {
  id: string;
  code: string;
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  trade_type: string;
  rating?: number | null;
  is_active: boolean;
  _count?: {
    warranty_claims: number;
  };
}

interface ContractorManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContractorUpdated?: () => void;
}

export const ContractorManagementModal: React.FC<ContractorManagementModalProps> = ({
  isOpen,
  onClose,
  onContractorUpdated,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen);

  const toast = useToast();
  const { confirm } = useConfirm();

  const [loading, setLoading] = useState(false);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [form, setForm] = useState({
    code: '',
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    trade_type: 'GENERAL',
  });

  useEffect(() => {
    if (isOpen) {
      loadContractors();
    }
  }, [isOpen]);

  const loadContractors = async () => {
    try {
      setLoading(true);
      const res: any = await api.get('/operations/warranty/contractors');
      if (res && res.success) {
        setContractors(res.contractors || []);
      }
    } catch (err: any) {
      toast.error('Lỗi tải danh mục nhà thầu: ' + (err.message || 'Lỗi server'));
    } finally {
      setLoading(false);
    }
  };

  const handleStartCreate = () => {
    setEditingContractor(null);
    setForm({
      code: `NT-${Date.now().toString().slice(-4)}`,
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      trade_type: 'GENERAL',
    });
    setIsCreating(true);
  };

  const handleStartEdit = (c: Contractor) => {
    setIsCreating(false);
    setEditingContractor(c);
    setForm({
      code: c.code,
      name: c.name,
      contact_person: c.contact_person || '',
      phone: c.phone || '',
      email: c.email || '',
      trade_type: c.trade_type || 'GENERAL',
    });
  };

  const getTradeLabel = (trade: string) => {
    switch (trade) {
      case 'ME': return 'Cơ Điện & Nước (M&E)';
      case 'ALUMINUM_GLASS': return 'Cửa & Nhôm Kính';
      case 'PAINTING': return 'Sơn Bả & Hoàn Thiện';
      case 'WATERPROOFING': return 'Chống Thấm & Kết Cấu';
      case 'INTERIOR': return 'Nội Thất & Tủ Bếp';
      case 'GENERAL': return 'Xây Dựng Tổng Hợp';
      default: return trade;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Vui lòng nhập tên công ty / nhà thầu');
      return;
    }

    try {
      if (isCreating) {
        const res: any = await api.post('/operations/warranty/contractors', form);
        if (res && res.success) {
          toast.success('Thêm nhà thầu mới thành công!');
          setIsCreating(false);
          loadContractors();
          if (onContractorUpdated) onContractorUpdated();
        }
      } else if (editingContractor) {
        const res: any = await api.put(`/operations/warranty/contractors/${editingContractor.id}`, form);
        if (res && res.success) {
          toast.success('Cập nhật nhà thầu thành công!');
          setEditingContractor(null);
          loadContractors();
          if (onContractorUpdated) onContractorUpdated();
        }
      }
    } catch (err: any) {
      toast.error('Lỗi thao tác: ' + (err.message || 'Lỗi server'));
    }
  };

  const handleDelete = async (c: Contractor) => {
    const isOk = await confirm({
      title: 'Xóa / Vô Hiệu Hóa Nhà Thầu',
      description: `Bạn có chắc muốn xóa nhà thầu "${c.name}" (${c.code}) không?`,
      variant: 'danger',
      confirmLabel: 'Xác Nhận',
      cancelLabel: 'Hủy',
    });

    if (!isOk) return;

    try {
      const res: any = await api.delete(`/operations/warranty/contractors/${c.id}`);
      if (res && res.success) {
        toast.success(res.message || 'Đã xóa nhà thầu thành công!');
        loadContractors();
        if (onContractorUpdated) onContractorUpdated();
      }
    } catch (err: any) {
      toast.error('Lỗi xóa: ' + (err.message || 'Lỗi server'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" ref={dialogRef} role="dialog" aria-modal="true">
      <div className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-4xl overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-warning-soft text-brand-warning flex items-center justify-center">
              <WrenchScrewdriverIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-ink text-base">Danh Bạ Quản Lý Nhà Thầu (Thi Công & Bảo Hành)</h3>
              <p className="text-xs text-ink-soft">Danh sách các đối tác cơ điện, nhôm kính, chống thấm & hoàn thiện</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-ink-soft hover:text-ink rounded-lg transition-colors cursor-pointer" aria-label="Đóng">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Top Actions */}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink text-sm">
              Hiện có {contractors.length} đơn vị nhà thầu đối tác
            </span>
            {!isCreating && !editingContractor && (
              <button
                type="button"
                onClick={handleStartCreate}
                className="px-3.5 py-2 bg-brand-warning hover:bg-brand-warning/90 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <PlusIcon className="w-4 h-4" />
                <span>+ Thêm Nhà Thầu Mới</span>
              </button>
            )}
          </div>

          {/* Form Create / Edit */}
          {(isCreating || editingContractor) && (
            <form onSubmit={handleSubmit} className="bg-surface-alt p-4 rounded-xl border border-brand-warning/40 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-brand-border">
                <span className="font-bold text-ink text-sm">
                  {isCreating ? '➕ Thêm Nhà Thầu Đối Tác Mới' : `✏️ Cập Nhật Nhà Thầu: ${editingContractor?.name}`}
                </span>
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); setEditingContractor(null); }}
                  className="text-ink-soft hover:text-ink font-semibold"
                >
                  Đóng Form
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">
                    Mã Nhà Thầu <span className="text-brand-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isCreating}
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-ink font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-warning disabled:opacity-60"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-ink-soft mb-1">
                    Tên Công Ty / Đơn Vị Thi Công <span className="text-brand-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Công ty TNHH Cơ Điện & Lạnh Hawee"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-brand-warning"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Người Phụ Trách / Chỉ Huy Trưởng</label>
                  <input
                    type="text"
                    placeholder="VD: KS. Nguyễn Văn Nam"
                    value={form.contact_person}
                    onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand-warning"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Số Điện Thoại Hotline</label>
                  <input
                    type="text"
                    placeholder="0987.xxx.xxx"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand-warning font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Email Liên Hệ</label>
                  <input
                    type="email"
                    placeholder="contact@contractor.vn"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand-warning"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Chuyên Môn & Hạng Mục Thi Công</label>
                <select
                  value={form.trade_type}
                  onChange={(e) => setForm({ ...form, trade_type: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-brand-warning cursor-pointer"
                >
                  <option value="ME">Cơ Điện & Nước (M&E)</option>
                  <option value="ALUMINUM_GLASS">Cửa & Nhôm Kính Eurowindow</option>
                  <option value="PAINTING">Sơn Bả & Hoàn Thiện</option>
                  <option value="WATERPROOFING">Chống Thấm & Xử Lý Nứt</option>
                  <option value="INTERIOR">Nội Thất & Tủ Bếp</option>
                  <option value="GENERAL">Xây Dựng Tổng Hợp</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); setEditingContractor(null); }}
                  className="px-3 py-1.5 bg-surface border border-brand-border text-ink rounded-lg font-semibold hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-warning hover:bg-brand-warning/90 text-white rounded-lg font-bold transition-colors cursor-pointer shadow-xs"
                >
                  {isCreating ? 'Lưu Nhà Thầu' : 'Cập Nhật'}
                </button>
              </div>
            </form>
          )}

          {/* Contractors Table */}
          <div className="border border-brand-border rounded-xl overflow-hidden bg-surface">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-alt border-b border-brand-border text-[11px] text-ink-soft uppercase tracking-wider">
                  <th className="py-3 px-4 font-bold">Mã & Tên Nhà Thầu</th>
                  <th className="py-3 px-4 font-bold">Chuyên Môn</th>
                  <th className="py-3 px-4 font-bold">Người Phụ Trách & SĐT</th>
                  <th className="py-3 px-4 font-bold">Đánh Giá CSAT</th>
                  <th className="py-3 px-4 font-bold text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {contractors.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-ink-soft">
                      Chưa có nhà thầu nào được tạo.
                    </td>
                  </tr>
                ) : (
                  contractors.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-alt/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] font-bold text-brand-warning bg-brand-warning-soft px-1.5 py-0.5 rounded mr-1.5">
                          {c.code}
                        </span>
                        <strong className="text-ink font-semibold">{c.name}</strong>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-alt text-ink border border-brand-border">
                          {getTradeLabel(c.trade_type)}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {c.contact_person && (
                          <div className="font-semibold text-ink flex items-center gap-1">
                            <UserIcon className="w-3 h-3 text-ink-soft" />
                            <span>{c.contact_person}</span>
                          </div>
                        )}
                        {c.phone && (
                          <div className="text-[11px] text-ink-soft font-mono flex items-center gap-1 mt-0.5">
                            <PhoneIcon className="w-3 h-3" />
                            <span>{c.phone}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-brand-warning font-bold font-mono">
                          ⭐ {c.rating ? Number(c.rating).toFixed(1) : '5.0'} / 5.0
                        </span>
                        {c._count && (
                          <span className="text-[10px] text-ink-soft block mt-0.5">
                            {c._count.warranty_claims} sự cố đã gán
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(c)}
                            className="p-1.5 text-ink-soft hover:text-accent hover:bg-surface-alt rounded-lg transition-colors cursor-pointer"
                            title="Chỉnh sửa"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c)}
                            className="p-1.5 text-ink-soft hover:text-brand-danger hover:bg-brand-danger-soft rounded-lg transition-colors cursor-pointer"
                            title="Xóa nhà thầu"
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

export default ContractorManagementModal;
