const { createClient } = require('redis');

const CACHE_TTL = {
  PROFILE: 3600,
  CF_API: 21600,
  PROBLEMSET: 14400,
  RECOMMENDATION: 86400
};

let client;
let isRedisAvailable = false;

function getClient() {
  if (!client) {
    client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            console.warn('Redis: max reconnect attempts reached — running without cache');
            isRedisAvailable = false;
            return false;
          }
          return Math.min(retries * 500, 3000);
        }
      }
    });
    client.on('error', () => {
      if (isRedisAvailable) {
        console.warn('Redis: connection lost');
        isRedisAvailable = false;
      }
    });
    client.on('connect', () => {
      console.log('Redis connected');
      isRedisAvailable = true;
    });
    client.on('end', () => {
      isRedisAvailable = false;
    });
  }
  return client;
}

async function connectRedis() {
  try {
    const c = getClient();
    if (!c.isOpen) {
      await c.connect();
    }
  } catch (err) {
    console.warn('Redis: could not connect — server will run without cache');
    isRedisAvailable = false;
  }
}

async function disconnectRedis() {
  if (client && client.isOpen) {
    await client.quit();
    console.log('Redis disconnected');
  }
}

function isAvailable() {
  return isRedisAvailable;
}

async function getCache(key) {
  if (!isRedisAvailable) return null;
  try {
    const data = await client.get(key);
    if (!data) return null;
    return JSON.parse(data);
  } catch (err) {
    console.error(`Redis GET error [${key}]:`, err.message);
    return null;
  }
}

async function setCache(key, value, ttlSeconds) {
  if (!isRedisAvailable) return;
  try {
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (err) {
    console.error(`Redis SET error [${key}]:`, err.message);
  }
}

async function delCache(key) {
  if (!isRedisAvailable) return;
  try {
    await client.del(key);
  } catch (err) {
    console.error(`Redis DEL error [${key}]:`, err.message);
  }
}

async function delCachePattern(pattern) {
  if (!isRedisAvailable) return;
  try {
    const keys = [];
    for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      keys.push(key);
    }
    if (keys.length > 0) {
      await client.del(keys);
      console.log(`Cache busted: ${keys.length} keys matching "${pattern}"`);
    }
  } catch (err) {
    console.error(`Redis DEL pattern error [${pattern}]:`, err.message);
  }
}

module.exports = {
  CACHE_TTL,
  getClient,
  connectRedis,
  disconnectRedis,
  isAvailable,
  getCache,
  setCache,
  delCache,
  delCachePattern
};
