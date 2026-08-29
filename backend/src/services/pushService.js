const repo = require('../repositories/pushRepository');

const subscribe = async ({ endpoint, p256dh, auth, apartmentId, userId, userType }) => {
  const existing = await repo.findByEndpoint(endpoint);

  if (existing) {
    await repo.update(endpoint, {
      user_id: userId,
      user_type: userType,
      p256dh,
      auth,
      apartment_id: apartmentId || existing.apartment_id,
    });
  } else {
    await repo.create({
      user_id: userId,
      user_type: userType,
      endpoint,
      p256dh,
      auth,
      apartment_id: apartmentId || null,
    });
  }

  return { message: 'Đăng ký nhận thông báo thành công' };
};

const unsubscribe = async (endpoint) => {
  await repo.deleteMany(endpoint);
  return { message: 'Hủy đăng ký thông báo thành công' };
};

const getStatus = async (userId) => {
  const count = await repo.countByUser(userId);
  return { subscribed: count > 0, count };
};

module.exports = { subscribe, unsubscribe, getStatus };
