const webPush = require('web-push');
const repo = require('../repositories/pushRepository');

webPush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

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

// ============ SEND PUSH (used by amenity/feedback/notification/unifiedBilling/webhook) ============
const buildPayload = (payload) =>
  JSON.stringify({
    title: payload.title || 'Thông báo',
    body: payload.body || '',
    icon: payload.icon || '/logo.svg',
    badge: '/logo.svg',
    tag: payload.tag || 'default',
    url: payload.url || '/',
    data: { url: payload.url || '/' },
  });

const sendOne = async (sub, notificationPayload) => {
  try {
    await webPush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      notificationPayload
    );
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      await repo.deleteById(sub.id);
    } else {
      console.error('[Push] Send error:', err.message);
    }
  }
};

const sendPushToUser = async (userId, payload) => {
  try {
    const subscriptions = await repo.findByUser(userId);
    if (subscriptions.length === 0) return;
    const notificationPayload = buildPayload(payload);
    const results = await Promise.allSettled(subscriptions.map((sub) => sendOne(sub, notificationPayload)));
    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    console.log(`Push: sent=${sent}, failed=${failed}, userId=${userId}`);
  } catch (err) {
    console.error('sendPushToUser error:', err.message);
  }
};

const sendPushToApartment = async (apartmentId, payload) => {
  try {
    const occupancies = await repo.findResidentIdsByApartment(apartmentId);
    const residentIds = occupancies.map((o) => o.resident_id).filter(Boolean);
    const subscriptions = await repo.findByApartmentOrResidents(apartmentId, residentIds);

    if (subscriptions.length === 0) {
      console.log(`[Push] No push subscriptions found for apartment ${apartmentId}`);
      return;
    }

    console.log(`[Push] Found ${subscriptions.length} subscription(s) for apartment ${apartmentId}`);
    const notificationPayload = buildPayload(payload);
    await Promise.allSettled(subscriptions.map((sub) => sendOne(sub, notificationPayload)));
  } catch (err) {
    console.error('sendPushToApartment error:', err.message);
  }
};

const sendPushToAllResidents = async (payload) => {
  try {
    const subscriptions = await repo.findResidentSubs();
    if (subscriptions.length === 0) {
      console.log('[Push] No resident subscriptions found for broadcast');
      return;
    }

    console.log(`[Push] Broadcasting to ${subscriptions.length} resident subscription(s)`);
    const notificationPayload = JSON.stringify({
      title: payload.title || 'Tin tức mới',
      body: payload.body || '',
      icon: payload.icon || '/logo.svg',
      badge: '/logo.svg',
      tag: payload.tag || 'news',
      url: payload.url || '/?tab=news',
      data: { url: payload.url || '/?tab=news' },
    });

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webPush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            notificationPayload
          );
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await repo.deleteById(sub.id).catch(() => {});
          } else {
            console.error('[Push] Broadcast send error:', err.message);
          }
        }
      })
    );
  } catch (err) {
    console.error('sendPushToAllResidents error:', err.message);
  }
};

module.exports = { subscribe, unsubscribe, getStatus, sendPushToUser, sendPushToApartment, sendPushToAllResidents };
