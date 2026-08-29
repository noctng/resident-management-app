const service = require('../services/pushService');

exports.getVapidPublicKey = (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};

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

    const result = await service.subscribe({ endpoint, p256dh, auth, apartmentId, userId, userType });
    res.json(result);
  } catch (err) {
    console.error('Push subscribe error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

exports.unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ message: 'Thiếu endpoint' });
    }

    const result = await service.unsubscribe(endpoint);
    res.json(result);
  } catch (err) {
    console.error('Push unsubscribe error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

exports.getStatus = async (req, res) => {
  try {
    const userId = req.user?.id || req.resident?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Không xác định được người dùng' });
    }
    const result = await service.getStatus(userId);
    res.json(result);
  } catch (err) {
    console.error('Push status error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};
