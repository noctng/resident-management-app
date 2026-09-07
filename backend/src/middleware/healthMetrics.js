const { redisPing } = require('../middleware/redisRateLimiter');

async function getHealth() {
  const redisOk = await redisPing();

  return {
    status: redisOk ? 'ok' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    redis: {
      connected: redisOk,
    },
  };
}

async function getMetrics() {
  const redisOk = await redisPing();

  return {
    timestamp: new Date().toISOString(),
    process: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    },
    redis: {
      connected: redisOk,
    },
  };
}

module.exports = { getHealth, getMetrics };
