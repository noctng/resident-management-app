const prisma = require('../config/prisma');

function verifyExternalApiKey(req, res, next) {
  const provided =
    (req.headers['x-api-key'] || req.headers['x-api-key'.toLowerCase()] || '')
      .toString()
      .trim();
  const required = (process.env.EXTERNAL_API_KEY || '').trim();
  if (!required || provided !== required) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

async function getActiveAmenityUsage() {
  const usages = await prisma.amenity_usage.findMany({
    where: {
      status: { in: ['CONFIRMED', 'USED'] },
    },
    include: {
      residents: { select: { id: true, name: true } },
      apartments: { select: { id: true, code: true } },
    },
    orderBy: [{ usage_date: 'asc' }, { start_time: 'asc' }],
  });

  return usages.map((u) => ({
    id: u.id,
    bookingCode: u.booking_code,
    amenity: u.amenity,
    status: u.status,
    usageDate: u.usage_date ? u.usage_date.toISOString().split('T')[0] : null,
    startTime: u.start_time ? new Date(u.start_time).toISOString() : null,
    endTime: u.end_time ? new Date(u.end_time).toISOString() : null,
    residentId: u.resident_id,
    residentName: u.residents ? u.residents.name : null,
    apartmentId: u.apartment_id,
    apartmentCode: u.apartments ? u.apartments.code : null,
  }));
}

async function getAllAmenityHistory() {
  const usages = await prisma.amenity_usage.findMany({
    include: {
      residents: { select: { id: true, name: true } },
      apartments: { select: { id: true, code: true } },
    },
    orderBy: [{ usage_date: 'desc' }, { start_time: 'desc' }],
  });

  return usages.map((u) => ({
    id: u.id,
    bookingCode: u.booking_code,
    amenity: u.amenity,
    status: u.status,
    usageDate: u.usage_date ? u.usage_date.toISOString().split('T')[0] : null,
    startTime: u.start_time ? new Date(u.start_time).toISOString() : null,
    endTime: u.end_time ? new Date(u.end_time).toISOString() : null,
    residentId: u.resident_id,
    residentName: u.residents ? u.residents.name : null,
    apartmentId: u.apartment_id,
    apartmentCode: u.apartments ? u.apartments.code : null,
  }));
}

async function pushAmenityBookingToPartner(booking) {
  const enabled = (process.env.EXTERNAL_PUSH_ENABLED || 'false').trim().toLowerCase();
  if (enabled !== 'true') return { skipped: true };

  const baseUrl = (process.env.EXTERNAL_PARTNER_URL || '').trim();
  if (!baseUrl) return { skipped: true, reason: 'missing_url' };

  const payload = {
    source: 'resident-management-app',
    bookingId: booking.id,
    bookingCode: booking.booking_code,
    amenity: booking.amenity,
    status: booking.status,
    usageDate: booking.usageDate,
    startTime: booking.start_time ? new Date(booking.start_time).toISOString() : null,
    endTime: booking.end_time ? new Date(booking.end_time).toISOString() : null,
    residentId: booking.resident_id,
    apartmentId: booking.apartment_id,
    apartmentCode: booking.apartments?.code || null,
    residentName: booking.residents?.name || null,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': (process.env.EXTERNAL_API_KEY || '').trim(),
        'x-partner-secret': (process.env.EXTERNAL_PARTNER_SECRET || '').trim(),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return { skipped: false, success: false, status: response.status, body: text };
    }

    return { skipped: false, success: true, status: response.status };
  } catch (err) {
    clearTimeout(timer);
    return { skipped: false, success: false, error: err.message };
  }
}

module.exports = {
  verifyExternalApiKey,
  getActiveAmenityUsage,
  getAllAmenityHistory,
  pushAmenityBookingToPartner,
};
