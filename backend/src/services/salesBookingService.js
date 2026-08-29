const crypto = require('crypto');
const { logActivity } = require('../utils/logger');
const repo = require('../repositories/salesBookingRepository');

// Helper: kiểm tra availability
const checkApartmentAvailability = async (apartmentId, prisma) => {
  const unit = await prisma.apartments.findUnique({ where: { id: apartmentId } });
  if (!unit) return { available: false, reason: 'Không tìm thấy căn hộ' };
  if (unit.sales_status && unit.sales_status !== 'AVAILABLE') {
    return { available: false, reason: `Căn ${unit.code} hiện tại không sẵn bán (Trạng thái: ${unit.sales_status})` };
  }
  return { available: true, unit };
};

// Helper: check active booking
const checkActiveBooking = async (apartmentId, prisma) => {
  const activeBooking = await prisma.sales_bookings.findFirst({ where: { apartment_id: apartmentId, status: 'ACTIVE' } });
  if (activeBooking) {
    return { blocked: true, reason: `Căn đang có phiếu giữ chỗ ${activeBooking.booking_code} còn hiệu lực` };
  }
  return { blocked: false };
};

// Helper: build where clause for bookings
const buildBookingWhereClause = (filters) => {
  const where = {};
  if (filters.status && filters.status !== 'ALL') where.status = filters.status;
  if (filters.phase && filters.phase !== 'ALL') where.apartments = { phase_code: filters.phase };
  if (filters.search) {
    where.OR = [
      { booking_code: { contains: filters.search, mode: 'insensitive' } },
      { customer_name: { contains: filters.search, mode: 'insensitive' } },
      { customer_phone: { contains: filters.search } },
      { apartments: { code: { contains: filters.search, mode: 'insensitive' } } },
    ];
  }
  return where;
};

