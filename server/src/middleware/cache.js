const { getCache, setCache } = require('../config/redis');

/**
 * @param {function} keyFn - (req) => string builds the Redis key from the request.
 * @param {number} ttlSeconds - cache TTL in seconds.
 */
function cacheMiddleware(keyFn, ttlSeconds) {
  return async (req, res, next) => {
    const key = keyFn(req);

    try {
      const cached = await getCache(key);
      if (cached) {
        console.log(`Cache HIT: ${key}`);
        return res.json(cached);
      }
    } catch (err) {
      console.error(`Cache middleware error: ${err.message}`);
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setCache(key, body, ttlSeconds).catch(() => {});
        console.log(`Cache MISS → stored: ${key} (TTL ${ttlSeconds}s)`);
      }
      return originalJson(body);
    };

    next();
  };
}

module.exports = cacheMiddleware;
