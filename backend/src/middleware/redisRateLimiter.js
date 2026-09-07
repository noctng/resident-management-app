const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let redisClient;
try {
  redisClient = new Redis(redisUrl, {
    connectTimeout: 1000,
    lazyConnect: true,
  });
} catch (err) {
  redisClient = null;
}

async function redisPing() {
  if (!redisClient) return false;
  try {
    await redisClient.ping();
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Sliding window log rate limiter backed by Redis.
 * - Key: rl:<ip>:<route>
 * - Store request timestamps as sorted set
 * - Remove timestamps outside window
 * - Count remaining timestamps
 */
async function isAllowed({ ip, route, windowMs, max }) {
  const key = `rl:${ip}:${route}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  if (!redisClient) {
    return { allowed: true, remaining: max, retryAfterMs: null };
  }

  try {
    const multi = redisClient.multi();
    multi.zremrangebyscore(key, 0, windowStart);
    multi.zadd(key, now, `${now}-${Math.random()}`);
    multi.zcard(key);
    multi.expire(key, Math.ceil(windowMs / 1000) + 5);
    const results = await multi.exec();
    const count = results[2][1];

    if (count <= max) {
      return { allowed: true, remaining: max - count, retryAfterMs: null };
    }

    const oldest = await redisClient.zrange(key, 0, 0);
    const oldestTs = oldest.length ? Number(oldest[0].split('-')[0]) : now;
    const retryAfterMs = Math.max(0, oldestTs + windowMs - now);

    return { allowed: false, remaining: 0, retryAfterMs };
  } catch (err) {
    return { allowed: true, remaining: max, retryAfterMs: null };
  }
}

module.exports = {
  redisClient,
  redisPing,
  isAllowed,
};
