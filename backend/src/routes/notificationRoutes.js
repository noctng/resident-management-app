const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');
const prisma = require('../config/prisma');

// GET /api/notifications - list notifications for current user/apartment
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const apartmentId = req.query.apartmentId;
    const status = req.query.status;
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const offset = parseInt(req.query.offset || '0', 10);

    const where = {
      ...(status ? { status } : {}),
      ...(apartmentId ? { recipient: apartmentId } : {}),
      ...(userId && !apartmentId ? { recipient: userId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.notifications.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.notifications.count({ where }),
    ]);

    res.json({ items, total, limit, offset });
  } catch (err) {
    console.error('List notifications error:', err);
    res.status(500).json({ message: 'Lỗi lấy danh sách thông báo' });
  }
});

// PATCH /api/notifications/:id/read - mark as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await prisma.notifications.update({
      where: { id },
      data: { status: 'read', updated_at: new Date() },
    });
    res.json(updated);
  } catch (err) {
    console.error('Mark notification read error:', err);
    res.status(500).json({ message: 'Lỗi cập nhật trạng thái thông báo' });
  }
});

// GET /api/notifications/queue/metrics - queue depth/processing
router.get('/queue/metrics', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { getMetrics } = require('../queues/notificationQueue');
    const metrics = await getMetrics();
    res.json(metrics);
  } catch (err) {
    console.error('Notification queue metrics error:', err);
    res.status(500).json({ message: 'Lỗi lấy metrics notification queue' });
  }
});

module.exports = router;
