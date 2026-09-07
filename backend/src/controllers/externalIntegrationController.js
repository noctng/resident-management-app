const prisma = require('../config/prisma');
const { getActiveAmenityUsage, getAllAmenityHistory, pushAmenityBookingToPartner } = require('../services/externalIntegrationService');

// GET /api/external/amenity/active
exports.getActiveAmenityUsage = async (req, res) => {
  try {
    const data = await getActiveAmenityUsage();
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

// GET /api/external/amenity/history
exports.getAllAmenityHistory = async (req, res) => {
  try {
    const data = await getAllAmenityHistory();
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

// Fire-and-forget outbound push for a single booking
exports.triggerPartnerPush = async (booking) => {
  try {
    if (!booking) return;
    const result = await pushAmenityBookingToPartner(booking);
    if (!result.skipped) {
      console.log('[ExternalIntegration] partner push result:', result);
    }
  } catch (err) {
    console.error('[ExternalIntegration] partner push error:', err);
  }
};
