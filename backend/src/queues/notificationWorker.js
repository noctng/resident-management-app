const { dequeue, ack, retry, getMetrics } = require('./notificationQueue');
const { sendPushToUser, sendPushToApartment } = require('../services/pushService');
const { sendEmail } = require('../services/emailService');
const { getRenderedContent } = require('../services/templateService');

async function processOne() {
  const event = await dequeue();
  if (!event) return null;

  try {
    switch (event.type) {
      case 'payment_confirmation':
      case 'utility_bill':
      case 'announcement': {
        const rendered = event.payload.templateCode
          ? await getRenderedContent(event.payload.templateCode, event.payload.variables || {})
          : null;
        const subject = rendered?.subject || event.payload.subject || 'Thông báo';
        const html = rendered?.html || event.payload.html || '';
        const emailTo = event.recipient?.email;

        if (emailTo) {
          await sendEmail(emailTo, subject, html);
        }

        if (event.payload.pushToApartmentId) {
          await sendPushToApartment(event.payload.pushToApartmentId, {
            title: event.payload.title || 'Thông báo',
            body: event.payload.body || '',
            url: event.payload.url || '/',
            tag: event.payload.tag || 'notification',
          });
        } else if (event.payload.userId) {
          await sendPushToUser(event.payload.userId, {
            title: event.payload.title || 'Thông báo',
            body: event.payload.body || '',
            url: event.payload.url || '/',
            tag: event.payload.tag || 'notification',
          });
        }
        break;
      }
      default:
        console.warn(`[NotificationWorker] Unknown event type: ${event.type}`);
    }

    await ack(event.id);
    return { status: 'sent', id: event.id };
  } catch (err) {
    console.error(`[NotificationWorker] Failed ${event.id}:`, err.message);
    const result = await retry(event);
    return { status: result.retried ? 'retried' : 'dead', id: event.id, reason: result.reason };
  }
}

async function startWorker() {
  console.log('[NotificationWorker] Started');
  let running = true;

  async function loop() {
    while (running) {
      try {
        const result = await processOne();
        if (!result) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        console.log(`[NotificationWorker] ${result.status}: ${result.id}`);
      } catch (err) {
        console.error('[NotificationWorker] Loop error:', err.message);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  loop();

  return {
    stop() {
      running = false;
    },
    async metrics() {
      return getMetrics();
    },
  };
}

module.exports = { startWorker };
