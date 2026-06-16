const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getClient, connectRedis } = require('../config/redis');

let useRedis = false;

try {
  const c = getClient();
  if (c.isOpen) useRedis = true;
} catch {
}

function createLimiter({ windowMs, max, prefix, keyGenerator }) {
  const options = {
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, try again later.' },
    validate: { default: true }
  };

  if (useRedis) {
    options.store = new RedisStore({
      sendCommand: (...args) => getClient().sendCommand(args),
      prefix: `rl:${prefix}:`
    });
  }

  if (keyGenerator) {
    options.keyGenerator = keyGenerator;
    options.validate = { ...options.validate, keyGeneratorIpFallback: false };
  }

  return rateLimit(options);
}
const authStrict = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  prefix: 'auth-strict',
  keyGenerator: (req) => {
    const email = req.body?.email || '';
    return `${req.ip}:${email}`;
  }
});


const authMe = createLimiter({
  windowMs: 60 * 1000,
  max: 60,
  prefix: 'auth-me'
});


const apiGeneral = createLimiter({
  windowMs: 60 * 1000,
  max: 120,
  prefix: 'api-general'
});


const apiWrite = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  prefix: 'api-write'
});

const recommendation = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  prefix: 'api-reco'
});

module.exports = { authStrict, authMe, apiGeneral, apiWrite, recommendation };
