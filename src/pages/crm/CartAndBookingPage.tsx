import { CrmSubNav } from '../../components/crm/CrmSubNav';
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast, useConfirm } from '../../components/ui';
import { EmptyState } from '../../components/ui';
import type { SalesCartItem, SalesBooking, RealEstatePhase } from '../../types';
import {
  BuildingOfficeIcon,
  ClockIcon,
  TrashIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XMarkIcon,
  PlusIcon,
  SparklesIcon,
  BanknotesIcon,
  PinIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
} from '../../components/icons';

interface CartAndBookingPageProps {
  onNavigate?: (route: string) => void;
  onBack?: () => void;
  

}

export const CartAndBookingPage: React.FC<CartAndBookingPageProps> = ({ onNavigate, onBack, onNavigate: _onNavigate }) => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<'cart' | 'bookings'>('bookings');
  const [cartItems, setCartItems] = useState<SalesCartItem[]>([]);
  const [bookings, setBookings] = useState<SalesBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [phaseFilter, setPhaseFilter] = useState<string>('ALL');

  // Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedCartItem, setSelectedCartItem] = useState<SalesCartItem | null>(null);
  const [bookingForm, setBookingForm] = useState({
    customer_name: '',
    customer_phone: '',
    booking_fee: 50000000,
    deposit_intent_amount: 100000000,
    notes: '',
  });

  // Action states
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<SalesBooking | null>(null);
  const [extendDays, setExtendDays] = useState(3);
  const [extendNotes, setExtendNotes] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab, phaseFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'cart') {
        const res: any = await api.get('/crm/bookings/cart');
        if (res && res.success) setCartItems(res.items || []);
      } else {
        const params = new URLSearchParams({
          ...(phaseFilter !== 'ALL' ? { phase: phaseFilter } : {}),
        });
        const res: any = await api.get(`/crm/bookings?${params.toString()}`);
        if (res && res.success) setBookings(res.bookings || []);
      }
    } catch (err) {
      console.error('Failed to load cart/bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCart = async (id: string) => {
    if (!(await confirm({ title: 'Xóa khỏi giỏ hàng', description: 'Xóa căn này khỏi giỏ hàng tư vấn?', variant: 'danger' }))) return;
    try {
      await api.delete(`/crm/bookings/cart/${id}`);
      loadData();
    } catch (err) {
      console.error('Failed to remove cart item:', err);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCartItem) return;
    try {
      const res: any = await api.post('/crm/bookings', {
        apartment_id: selectedCartItem.apartment_id,
        customer_name: bookingForm.customer_name,
        customer_phone: bookingForm.customer_phone,
        booking_fee: bookingForm.booking_fee,
        deposit_intent_amount: bookingForm.deposit_intent_amount,
        notes: bookingForm.notes,
      });

      if (res && res.success) {
        toast.success(res.message || 'Giữ chỗ thành công!');
        setIsBookingModalOpen(false);
        setActiveTab('bookings');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi giữ chỗ. Vui lòng kiểm tra lại');
    }
  };

  const handleCancelBooking = async (id: string) => {
    const ok = await confirm({
      title: 'Hủy giữ chỗ',
      description: 'Nhập lý do hủy giữ chỗ & giải phóng căn này?',
      variant: 'danger',
      confirmLabel: 'Hủy giữ chỗ',
      cancelLabel: 'Hủy',
    });
    if (!ok) return;
    const reason = '';
    try {
      const res: any = await api.post(`/crm/bookings/${id}/cancel`, { reason });
      if (res && res.success) {
        toast.success(res.message || 'Đã hủy giữ chỗ');
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi hủy giữ chỗ');
    }
  };

  const handleExtendBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    try {
      const res: any = await api.post(`/crm/bookings/${selectedBooking.id}/extend`, {
        extra_days: extendDays,
        notes: extendNotes,
      });
      if (res && res.success) {
        toast.success(res.message || 'Đã gia hạn giữ chỗ');
        setIsExtendModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi gia hạn');
    }
  };

  const calculateTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    if (diff <= 0) return { expired: true, text: 'Đã hết hạn' };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { expired: false, text: `${days} ngày ${hours} giờ ${mins} phút` };
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <CrmSubNav current="bookings" title="Giỏ Hàng & Giữ Chỗ (Booking Lock)" subtitle="Khóa căn tự động 48 giờ & xếp hàng chờ ưu tiên" onNavigate={onNavigate} onBack={onBack} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink flex items-center gap-2">
            <BuildingOfficeIcon className="w-7 h-7 text-primary-600" />
            Giỏ Hàng & Quản Lý Giữ Chỗ (Cart & Booking Lock)
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Cơ chế Khóa nguyên tử (Atomic Lock) chống bán trùng căn 100% kèm bộ đếm ngược 7 ngày
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-surface-alt p-1.5 rounded-xl border border-brand-border">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors duration-150 cursor-pointer ${
              activeTab === 'bookings'
                ? 'bg-surface text-accent shadow-sm'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            Phiếu Giữ Chỗ Khóa Căn ({bookings.filter((b) => b.status === 'ACTIVE').length})
          </button>
          <button
            onClick={() => setActiveTab('cart')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors duration-150 cursor-pointer ${
              activeTab === 'cart'
                ? 'bg-surface text-accent shadow-sm'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            Giỏ Hàng Tư Vấn ({cartItems.length})
          </button>
        </div>
      </div>

      {/* Main Content View */}
      {activeTab === 'bookings' ? (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="bg-surface p-4 rounded-xl border border-brand-border flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink-soft font-medium">Phân khu:</span>
              <div className="flex items-center bg-surface-alt p-1 rounded-xl">
                {['ALL', 'TESLA', 'CANTATA', 'NOXH'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPhaseFilter(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors duration-150 cursor-pointer ${
                      phaseFilter === p
                        ? 'bg-surface text-accent shadow-xs'
                        : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    {p === 'ALL' ? 'Tất cả' : p}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={loadData}
              className="p-2 rounded-lg border border-brand-border text-ink-soft hover:text-accent hover:border-accent/40 transition-colors duration-150 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <ArrowPathIcon className="w-4 h-4" />
              <span>Làm mới</span>
            </button>
          </div>

          {/* Bookings Table / Grid */}
          {loading ? (
            <div className="p-16 text-center text-ink-soft bg-surface rounded-xl border border-brand-border">
              <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto text-accent mb-2" />
              <span>Đang tải danh sách giữ chỗ...</span>
            </div>
          ) : bookings.length === 0 ? (
            <EmptyState
              icon={BuildingOfficeIcon}
              tone="neutral"
              title="Chưa có phiếu giữ chỗ nào"
              description="Các căn được giữ chỗ từ Ma Trận Bán Hàng sẽ hiển thị và đếm ngược tại đây."
              size="md"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookings.map((booking) => {
                const remaining = calculateTimeRemaining(booking.expires_at);
                const isExpired = remaining.expired || booking.status === 'EXPIRED';
                const isActive = booking.status === 'ACTIVE' && !isExpired;
                const statusBadge = isActive
                  ? { cls: 'bg-brand-warning-soft text-brand-warning', dot: 'bg-brand-warning', label: 'Đang giữ chỗ' }
                  : booking.status === 'CONVERTED_DEPOSIT'
                  ? { cls: 'bg-brand-teal-soft text-brand-teal', dot: 'bg-brand-teal', label: 'Đã chuyển cọc' }
                  : { cls: 'bg-brand-danger-soft text-brand-danger', dot: 'bg-brand-danger', label: 'Đã giải phóng' };

                return (
                  <div
                    key={booking.id}
                    className={`bg-surface rounded-xl p-5 border shadow-sm space-y-3 transition-all duration-200 ${
                      isActive ? 'border-brand-warning/40 ring-1 ring-brand-warning/20' : 'border-brand-border opacity-80'
                    }`}
                  >
                    {/* Top Row: Code & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-semibold text-ink block">
                          {booking.booking_code}
                        </span>
                        <h2 className="font-bold text-ink text-sm mt-0.5">
                          Căn: {booking.apartments?.code} ({booking.apartments?.phase_code || 'CANTATA'})
                        </h2>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge.cls}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                        {statusBadge.label}
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div className="p-3 bg-surface-alt rounded-xl text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-ink-soft">Khách hàng:</span>
                        <strong className="text-ink">{booking.customer_name || 'N/A'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-soft">Số điện thoại:</span>
                        <span className="font-mono">{booking.customer_phone || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-soft">Dự kiến cọc:</span>
                        <strong className="font-mono tabular-nums text-right font-bold text-ink">
                          {(booking.deposit_intent_amount || 100000000).toLocaleString('vi-VN')} VNĐ
                        </strong>
                      </div>
                    </div>

                    {/* Realtime Countdown Timer */}
                    {isActive && (
                      <div className="p-2.5 bg-brand-warning-soft rounded-xl border border-brand-warning/30 flex items-center justify-between text-xs text-brand-warning">
                        <div className="flex items-center gap-1.5">
                          <ClockIcon className="w-4 h-4 text-brand-warning animate-pulse" />
                          <span className="font-semibold">Thời gian còn lại:</span>
                        </div>
                        <span className="font-bold font-mono tabular-nums">{remaining.text}</span>
                      </div>
                    )}

                    {/* Footer Actions */}
                    {isActive && (
                      <div className="pt-2 border-t border-brand-border flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBooking(booking);
                              setIsExtendModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 bg-surface border border-brand-border rounded-lg text-[11px] font-bold text-ink hover:bg-surface-alt transition-colors duration-150 cursor-pointer"
                          >
                            + Gia hạn
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelBooking(booking.id)}
                            className="px-2.5 py-1.5 bg-brand-danger text-white rounded-lg text-[11px] font-bold hover:brightness-95 transition cursor-pointer"
                          >
                            Hủy
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const query = new URLSearchParams({
                              booking_id: booking.id,
                              apartment_id: booking.apartment_id,
                              customer_name: booking.customer_name || '',
                              customer_phone: booking.customer_phone || '',
                              deposit_amount: String(booking.deposit_intent_amount || booking.booking_fee || 100000000),
                            }).toString();

                            if (_onNavigate) _onNavigate(`crm/deposits?${query}`);
                            else toast.info(`Chuyển sang màn hình Đặt cọc cho căn ${booking.apartments?.code}`);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-[11px] font-bold transition-colors duration-150 cursor-pointer"
                        >
                          <BanknotesIcon className="w-3.5 h-3.5" />
                          Lập Phiếu Cọc
                          <ArrowRightIcon className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Cart View */
        <div className="space-y-4">
          {loading ? (
            <div className="p-16 text-center text-ink-soft bg-surface rounded-xl border border-brand-border">
              <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto text-accent mb-2" />
              <span>Đang tải giỏ hàng tư vấn...</span>
            </div>
          ) : cartItems.length === 0 ? (
            <EmptyState
              icon={BuildingOfficeIcon}
              tone="neutral"
              title="Giỏ hàng tư vấn đang trống"
              description="Truy cập Ma Trận Bán Hàng và bấm Thêm Giỏ Hàng để đưa các căn quan tâm vào đây."
              size="md"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-surface rounded-xl p-5 border border-brand-border shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-bold text-ink text-base">
                        Căn: {item.apartments?.code}
                      </h2>
                      <p className="text-sm text-ink-soft">
                        Phân khu: <strong>{item.apartments?.phase_code || 'CANTATA'}</strong> • Dãy: {item.apartments?.block_code || 'N/A'}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRemoveCart(item.id)}
                      className="p-1.5 rounded-lg border border-brand-border text-ink-soft hover:text-accent hover:border-accent/40 transition-colors duration-150 cursor-pointer"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-3 bg-surface-alt rounded-xl text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-ink-soft">Diện tích đất:</span>
                      <strong className="text-ink">{item.apartments?.land_area || item.apartments?.area} m²</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-soft">Tổng giá dự kiến:</span>
                      <strong className="font-mono tabular-nums text-right font-bold text-ink">
                        {(Number(item.apartments?.land_price_before_vat || 4500000000) + Number(item.apartments?.construction_price_before_vat || 2500000000)).toLocaleString('vi-VN')} VNĐ
                      </strong>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-brand-border flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCartItem(item);
                        setIsBookingModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold transition-colors duration-150 cursor-pointer"
                    >
                      <PinIcon className="w-3.5 h-3.5" />
                      Khóa Giữ Chỗ (Booking)
                      <ArrowRightIcon className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Booking Form Modal */}
      {isBookingModalOpen && selectedCartItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-elevation-raised border border-brand-border w-full max-w-lg overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h2 className="font-bold text-ink text-base">
                Lập Phiếu Khóa Giữ Chỗ Căn {selectedCartItem.apartments?.code}
              </h2>
              <button
                onClick={() => setIsBookingModalOpen(false)}
                className="p-1.5 rounded-lg border border-brand-border text-ink-soft hover:text-accent hover:border-accent/40 transition-colors duration-150 cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Họ tên khách hàng <span className="text-brand-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={bookingForm.customer_name}
                  onChange={(e) => setBookingForm({ ...bookingForm, customer_name: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-ink-faint"
                  placeholder="VD: Lê Thị Thu Thảo"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Số điện thoại <span className="text-brand-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={bookingForm.customer_phone}
                  onChange={(e) => setBookingForm({ ...bookingForm, customer_phone: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-ink-faint"
                  placeholder="VD: 0987654321"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Phí giữ chỗ (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={bookingForm.booking_fee}
                    onChange={(e) => setBookingForm({ ...bookingForm, booking_fee: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink font-mono tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Dự kiến đặt cọc (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={bookingForm.deposit_intent_amount}
                    onChange={(e) => setBookingForm({ ...bookingForm, deposit_intent_amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink font-mono tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Ghi chú giữ chỗ
                </label>
                <textarea
                  rows={2}
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-ink-faint"
                  placeholder="Thời hạn hẹn nộp tiền cọc..."
                />
              </div>

              <div className="p-3 bg-brand-warning-soft rounded-xl text-[11px] text-brand-warning flex items-start gap-1.5">
                <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
                <span>Căn hộ sẽ bị <strong>khóa cứng 7 ngày</strong> trên Ma Trận Bán Hàng. Không nhân sự nào khác có thể thao tác trùng.</span>
              </div>

              <div className="pt-3 border-t border-brand-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBookingModalOpen(false)}
                  className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl font-bold hover:bg-surface-alt transition-colors duration-150 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-colors duration-150 cursor-pointer"
                >
                  Xác Nhận Khóa Giữ Chỗ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Extend Modal */}
      {isExtendModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-elevation-raised border border-brand-border w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h2 className="font-bold text-ink text-base">
                Gia Hạn Giữ Chỗ Căn {selectedBooking.apartments?.code}
              </h2>
              <button
                onClick={() => setIsExtendModalOpen(false)}
                className="p-1.5 rounded-lg border border-brand-border text-ink-soft hover:text-accent hover:border-accent/40 transition-colors duration-150 cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExtendBooking} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Số ngày gia hạn thêm (Tối đa 3 ngày)
                </label>
                <select
                  value={extendDays}
                  onChange={(e) => setExtendDays(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
                >
                  <option value={1}>+ 1 Ngày</option>
                  <option value={2}>+ 2 Ngày</option>
                  <option value={3}>+ 3 Ngày</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Lý do gia hạn
                </label>
                <textarea
                  rows={2}
                  required
                  value={extendNotes}
                  onChange={(e) => setExtendNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-ink-faint"
                  placeholder="Khách đang thu xếp tiền..."
                />
              </div>

              <div className="pt-3 border-t border-brand-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExtendModalOpen(false)}
                  className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl font-bold hover:bg-surface-alt transition-colors duration-150 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-colors duration-150 cursor-pointer"
                >
                  Gia Hạn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartAndBookingPage;
