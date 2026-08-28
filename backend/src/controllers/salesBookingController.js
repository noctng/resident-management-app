const prisma = require('../config/prisma');
const { logActivity } = require('../utils/logger');
const crypto = require('crypto');

/**
 * 1. Get Cart Items for current sales person
 */
exports.getCart = async (req, res) => {
  try {
    const salesPersonId = req.user?.id || 'admin';
    const items = await prisma.sales_cart_items.findMany({
      where: { sales_person_id: salesPersonId },
      include: {
        apartments: true,
      },
      orderBy: { created_at: 'desc' },
    });

    res.json({ success: true, items });
  } catch (err) {
    console.error('Lỗi lấy giỏ hàng:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2. Add Apartment to Cart (Soft 48h reservation - no matrix lock)
 */
exports.addToCart = async (req, res) => {
  try {
    const { apartment_id, lead_id, customer_id, notes } = req.body;
    const salesPersonId = req.user?.id || 'admin';
    const salesPersonName = req.user?.name || req.user?.username || 'Admin';

    if (!apartment_id) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn căn hộ' });
    }

    // Check if already in cart
    const existing = await prisma.sales_cart_items.findFirst({
      where: { sales_person_id: salesPersonId, apartment_id },
    });

    if (existing) {
      return res.json({ success: true, message: 'Căn hộ đã có sẵn trong giỏ hàng', item: existing });
    }

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    const item = await prisma.sales_cart_items.create({
      data: {
        id: 'cart_' + crypto.randomBytes(6).toString('hex'),
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

    res.status(201).json({ success: true, message: 'Đã thêm căn vào giỏ hàng tư vấn', item });
  } catch (err) {
    console.error('Lỗi thêm giỏ hàng:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 3. Remove Item from Cart
 */
exports.removeFromCart = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.sales_cart_items.delete({ where: { id } });
    res.json({ success: true, message: 'Đã xóa khỏi giỏ hàng' });
  } catch (err) {
    console.error('Lỗi xóa giỏ hàng:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 4. Get All Bookings
 */
exports.getBookings = async (req, res) => {
  try {
    const { phase, status = 'ALL', search } = req.query;

    const where = {};
    if (status !== 'ALL') where.status = status;
    if (phase && phase !== 'ALL') {
      where.apartments = { phase_code: phase };
    }
    if (search) {
      where.OR = [
        { booking_code: { contains: search, mode: 'insensitive' } },
        { customer_name: { contains: search, mode: 'insensitive' } },
        { customer_phone: { contains: search } },
        { apartments: { code: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const bookings = await prisma.sales_bookings.findMany({
      where,
      include: {
        apartments: true,
      },
      orderBy: { created_at: 'desc' },
    });

    res.json({ success: true, bookings, totalCount: bookings.length });
  } catch (err) {
    console.error('Lỗi lấy danh sách giữ chỗ:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 5. Create Booking with ATOMIC LOCK (Blueprint B.3)
 */
exports.createBooking = async (req, res) => {
  try {
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
    } = req.body;

    const salesPersonId = req.user?.username || req.user?.name || 'Admin';

    if (!apartment_id || !customer_name || !customer_phone) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đủ thông tin Căn hộ, Tên khách hàng và Số điện thoại',
      });
    }

    // Execute inside Prisma Transaction for Atomic Lock
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check unit availability
      const unit = await tx.apartments.findUnique({
        where: { id: apartment_id },
      });

      if (!unit) {
        throw new Error('Không tìm thấy căn hộ trong hệ thống');
      }

      if (unit.sales_status && unit.sales_status !== 'AVAILABLE') {
        throw new Error(`Căn ${unit.code} hiện tại không sẵn bán (Trạng thái: ${unit.sales_status}). Đã có nhân sự khác thao tác trước.`);
      }

      // Check if there is an active booking
      const activeBooking = await tx.sales_bookings.findFirst({
        where: { apartment_id, status: 'ACTIVE' },
      });

      if (activeBooking) {
        throw new Error(`Căn ${unit.code} đang có phiếu giữ chỗ ${activeBooking.booking_code} còn hiệu lực`);
      }

      // 2. Generate Booking Code: BK-{PHASE}-{CODE}-{DATE}
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const bookingCode = `BK-${unit.code}-${dateStr}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days standard

      // 3. Lock Unit Status to BOOKED
      await tx.apartments.update({
        where: { id: apartment_id },
        data: { sales_status: 'BOOKED' },
      });

      // 4. Create Booking record
      const booking = await tx.sales_bookings.create({
        data: {
          id: 'bk_' + crypto.randomBytes(6).toString('hex'),
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

      // Remove from cart if present
      await tx.sales_cart_items.deleteMany({
        where: { apartment_id },
      });

      return { booking, unit };
    });

    await logActivity(
      req.user,
      'TẠO_GIỮ_CHỖ_BĐS',
      'BOOKING',
      result.booking.id,
      result.booking.booking_code,
      `Khóa giữ chỗ căn ${result.unit.code} cho khách ${customer_name} (${customer_phone}) hạn đến ${result.booking.expires_at.toLocaleDateString('vi-VN')}`
    );

    res.status(201).json({
      success: true,
      message: `Giữ chỗ thành công căn ${result.unit.code}! Mã phiếu: ${result.booking.booking_code}`,
      booking: result.booking,
    });
  } catch (err) {
    console.error('Lỗi tạo giữ chỗ:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * 6. Cancel / Release Booking
 */
exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await prisma.sales_bookings.findUnique({
      where: { id },
      include: { apartments: true },
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu giữ chỗ' });
    }

    await prisma.$transaction(async (tx) => {
      // Release booking
      await tx.sales_bookings.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          released_at: new Date(),
          release_reason: reason || 'Hủy theo yêu cầu',
        },
      });

      // Release unit back to AVAILABLE
      await tx.apartments.update({
        where: { id: booking.apartment_id },
        data: { sales_status: 'AVAILABLE' },
      });
    });

    await logActivity(
      req.user,
      'HỦY_GIỮ_CHỖ_BĐS',
      'BOOKING',
      booking.id,
      booking.booking_code,
      `Giải phóng căn ${booking.apartments?.code}. Lý do: ${reason || 'Hủy giữ chỗ'}`
    );

    res.json({
      success: true,
      message: `Đã hủy giữ chỗ và giải phóng căn ${booking.apartments?.code} về trạng thái Sẵn bán`,
    });
  } catch (err) {
    console.error('Lỗi hủy giữ chỗ:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 7. Extend Booking (Gia hạn giữ chỗ tối đa +3 ngày)
 */
exports.extendBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { extra_days = 3, notes } = req.body;

    const booking = await prisma.sales_bookings.findUnique({ where: { id } });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu giữ chỗ' });
    }

    if ((booking.extension_count || 0) >= 2) {
      return res.status(400).json({ success: false, message: 'Phiếu giữ chỗ đã đạt giới hạn gia hạn tối đa (2 lần)' });
    }

    const currentExp = new Date(booking.expires_at);
    const newExp = new Date(currentExp.getTime() + Number(extra_days) * 24 * 60 * 60 * 1000);

    const updated = await prisma.sales_bookings.update({
      where: { id },
      data: {
        expires_at: newExp,
        extension_count: (booking.extension_count || 0) + 1,
        notes: notes ? `${booking.notes || ''}\n[Gia hạn + ${extra_days} ngày]: ${notes}` : booking.notes,
      },
      include: { apartments: true },
    });

    res.json({
      success: true,
      message: `Đã gia hạn giữ chỗ thêm ${extra_days} ngày. Hạn mới: ${newExp.toLocaleDateString('vi-VN')}`,
      booking: updated,
    });
  } catch (err) {
    console.error('Lỗi gia hạn giữ chỗ:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
