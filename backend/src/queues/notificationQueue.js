const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  connectTimeout: 1000,
  lazyConnect: true,
});

const queueKey = 'notifications:queue';
const processingKey = 'notifications:processing';
const dedupePrefix = 'notifications:dedupe:';

async function enqueue(event) {
  const payload = {
    id: event.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: event.type,
    recipient: event.recipient || null,
    payload: event.payload || {},
    createdAt: Date.now(),
    attempts: 0,
    maxAttempts: event.maxAttempts || 3,
  };

  const dedupeKey = `${dedupePrefix}${payload.type}:${payload.recipient?.userId || ''}:${payload.payload.tag || ''}`;
  const exists = await redis.set(dedupeKey, 1, 'EX', 60 * 60, 'NX');

  if (!exists) {
    return { queued: false, reason: 'duplicate' };
  }

  await redis.rpush(queueKey, JSON.stringify(payload));
  return { queued: true, id: payload.id };
}

async function dequeue() {
  const raw = await redis.lpop(queueKey);
  if (!raw) return null;
  try {
    const event = JSON.parse(raw);
    await redis.hset(processingKey, event.id, raw);
    await redis.expire(processingKey, 60 * 60);
    return event;
  } catch (err) {
    return null;
  }
}

async function ack(id) {
  await redis.hdel(processingKey, id);
}

async function retry(event) {
  event.attempts = (event.attempts || 0) + 1;
  if (event.attempts >= event.maxAttempts) {
    await redis.hdel(processingKey, event.id);
    return { retried: false, reason: 'max_attempts' };
  }

  await redis.rpush(queueKey, JSON.stringify(event));
  await redis.hdel(processingKey, event.id);
  return { retried: true };
}

async function getMetrics() {
  const depth = await redis.llen(queueKey);
  const processing = await redis.hlen(processingKey);
  return { depth, processing };
}

module.exports = { enqueue, dequeue, ack, retry, getMetrics };
