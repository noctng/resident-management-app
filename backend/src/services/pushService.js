const webPush = require('web-push');
const prisma = require('../config/prisma');

// Configure VAPID
webPush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * Send push notification to a specific user (all their subscriptions)
 * @param {string} userId - User ID
 * @param {object} payload - { title, body, url, icon, tag }
 */
async function sendPushToUser(userId, payload) {
  try {
    const subscriptions = await prisma.push_subscriptions.findMany({
      where: { user_id: userId },
    });

    if (subscriptions.length === 0) return;

    const notificationPayload = JSON.stringify({
      title: payload.title || 'Thông báo',
      body: payload.body || '',
      icon: payload.icon || '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: payload.tag || 'default',
      url: payload.url || '/',
      data: { url: payload.url || '/' },
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            notificationPayload
          );
        } catch (err) {
          // 410 Gone = subscription expired, remove it
          if (err.statusCode === 410) {
            await prisma.push_subscriptions.delete({ where: { id: sub.id } });
          } else {
            console.error('Push send error:', err.message);
          }
        }
      })
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    console.log(`Push: sent=${sent}, failed=${failed}, userId=${userId}`);
  } catch (err) {
    console.error('sendPushToUser error:', err.message);
  }
}

/**
 * Send push notification to all residents of an apartment
 * @param {string} apartmentId - Apartment ID
 * @param {object} payload - { title, body, url, icon, tag }
 */
async function sendPushToApartment(apartmentId, payload) {
  try {
    // 1. Find all resident IDs associated with this apartment
    const occupancies = await prisma.occupancies.findMany({
      where: { apartment_id: apartmentId },
      select: { resident_id: true },
    });
    const residentIds = occupancies.map((o) => o.resident_id).filter(Boolean);

    // 2. Query subscriptions
    const subscriptions = await prisma.push_subscriptions.findMany({
      where: {
        OR: [
          { apartment_id: apartmentId },
          ...(residentIds.length > 0 ? [{ user_id: { in: residentIds } }] : []),
        ],
      },
    });

    if (subscriptions.length === 0) {
      console.log(`[Push] No push subscriptions found for apartment ${apartmentId}`);
      return;
    }

    console.log(`[Push] Found ${subscriptions.length} subscription(s) for apartment ${apartmentId}`);

    const notificationPayload = JSON.stringify({
      title: payload.title || 'Thông báo',
      body: payload.body || '',
      icon: payload.icon || '/logo.svg',
      badge: '/logo.svg',
      tag: payload.tag || 'payment-success',
      url: payload.url || '/',
      data: { url: payload.url || '/' },
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            notificationPayload
          );
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await prisma.push_subscriptions.delete({ where: { id: sub.id } });
          } else {
            console.error('[Push] Send error:', err.message);
          }
        }
      })
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    console.log(`[Push] Successfully sent ${sent}/${subscriptions.length} notifications for apartment ${apartmentId}`);
  } catch (err) {
    console.error('[Push] sendPushToApartment error:', err.message);
  }
}

module.exports = { sendPushToUser, sendPushToApartment };

/**
 * Send push notification to ALL residents (all push_subscriptions with user_type='resident')
 * Used when publishing news announcements.
 * @param {object} payload - { title, body, url, icon, tag }
 */
async function sendPushToAllResidents(payload) {
  try {
    const subscriptions = await prisma.push_subscriptions.findMany({
      where: { user_type: 'resident' },
    });

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

    let sent = 0;
    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webPush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            notificationPayload
          );
          sent++;
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await prisma.push_subscriptions.delete({ where: { id: sub.id } }).catch(() => {});
          } else {
            console.error('[Push] Broadcast send error:', err.message);
          }
        }
      })
    );

    console.log(`[Push] Broadcast complete: sent=${sent}/${subscriptions.length}`);
  } catch (err) {
    console.error('[Push] sendPushToAllResidents error:', err.message);
  }
}

module.exports = { sendPushToUser, sendPushToApartment, sendPushToAllResidents };