// Helper: generate booking code
const generateBookingCode = (apartmentCode) => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `BK-${apartmentCode}-${dateStr}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
};

// Helper: generate cart item id
const generateCartItemId = () => 'cart_' + crypto.randomBytes(6).toString('hex');

// Helper: generate booking id
const generateBookingId = () => 'bk_' + crypto.randomBytes(6).toString('hex');

// Helper: calculate expires at (48h cho cart, 7d cho booking)
const getExpiresAt = (hours = 48) => new Date(Date.now() + hours * 60 * 60 * 1000);

// Get cart items
const getCart = async (req, prisma) => {
  const salesPersonId = req.user?.id || 'admin';
  const items = await prisma.sales_cart_items.findMany({
    where: { sales_person_id: salesPersonId },
    include: { apartments: true },
    orderBy: { created_at: 'desc' },
  });
  return { success: true, items };
};

// Add to cart
const addToCart = async (input, req, prisma) => {
  const { apartment_id, lead_id, customer_id, notes } = input;
  const salesPersonId = req.user?.id || 'admin';
  const salesPersonName = req.user?.name || req.user?.username || 'Admin';

  if (!apartment_id) return { success: false, message: 'Vui lòng chọn căn hộ' };

  const existing = await prisma.sales_cart_items.findFirst({
    where: { sales_person_id: salesPersonId, apartment_id },
  });
  if (existing) return { success: true, message: 'Căn hộ đã có sẵn trong giỏ hàng', item: existing };

  const expiresAt = getExpiresAt(48);
  const item = await prisma.sales_cart_items.create({
    data: {
      id: generateCartItemId(),
      sales_person_id: salesPersonId,
      sales_person_name: salesPersonName,
      apartment_id,
      lead_id,
      customer_id,
      notes,
      expires_at: expiresAt,
    },
    include: { apartments: true },
  });
  return { success: true, message: 'Đã thêm căn vào giỏ hàng tư vấn', item };
};

// Remove from cart
const removeFromCart = async (id) => {
  await repo.deleteCartItem(id);
  return { success: true, message: 'Đã xóa khỏi giỏ hàng' };
};

// Get bookings
const getBookings = async (filters) => {
  const where = buildBookingWhereClause(filters);
  const bookings = await repo.findBookings(where);
  return { success: true, bookings, totalCount: bookings.length };
};

// Create booking (atomic)
const createBooking = async (input, prisma) => {
  const {
    apartment_id,
    customer_id,
    customer_name,
    customer_phone,
    lead_id,
    opportunity_id,
    booking_fee = 50000000,
    deposit_intent_amount = 100000000,
    notes,
    user,
  } = input;

  const salesPersonId = user?.username || user?.name || 'Admin';

  if (!apartment_id || !customer_name || !customer_phone) {
    return { success: false, message: 'Vui lòng điền đủ thông tin Căn hộ, Tên khách hàng và Số điện thoại' };
  }

  const result = await prisma.$transaction(async (tx) => {
    const availability = await checkApartmentAvailability(apartment_id, tx);
    if (!availability.available) throw new Error(availability.reason);

    const bookingBlocked = await checkActiveBooking(apartment_id, tx);
    if (bookingBlocked.blocked) throw new Error(bookingBlocked.reason);

    const unit = await tx.apartments.findUnique({ where: { id: apartment_id } });
    const bookingCode = generateBookingCode(unit.code);
    const expiresAt = getExpiresAt(7);

    await tx.apartments.update({ where: { id: apartment_id }, data: { sales_status: 'BOOKED' } });

    const booking = await tx.sales_bookings.create({
      data: {
        id: generateBookingId(),
        booking_code: bookingCode,
        apartment_id,
        customer_id,
        customer_name,
        customer_phone,
        lead_id,
        opportunity_id,
        sales_person_id: salesPersonId,
        booking_fee: Number(booking_fee),
        deposit_intent_amount: Number(deposit_intent_amount),
        status: 'ACTIVE',
        expires_at: expiresAt,
        notes,
      },
      include: { apartments: true },
    });

    await tx.sales_cart_items.deleteMany({ where: { apartment_id } });

    return { booking, unit };
  });

  await logActivity(user, 'TẠO_GIỮ_CHỖ_BĐS', 'BOOKING', result.booking.id, result.booking.booking_code, `Khóa giữ chỗ căn ${result.unit.code} cho khách ${customer_name} (${customer_phone}) hạn đến ${result.booking.expires_at.toLocaleDateString('vi-VN')}`);

  return { success: true, message: `Giữ chỗ thành công căn ${result.unit.code}! Mã phiếu: ${result.booking.booking_code}`, booking: result.booking };
};

// Cancel booking
const cancelBooking = async (input, prisma) => {
  const { id, reason, user } = input;

  const booking = await prisma.sales_bookings.findUnique({ where: { id }, include: { apartments: true } });
  if (!booking) return { success: false, message: 'Không tìm thấy phiếu giữ chỗ' };

  await prisma.$transaction(async (tx) => {
    await tx.sales_bookings.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        released_at: new Date(),
        release_reason: reason || 'Hủy theo yêu cầu',
      },
    });
    await tx.apartments.update({
      where: { id: booking.apartment_id },
      data: { sales_status: 'AVAILABLE' },
    });
  });

  await logActivity(user, 'HỦY_GIỮ_CHỖ_BĐS', 'BOOKING', booking.id, booking.booking_code, `Giải phóng căn ${booking.apartments?.code}. Lý do: ${reason || 'Hủy giữ chỗ'}`);

  return { success: true, message: `Đã hủy giữ chỗ và giải phóng căn ${booking.apartments?.code} về trạng thái Sẵn bán` };
};

// Extend booking
const extendBooking = async (input, prisma) => {
  const { id, extra_days = 3, notes, user } = input;

  const booking = await prisma.sales_bookings.findUnique({ where: { id } });
  if (!booking) return { success: false, message: 'Không tìm thấy phiếu giữ chỗ' };

  if ((booking.extension_count || 0) >= 2) {
    return { success: false, message: 'Phiếu giữ chỗ đã đạt giới hạn gia hạn tối đa (2 lần)' };
  }

  const currentExp = new Date(booking.expires_at);
  const newExp = new Date(currentExp.getTime() + Number(extra_days) * 24 * 60 * 60 * 1000);

  const updated = await prisma.sales_bookings.update({
    where: { id },
    data: {
      expires_at: newExp,
      extension_count: (booking.extension_count || 0) + 1,
      notes: notes ? `${booking.notes || ''}\\n[Gia hạn + ${extra_days} ngày]: ${notes}` : booking.notes,
    },
    include: { apartments: true },
  });

  return { success: true, message: `Đã gia hạn giữ chỗ thêm ${extra_days} ngày. Hạn mới: ${newExp.toLocaleDateString('vi-VN')}`, booking: updated };
};

module.exports = {
  checkApartmentAvailability,
  checkActiveBooking,
  buildBookingWhereClause,
  generateBookingCode,
  generateCartItemId,
  generateBookingId,
  getExpiresAt,
  getCart,
  addToCart,
  removeFromCart,
  getBookings,
  createBooking,
  cancelBooking,
  extendBooking,
};