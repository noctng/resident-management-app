const prisma = require('../config/prisma');

/**
 * GET /api/push/vapid-public-key
 * Returns the VAPID public key for the frontend to use
 */
exports.getVapidPublicKey = (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};

/**
 * POST /api/push/subscribe
 * Body: { endpoint, p256dh, auth, apartmentId? }
 * Saves a push subscription for the authenticated user
 */
exports.subscribe = async (req, res) => {
  try {
    const { endpoint, p256dh, auth, apartmentId } = req.body;
    const userId = req.user?.id || req.resident?.id;
    const userType = req.user ? 'admin' : 'resident';
    if (!userId) {
      return res.status(401).json({ message: 'Không xác định được người dùng' });
    }

    if (!endpoint || !p256dh || !auth) {
      return res.status(400).json({ message: 'Thiếu thông tin subscription' });
    }

    // Upsert — if endpoint already exists, update it
    const existing = await prisma.push_subscriptions.findUnique({
      where: { endpoint },
    });

    if (existing) {
      await prisma.push_subscriptions.update({
        where: { endpoint },
        data: {
          user_id: userId,
          user_type: userType,
          p256dh,
          auth,
          apartment_id: apartmentId || existing.apartment_id,
        },
      });
    } else {
      await prisma.push_subscriptions.create({
        data: {
          user_id: userId,
          user_type: userType,
          endpoint,
          p256dh,
          auth,
          apartment_id: apartmentId || null,
        },
      });
    }

    res.json({ message: 'Đăng ký nhận thông báo thành công' });
  } catch (err) {
    console.error('Push subscribe error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

/**
 * POST /api/push/unsubscribe
 * Body: { endpoint }
 * Removes a push subscription
 */
exports.unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ message: 'Thiếu endpoint' });
    }

    await prisma.push_subscriptions.deleteMany({
      where: { endpoint },
    });

    res.json({ message: 'Hủy đăng ký thông báo thành công' });
  } catch (err) {
    console.error('Push unsubscribe error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

/**
 * GET /api/push/status
 * Returns whether the current user has any push subscriptions
 */
exports.getStatus = async (req, res) => {
  try {
    const userId = req.user?.id || req.resident?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Không xác định được người dùng' });
    }
    const count = await prisma.push_subscriptions.count({
      where: { user_id: userId },
    });
    res.json({ subscribed: count > 0, count });
  } catch (err) {
    console.error('Push status error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};
