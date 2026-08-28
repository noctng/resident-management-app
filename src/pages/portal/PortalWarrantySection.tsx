import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../components/ui';
import {
  WrenchScrewdriverIcon,
  PlusIcon,
  ArrowPathIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ShieldCheckIcon,
  UserIcon,
} from '../../components/icons';

interface PortalWarrantySectionProps {
  apartmentId: string;
  apartmentCode: string;
  residentName: string;
}

export const PortalWarrantySection: React.FC<PortalWarrantySectionProps> = ({
  apartmentId,
  apartmentCode,
  residentName,
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<any[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);

  const [createForm, setCreateForm] = useState({
    category: 'DIEN_NUOC',
    location_detail: '',
    description: '',
    severity: 'NORMAL',
    notes: '',
  });

  const [acceptForm, setAcceptForm] = useState({
    customer_rating: 5,
    customer_signature: `Xác nhận bởi cư dân ${residentName}`,
    resolution_notes: 'Đã kiểm tra và hài lòng với chất lượng sửa chữa',
  });

  useEffect(() => {
    loadClaims();
  }, [apartmentId]);

  const loadClaims = async () => {
    try {
      setLoading(true);
      const res: any = await api.get(`/operations/warranty?apartment_id=${apartmentId}`);
      if (res && res.success) {
        setClaims(res.claims || []);
      }
    } catch (err) {
      console.error('Lỗi tải ticket bảo hành căn hộ:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.post('/operations/warranty', {
        ...createForm,
        apartment_id: apartmentId,
      });
      if (res && res.success) {
        toast.success('Gửi yêu cầu bảo hành thành công! BQL sẽ phản hồi trong 4–24h.');
        setIsCreateModalOpen(false);
        setCreateForm({
          category: 'DIEN_NUOC',
          location_detail: '',
          description: '',
          severity: 'NORMAL',
          notes: '',
        });
        loadClaims();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi gửi yêu cầu bảo hành');
    }
  };

  const handleAcceptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaim) return;
    try {
      const res: any = await api.patch(`/operations/warranty/${selectedClaim.id}/complete`, acceptForm);
      if (res && res.success) {
        toast.success('Cảm ơn bạn đã nghiệm thu và đánh giá dịch vụ bảo hành!');
        setIsAcceptModalOpen(false);
        loadClaims();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi nghiệm thu');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Warranty Status */}
      <div className="bg-surface rounded-2xl p-5 border border-brand-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <WrenchScrewdriverIcon className="w-5 h-5 text-accent" />
            <span>Dịch Vụ Bảo Hành Căn Hộ {apartmentCode}</span>
          </h2>
          <p className="text-xs text-ink-soft mt-1">
            Chính sách bảo hành kết cấu 60 tháng, hệ thống cơ điện/nhôm kính 24 tháng, thiết bị 12 tháng theo HĐMB.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <PlusIcon className="w-4 h-4" />
          <span>+ Báo Sự Cố Bảo Hành</span>
        </button>
      </div>

      {/* Claims List */}
      {loading ? (
        <div className="p-12 text-center text-ink-soft bg-surface rounded-xl border border-brand-border">
          <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto text-accent mb-2" />
          <p className="text-xs">Đang tải danh sách yêu cầu bảo hành...</p>
        </div>
      ) : claims.length === 0 ? (
        <div className="p-12 text-center text-ink-soft bg-surface rounded-xl border border-dashed border-brand-border space-y-3">
          <ShieldCheckIcon className="w-12 h-12 mx-auto text-brand-success" />
          <p className="font-bold text-ink text-sm">Căn hộ hiện không có sự cố bảo hành nào</p>
          <p className="text-xs text-ink-soft max-w-md mx-auto">
            Khi phát sinh sự cố về điện, nước, thấm dột hoặc cửa khóa, bạn có thể bấm "+ Báo Sự Cố Bảo Hành" để BQL điều phối kỹ thuật viên đến xử lý.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => {
            const isDone = claim.status === 'COMPLETED';
            const inProgress = ['ASSIGNED', 'IN_PROGRESS'].includes(claim.status);

            return (
              <div
                key={claim.id}
                className="bg-surface rounded-xl border border-brand-border p-4 shadow-xs space-y-3 hover:border-accent/40 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-border pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="font-mono text-accent text-sm">{claim.claim_code}</strong>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-alt text-ink">
                        {claim.category}
                      </span>
                    </div>
                    <span className="text-[11px] text-ink-soft">
                      Gửi lúc: {new Date(claim.created_at).toLocaleString('vi-VN')} • Vị trí: {claim.location_detail}
                    </span>
                  </div>

                  <div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      isDone
                        ? 'bg-brand-success-soft text-brand-success'
                        : inProgress
                        ? 'bg-brand-warning-soft text-brand-warning'
                        : 'bg-accent-soft text-accent-ink'
                    }`}>
                      {isDone ? '✓ Đã Nghiệm Thu Đóng' : inProgress ? '⚙ Đang Khắc Phục' : '⌛ Chờ Phân Công'}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-ink space-y-1">
                  <p className="font-semibold">{claim.description}</p>
                  {claim.contractors && (
                    <p className="text-ink-soft text-[11px]">
                      Nhà thầu phụ trách: <strong className="text-ink">{claim.contractors.name}</strong> (⭐ {claim.contractors.rating})
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-brand-border flex items-center justify-between">
                  <span className="text-[11px] text-ink-soft">
                    {claim.is_under_warranty ? '🛡️ Trong thời hạn bảo hành' : 'Hết hạn bảo hành'}
                  </span>

                  {inProgress && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClaim(claim);
                        setIsAcceptModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-brand-success hover:bg-brand-success/90 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      Nghiệm Thu & Đánh Giá
                    </button>
                  )}

                  {isDone && (
                    <span className="text-xs text-brand-success font-bold font-mono">
                      Đã đánh giá: {'⭐'.repeat(claim.customer_rating || 5)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: CREATE CLAIM ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-2xl border border-brand-border w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h3 className="font-bold text-ink text-sm flex items-center gap-2">
                <WrenchScrewdriverIcon className="w-5 h-5 text-accent" />
                <span>Báo Sự Cố Bảo Hành Căn Hộ {apartmentCode}</span>
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 text-ink-soft hover:text-ink cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">Hạng mục sự cố</label>
                <select
                  value={createForm.category}
                  onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 cursor-pointer"
                >
                  <option value="DIEN_NUOC">Hệ thống Điện & Nước</option>
                  <option value="KET_CAU_THAM">Thấm dột & Kết cấu tường/trần</option>
                  <option value="CUA_KHOA">Cửa chính, Khóa từ & Cửa sổ</option>
                  <option value="NOI_THAT">Nội thất bàn giao</option>
                  <option value="SON_BA">Sơn tường & Nứt chân chim</option>
                  <option value="THIET_BI">Thiết bị gắn tường / Khác</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Vị trí phát sinh sự cố</label>
                <input
                  type="text"
                  required
                  value={createForm.location_detail}
                  onChange={(e) => setCreateForm({ ...createForm, location_detail: e.target.value })}
                  placeholder="VD: Nhà vệ sinh phòng ngủ lớn, Ban công..."
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Mức độ ưu tiên</label>
                <select
                  value={createForm.severity}
                  onChange={(e) => setCreateForm({ ...createForm, severity: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 cursor-pointer"
                >
                  <option value="NORMAL">Tiêu Chuẩn (Xử lý trong 48h)</option>
                  <option value="HIGH">Cao (Xử lý trong 24h)</option>
                  <option value="CRITICAL">Khẩn Cấp (Xử lý trong 4h - Rò rỉ điện/nước lớn)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Mô tả hiện tượng hư hỏng</label>
                <textarea
                  rows={3}
                  required
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Mô tả cụ thể hiện tượng để kỹ thuật viên chuẩn bị sẵn vật tư thay thế..."
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
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
                  Gửi Yêu Cầu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ACCEPT & RATE ── */}
      {isAcceptModalOpen && selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-2xl border border-brand-border w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h3 className="font-bold text-ink text-sm flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-brand-success" />
                <span>Nghiệm Thu & Chấm Điểm Dịch Vụ: {selectedClaim.claim_code}</span>
              </h3>
              <button onClick={() => setIsAcceptModalOpen(false)} className="p-1 text-ink-soft hover:text-ink cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAcceptSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">
                  Đánh giá mức độ hài lòng về nhà thầu (1 - 5 Sao)
                </label>
                <select
                  value={acceptForm.customer_rating}
                  onChange={(e) => setAcceptForm({ ...acceptForm, customer_rating: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 cursor-pointer"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ (5 Sao - Rất hài lòng, đúng hẹn)</option>
                  <option value={4}>⭐⭐⭐⭐ (4 Sao - Hài lòng)</option>
                  <option value={3}>⭐⭐⭐ (3 Sao - Bình thường)</option>
                  <option value={2}>⭐⭐ (2 Sao - Chưa hài lòng)</option>
                  <option value={1}>⭐ (1 Sao - Rất không hài lòng)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Ý kiến đóng góp</label>
                <textarea
                  rows={2}
                  value={acceptForm.resolution_notes}
                  onChange={(e) => setAcceptForm({ ...acceptForm, resolution_notes: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>

              <div className="pt-3 border-t border-brand-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAcceptModalOpen(false)}
                  className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl font-bold hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-success hover:bg-brand-success/90 text-white rounded-xl font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Xác Nhận Nghiệm Thu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalWarrantySection;
