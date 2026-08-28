import { CrmSubNav } from '../../components/crm/CrmSubNav';
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../components/ui';
import {
  BuildingOfficeIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowPathIcon,
  ClockIcon,
  DocumentTextIcon,
  PlusIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
} from '../../components/icons';

interface HandoverManagementPageProps {
  onNavigate?: (route: string) => void;
  onBack?: () => void;
}

export const HandoverManagementPage: React.FC<HandoverManagementPageProps> = ({ onNavigate, onBack, onNavigate: _onNavigate }) => {
  const toast = useToast();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [handoverDetail, setHandoverDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Snag Modal
  const [isSnagModalOpen, setIsSnagModalOpen] = useState(false);
  const [snagForm, setSnagForm] = useState({
    room_area: 'PHÒNG KHÁCH',
    category: 'KỸ THUẬT SƠN BẢ',
    description: '',
    severity: 'MINOR',
    sla_days: 7,
  });

  // Bridge Activation Modal
  const [isBridgeModalOpen, setIsBridgeModalOpen] = useState(false);
  const [bridgeForm, setBridgeForm] = useState({
    initial_electricity_reading: 0,
    initial_water_reading: 0,
    notes: 'Bàn giao nghiệm thu kỹ thuật đạt tiêu chuẩn',
  });

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const res: any = await api.get('/crm/contracts');
      if (res && res.success) {
        setContracts(res.contracts || []);
      }
    } catch (err) {
      console.error('Failed to load contracts for handover:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadHandoverDetail = async (contractId: string) => {
    try {
      setLoadingDetail(true);
      const res: any = await api.get(`/crm/handover/${contractId}`);
      if (res && res.success) {
        setHandoverDetail(res.contract);
      }
    } catch (err) {
      console.error('Failed to load handover details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSelectContract = (c: any) => {
    setSelectedContract(c);
    loadHandoverDetail(c.id);
  };

  const handleAddSnag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract) return;
    try {
      const res: any = await api.post(`/crm/handover/${selectedContract.id}/snags`, snagForm);
      if (res && res.success) {
        toast.success(res.message || 'Đã thêm Snag item');
        setIsSnagModalOpen(false);
        setSnagForm({
          room_area: 'PHÒNG KHÁCH',
          category: 'KỸ THUẬT SƠN BẢ',
          description: '',
          severity: 'MINOR',
          sla_days: 7,
        });
        loadHandoverDetail(selectedContract.id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi thêm Snag item');
    }
  };

  const handleResolveSnag = async (snagId: string) => {
    try {
      const res: any = await api.post(`/crm/handover/snags/${snagId}/resolve`, { verified_by_customer: true });
      if (res && res.success) {
        toast.success(res.message || 'Đã cập nhật');
        if (selectedContract) loadHandoverDetail(selectedContract.id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật');
    }
  };

  const handleCompleteBridge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract) return;
    try {
      const res: any = await api.post(`/crm/handover/${selectedContract.id}/complete-bridge`, bridgeForm);
      if (res && res.success) {
        toast.success(res.message || 'Đã kích hoạt vận hành');
        setIsBridgeModalOpen(false);
        loadContracts();
        loadHandoverDetail(selectedContract.id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kích hoạt vận hành');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      <CrmSubNav current="handover" title="Nghiệm Thu & Bàn Giao Căn Hộ" subtitle="Biên bản nghiệm thu, Snag list lỗi kỹ thuật & kích hoạt bàn giao" onNavigate={onNavigate} onBack={onBack} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <BuildingOfficeIcon className="w-7 h-7 text-accent" />
            Nghiệm Thu Bàn Giao & Cầu Nối Vận Hành (Operations Bridge)
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Quản lý Snag List (biên bản lỗi kỹ thuật) & Tự động kết nối hồ sơ sang Phân hệ Cư dân, Tài khoản App, Điện Nước & Phí Quản Lý
          </p>
        </div>
      </div>

      {/* Main Grid: Contracts on Left, Snag List / Inspection on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Contract List */}
        <div className="bg-surface rounded-xl border border-brand-border shadow-sm p-4 space-y-3">
          <h2 className="font-bold text-ink text-base flex items-center justify-between">
            <span>Danh Sách Căn Hộ Đến Hạn Bàn Giao</span>
            <span className="text-xs font-mono font-semibold bg-surface-alt text-ink-soft px-2 py-0.5 rounded-full">
              {contracts.length}
            </span>
          </h2>

          {loading ? (
            <div className="p-8 text-center text-ink-soft">
              <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto text-accent mb-2" />
              <span className="text-xs">Đang tải...</span>
            </div>
          ) : contracts.length === 0 ? (
            <div className="p-8 text-center text-ink-soft text-xs">Chưa có hợp đồng nào.</div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {contracts.map((c) => {
                const isSelected = selectedContract?.id === c.id;
                const isHandedOver = c.status === 'HANDED_OVER' || c.apartments?.sales_status === 'HANDED_OVER';

                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectContract(c)}
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all duration-200 space-y-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                      isSelected
                        ? 'border-accent bg-accent-soft/40 ring-1 ring-accent'
                        : 'border-brand-border hover:bg-surface-alt/60 hover:border-accent/40'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-ink text-sm">
                        Căn: {c.apartments?.code} ({c.apartments?.phase_code || 'CANTATA'})
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isHandedOver ? 'bg-brand-success-soft text-brand-success' : 'bg-brand-warning-soft text-brand-warning'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isHandedOver ? 'bg-brand-success' : 'bg-brand-warning'}`} />
                        {isHandedOver ? 'Đã Bàn Giao' : 'Chờ Nghiệm Thu'}
                      </span>
                    </div>

                    <div className="text-ink-soft flex justify-between">
                      <span>Khách hàng:</span>
                      <strong className="text-ink">{c.customers?.name}</strong>
                    </div>

                    <div className="text-ink-soft flex justify-between font-mono text-[11px]">
                      <span>Mã HĐ:</span>
                      <span className="font-semibold text-ink">{c.contract_code}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Handover Details & Snag List */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedContract ? (
            <div className="bg-surface rounded-xl border border-brand-border p-16 text-center text-ink-soft">
              <BuildingOfficeIcon className="w-12 h-12 mx-auto text-ink-faint mb-2" />
              <p className="font-bold text-sm text-ink">Chọn một căn hộ bên trái để xem hồ sơ bàn giao</p>
              <p className="text-xs text-ink-soft mt-1">Hệ thống sẽ tải toàn bộ danh mục kiểm tra Snag List và bảng kích hoạt Operations Bridge.</p>
            </div>
          ) : loadingDetail ? (
            <div className="bg-surface rounded-xl border border-brand-border p-16 text-center text-ink-soft">
              <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto text-accent mb-2" />
              <p className="text-xs font-semibold">Đang tải chi tiết hồ sơ nghiệm thu...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Unit Summary Card */}
              <div className="bg-surface rounded-xl border border-brand-border p-5 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-border pb-3">
                  <div>
                    <h2 className="text-base font-bold text-ink">
                      Hồ Sơ Nghiệm Thu Căn: {handoverDetail?.apartments?.code}
                    </h2>
                    <p className="text-xs text-ink-soft">
                      Chủ sở hữu: <strong>{handoverDetail?.customers?.name}</strong> • SĐT: <span className="font-mono">{handoverDetail?.customers?.phone_number}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsSnagModalOpen(true)}
                      className="px-3.5 py-2 bg-surface hover:bg-surface-alt text-ink rounded-xl text-xs font-bold border border-brand-border transition-colors duration-150 cursor-pointer"
                    >
                      + Thêm Lỗi (Snag Item)
                    </button>

                    {handoverDetail?.apartments?.sales_status !== 'HANDED_OVER' && (() => {
                      const openCriticalSnagsCount = handoverDetail?.snag_items?.filter((s: any) => s.status === 'OPEN' && s.severity === 'CRITICAL').length || 0;
                      const hasCriticalOpen = openCriticalSnagsCount > 0;

                      return (
                        <button
                          onClick={() => {
                            if (hasCriticalOpen) {
                              toast.error(`Không thể bàn giao: Còn ${openCriticalSnagsCount} lỗi kỹ thuật NGHIÊM TRỌNG (CRITICAL) chưa sửa!`);
                              return;
                            }
                            setIsBridgeModalOpen(true);
                          }}
                          disabled={hasCriticalOpen}
                          title={hasCriticalOpen ? `Căn hộ còn ${openCriticalSnagsCount} lỗi nghiêm trọng (CRITICAL) chưa sửa xong.` : 'Kích hoạt bàn giao căn hộ'}
                          className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all duration-200 flex items-center gap-1.5 ${
                            hasCriticalOpen
                              ? 'bg-ink-faint/30 text-ink-soft cursor-not-allowed border border-brand-border'
                              : 'bg-accent hover:bg-accent-hover text-white hover:shadow-md cursor-pointer'
                          }`}
                        >
                          <SparklesIcon className="w-4 h-4 text-accent-soft" />
                          <span>Bàn Giao & Kích Hoạt Vận Hành</span>
                        </button>
                      );
                    })()}
                  </div>
                </div>

                {/* Critical Snag Alert Banner */}
                {(() => {
                  const openCriticalCount = handoverDetail?.snag_items?.filter((s: any) => s.status === 'OPEN' && s.severity === 'CRITICAL').length || 0;
                  if (openCriticalCount === 0) return null;
                  return (
                    <div className="p-3.5 bg-brand-danger-soft text-brand-danger rounded-xl border border-brand-danger/30 flex items-start gap-2.5 text-xs animate-fade-in">
                      <ExclamationTriangleIcon className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold block text-sm">Chặn bàn giao: Còn {openCriticalCount} lỗi kỹ thuật NGHIÊM TRỌNG (CRITICAL)</strong>
                        <p className="mt-0.5 text-brand-danger/90">
                          Theo quy định tại <strong>BLUEPRINT B.8.2</strong>, các hạng mục lỗi kỹ thuật nghiêm trọng bắt buộc phải được đơn vị thi công khắc phục xong và kỹ thuật xác nhận trước khi ký biên bản bàn giao căn hộ.
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Snag List Items Table */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <strong className="text-ink">
                      Danh Mục Lỗi Kỹ Thuật (Snag List) ({handoverDetail?.snag_items?.length || 0})
                    </strong>
                    <span className="text-[11px] text-ink-soft">
                      Chưa xử lý: <strong className="text-brand-danger">{handoverDetail?.snag_items?.filter((s: any) => s.status === 'OPEN').length || 0}</strong>
                      {(() => {
                        const crit = handoverDetail?.snag_items?.filter((s: any) => s.status === 'OPEN' && s.severity === 'CRITICAL').length || 0;
                        return crit > 0 ? <span className="ml-1 text-brand-danger font-bold">({crit} Nghiêm trọng)</span> : null;
                      })()}
                    </span>
                  </div>

                  {(!handoverDetail?.snag_items || handoverDetail.snag_items.length === 0) ? (
                    <div className="p-8 text-center text-ink-soft bg-surface-alt rounded-xl border border-dashed border-brand-border text-xs flex flex-col items-center gap-2">
                      <CheckCircleIcon className="w-6 h-6 text-brand-success" />
                      <span>Căn hộ đạt 100% tiêu chuẩn nghiệm thu, không có lỗi kỹ thuật nào được ghi nhận.</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {handoverDetail.snag_items.map((snag: any) => {
                        const isOpen = snag.status === 'OPEN';

                        return (
                          <div
                            key={snag.id}
                            className={`p-3.5 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                              isOpen ? 'bg-brand-danger-soft/30 border-brand-danger/20' : 'bg-surface-alt border-brand-border opacity-75'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-ink">
                                  [{snag.room_area}] {snag.category}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    snag.severity === 'CRITICAL'
                                      ? 'bg-brand-danger-soft text-brand-danger'
                                      : snag.severity === 'MAJOR'
                                        ? 'bg-brand-warning-soft text-brand-warning'
                                        : 'bg-surface-alt text-ink-soft'
                                  }`}
                                >
                                  {snag.severity === 'CRITICAL' ? 'Nghiêm trọng' : snag.severity === 'MAJOR' ? 'Trung bình' : 'Nhẹ'}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    isOpen ? 'bg-brand-warning-soft text-brand-warning' : 'bg-brand-success-soft text-brand-success'
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-brand-warning' : 'bg-brand-success'}`} />
                                  {isOpen ? 'Đang xử lý' : 'Đã khắc phục'}
                                </span>
                              </div>
                              <p className="text-ink-soft">{snag.description}</p>
                              <div className="text-[10px] text-ink-soft font-mono">
                                Hạn khắc phục SLA: {new Date(snag.sla_deadline).toLocaleDateString('vi-VN')}
                              </div>
                            </div>

                            {isOpen && (
                              <button
                                onClick={() => handleResolveSnag(snag.id)}
                                className="px-3 py-1.5 bg-brand-success hover:bg-brand-success/90 text-white rounded-lg text-[10px] font-bold whitespace-nowrap cursor-pointer inline-flex items-center gap-1 transition-colors duration-150"
                              >
                                <CheckCircleIcon className="w-3 h-3" /> Đã Sửa Xong
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Snag Modal */}
      {isSnagModalOpen && selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-2xl border border-brand-border w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h3 className="font-bold text-ink text-base">
                + Ghi Nhận Lỗi Kỹ Thuật (Snag Item)
              </h3>
              <button onClick={() => setIsSnagModalOpen(false)} className="p-1.5 text-ink-soft hover:text-ink hover:bg-brand-border/40 rounded-lg transition-colors cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSnag} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">
                  Khu vực / Phòng <span className="text-brand-danger">*</span>
                </label>
                <select
                  value={snagForm.room_area}
                  onChange={(e) => setSnagForm({ ...snagForm, room_area: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 placeholder:text-ink-faint"
                >
                  <option value="PHÒNG KHÁCH">Phòng Khách</option>
                  <option value="PHÒNG BẾP">Phòng Bếp & Ăn</option>
                  <option value="PHÒNG NGỦ MASTER">Phòng Ngủ Master</option>
                  <option value="PHÒNG NGỦ 2">Phòng Ngủ 2</option>
                  <option value="NHÀ VỆ SINH (WC)">Nhà Vệ Sinh (WC)</option>
                  <option value="BAN CÔNG / SÂN VƯỜN">Ban Công / Sân Vườn</option>
                  <option value="CỬA RA VÀO & KHÓA TỪ">Cửa Ra Vào & Khóa Từ</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">
                  Hạng mục kỹ thuật <span className="text-brand-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={snagForm.category}
                  onChange={(e) => setSnagForm({ ...snagForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 placeholder:text-ink-faint"
                  placeholder="VD: Kỹ thuật sơn bả, Cửa sổ nhôm kính, Thiết bị vệ sinh..."
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">
                  Mô tả chi tiết lỗi <span className="text-brand-danger">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={snagForm.description}
                  onChange={(e) => setSnagForm({ ...snagForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 placeholder:text-ink-faint"
                  placeholder="VD: Cửa sổ phòng ngủ master bị rít khi kéo, vết xước chân tường góc trái..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">
                    Mức độ nghiêm trọng
                  </label>
                  <select
                    value={snagForm.severity}
                    onChange={(e) => setSnagForm({ ...snagForm, severity: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 placeholder:text-ink-faint"
                  >
                    <option value="MINOR">Nhẹ (Minor)</option>
                    <option value="MAJOR">Trung bình (Major)</option>
                    <option value="CRITICAL">Nghiêm trọng (Critical)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">
                    Thời hạn SLA khắc phục
                  </label>
                  <select
                    value={snagForm.sla_days}
                    onChange={(e) => setSnagForm({ ...snagForm, sla_days: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 placeholder:text-ink-faint"
                  >
                    <option value={3}>3 ngày</option>
                    <option value={7}>7 ngày</option>
                    <option value={14}>14 ngày</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSnagModalOpen(false)}
                  className="px-4 py-2 bg-surface border border-brand-border text-ink hover:bg-surface-alt rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold shadow-sm transition-colors cursor-pointer"
                >
                  Lưu Lỗi Vào Snag List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Operations Bridge Activation Modal */}
      {isBridgeModalOpen && selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-2xl border border-brand-border w-full max-w-lg overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-accent-soft flex items-center justify-between">
              <h3 className="font-bold text-accent-ink text-base flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-accent-ink" />
                Kích Hoạt Cầu Nối Vận Hành Căn {selectedContract.apartments?.code}
              </h3>
              <button onClick={() => setIsBridgeModalOpen(false)} className="p-1.5 text-ink-soft hover:text-ink hover:bg-brand-border/40 rounded-lg transition-colors cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteBridge} className="p-5 space-y-4 text-xs">
                <div className="p-3 bg-brand-teal-soft rounded-xl text-ink space-y-1 text-[11px]">
                  <strong className="block text-xs">Chuỗi hành động tự động của Operations Bridge:</strong>
                <div>1. Chuyển căn hộ sang trạng thái <strong>HANDED_OVER</strong>.</div>
                <div>2. Tự động khởi tạo hồ sơ Cư Dân (vai trò <strong>Chủ Sở Hữu</strong>).</div>
                <div>3. Tự động tạo Tài khoản đăng nhập App Cư Dân (mật khẩu mặc định là số điện thoại).</div>
                <div>4. Chốt chỉ số ban đầu cho công tơ Điện & Nước.</div>
                <div>5. Bắt đầu kích hoạt tính Phí Quản Lý KĐT hàng tháng.</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">
                    Chỉ số Điện bàn giao (kWh) <span className="text-brand-danger">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={bridgeForm.initial_electricity_reading}
                    onChange={(e) => setBridgeForm({ ...bridgeForm, initial_electricity_reading: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">
                    Chỉ số Nước bàn giao (m³) <span className="text-brand-danger">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={bridgeForm.initial_water_reading}
                    onChange={(e) => setBridgeForm({ ...bridgeForm, initial_water_reading: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 font-bold font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">
                  Ghi chú biên bản bàn giao
                </label>
                <textarea
                  rows={2}
                  value={bridgeForm.notes}
                  onChange={(e) => setBridgeForm({ ...bridgeForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 placeholder:text-ink-faint"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBridgeModalOpen(false)}
                  className="px-4 py-2 bg-surface border border-brand-border text-ink hover:bg-surface-alt rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-sm flex items-center gap-1.5"
                >
                  <SparklesIcon className="w-4 h-4 text-accent-soft" />
                  <span>Xác Nhận & Kích Hoạt Vận Hành</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HandoverManagementPage;
