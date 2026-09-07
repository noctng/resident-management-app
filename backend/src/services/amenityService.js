const repo = require('../repositories/amenityRepository');
const { generateRandomId } = require('../utils/helpers');
const { enqueue } = require('../queues/notificationQueue');

// Map entity (snake_case từ Prisma) → DTO (camelCase trả frontend).
// Giữ NGUYÊN shape của formatter `f` trong controller cũ.
function formatTime(d) {
  return d
    ? new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : null;
}

function toDTO(u) {
  return {
    id: u.id,
    apartmentId: u.apartment_id,
    residentId: u.resident_id,
    residentName: u.residents ? u.residents.name : null,
    amenity: u.amenity,
    usageDate: u.usage_date ? u.usage_date.toISOString().split('T')[0] : null,
    startTime: formatTime(u.start_time),
    endTime: formatTime(u.end_time),
    bookingCode: u.booking_code,
    status: u.status,
  };
}

// GET danh sách lượt sử dụng tiện ích
async function getAmenityUsage() {
  const usages = await repo.listAllUsage();
  return usages.map(toDTO);
}

// POST tạo booking mới
async function createAmenityBooking(dto) {
  const { apartmentId, residentId, amenity, usageDate, startTime, endTime } = dto;

  // Check quyền cư dân (nếu có) — chỉ người được phép mới đặt được
  if (residentId) {
    const resident = await repo.findResidentById(residentId);
    if (!resident || !resident.can_use_amenities) {
      const err = new Error('Cư dân không được phép đặt.');
      err.status = 403;
      throw err;
    }
  }

  const bookingCode = `BK-${amenity}-${Math.random().toString(36).substring(7).toUpperCase()}`;
  const created = await repo.createUsage({
    id: `amenity_${generateRandomId()}`,
    apartment_id: apartmentId,
    resident_id: residentId || null,
    amenity,
    usage_date: new Date(usageDate),
    start_time: new Date(`${usageDate}T${startTime}`),
    end_time: new Date(`${usageDate}T${endTime}`),
    booking_code: bookingCode,
    status: 'PENDING',
  });

  // Push notification to apartment (fire-and-forget)
  enqueue({
    type: 'announcement',
    recipient: { apartmentId },
    payload: {
      title: 'Đặt lịch tiện ích thành công',
      body: `Mã đặt lịch: ${bookingCode} - ${amenity} ngày ${usageDate}`,
      url: '/resident',
      tag: `amenity-${created.id}`,
    },
  }).catch(console.error);

  return toDTO(created);
}

// PUT cập nhật trạng thái booking (có phân quyền resident / manager-admin)
// actor = { isResident: boolean, residentId?: string, userRole?: number }
async function updateBookingStatus(id, status, actor) {
  const existingBooking = await repo.findUsageById(id);
  if (!existingBooking) {
    const err = new Error('Không tìm thấy đặt lịch.');
    err.status = 404;
    throw err;
  }

  // Authorization check
  if (actor.isResident) {
    // Residents can only cancel their booking
    if (status !== 'CANCELLED') {
      const err = new Error('Cư dân chỉ có quyền hủy đặt chỗ.');
      err.status = 403;
      throw err;
    }

    // Check if booking belongs to this resident or their apartment
    const isOwner =
      existingBooking.resident_id === actor.residentId ||
      existingBooking.apartments?.occupancies?.some(
        (o) => o.resident_id === actor.residentId
      );

    if (!isOwner) {
      const err = new Error('Bạn không có quyền thao tác trên đặt lịch này.');
      err.status = 403;
      throw err;
    }
  } else if (actor.userRole === undefined || (actor.userRole !== 0 && actor.userRole !== 1)) {
    const err = new Error('Quyền truy cập bị từ chối.');
    err.status = 403;
    throw err;
  }

  const updatedBooking = await repo.updateUsage(id, { status });

  // Push notification for status change
  const statusLabels = { CONFIRMED: 'đã xác nhận', CANCELLED: 'đã hủy', USED: 'đã sử dụng' };
  const label = statusLabels[updatedBooking.status] || updatedBooking.status;
  enqueue({
    type: 'announcement',
    recipient: { apartmentId: updatedBooking.apartment_id },
    payload: {
      title: 'Cập nhật đặt lịch tiện ích',
      body: `Đặt lịch ${updatedBooking.booking_code} ${label}`,
      url: '/resident',
      tag: `amenity-status-${updatedBooking.id}`,
    },
  }).catch(console.error);

  return toDTO(updatedBooking);
}

// PUT cập nhật booking (manager/admin) — chỉ update field được truyền
async function updateAmenityBooking(id, dto) {
  const { apartmentId, residentId, amenity, usageDate, startTime, endTime, status } = dto;

  const existing = await repo.findUsageById(id);
  if (!existing) {
    const err = new Error('Không tìm thấy đặt lịch.');
    err.status = 404;
    throw err;
  }

  // Build update data — only include fields that were provided
  const updateData = {};
  if (apartmentId !== undefined) updateData.apartment_id = apartmentId;
  if (residentId !== undefined) updateData.resident_id = residentId || null;
  if (amenity !== undefined) updateData.amenity = amenity;
  if (status !== undefined) updateData.status = status;
  if (usageDate !== undefined) updateData.usage_date = new Date(usageDate);
  const baseDate = usageDate || existing.usage_date.toISOString().split('T')[0];
  if (startTime !== undefined) updateData.start_time = new Date(`${baseDate}T${startTime}`);
  if (endTime !== undefined) updateData.end_time = new Date(`${baseDate}T${endTime}`);

  const updatedBooking = await repo.updateUsage(id, updateData);
  return toDTO(updatedBooking);
}

// DELETE booking
async function deleteAmenityBooking(id) {
  const existing = await repo.findUsageById(id);
  if (!existing) {
    const err = new Error('Không tìm thấy đặt lịch.');
    err.status = 404;
    throw err;
  }

  await repo.deleteUsage(id);
  return { message: 'Đã xóa đặt lịch thành công.' };
}

// EXPORT — validate tháng, lấy dữ liệu báo cáo (Excel render ở controller)
async function getExportData(month) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    const err = new Error('Thiếu hoặc sai định dạng tháng (YYYY-MM)');
    err.status = 400;
    throw err;
  }

  const [year, monthNum] = month.split('-').map(Number);
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 1);

  const usages = await repo.findByDateRange(startDate, endDate);
  const apartments = await repo.listApartments();

  return { usages, apartments, monthNum, year, month };
}

module.exports = {
  toDTO,
  getAmenityUsage,
  createAmenityBooking,
  updateBookingStatus,
  updateAmenityBooking,
  deleteAmenityBooking,
  getExportData,
};
