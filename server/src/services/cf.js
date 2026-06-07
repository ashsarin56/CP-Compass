const axios = require('axios');
const BaseService = require('./BaseService');
const { getCache, setCache, CACHE_TTL } = require('../config/redis');

class CFApiService extends BaseService {
  constructor() {
    super();
  }

  async getUserSubmissions(handle) {
    const cacheKey = `cf:user.status:${handle}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      console.log(`Cache HIT: ${cacheKey}`);
      return cached;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/user.status`, {
        params: { handle, from: 1, count: 10000 },
        timeout: this.defaultTimeout
      });

      if (response.data.status !== 'OK') {
        throw new Error(`CF API error: ${response.data.comment}`);
      }

      const result = response.data.result;
      await setCache(cacheKey, result, CACHE_TTL.CF_API);
      console.log(`Cache MISS → stored: ${cacheKey}`);
      return result;
    } catch (err) {
      if (err.response?.status === 400) {
        throw new Error(`CF handle not found: ${handle}`);
      }
      throw new Error(`CF API unreachable: ${err.message}`);
    }
  }

  async getUserInfo(handle) {
    const cacheKey = `cf:user.info:${handle}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      console.log(`Cache HIT: ${cacheKey}`);
      return cached;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/user.info`, {
        params: { handles: handle },
        timeout: this.defaultTimeout
      });

      if (response.data.status !== 'OK') {
        throw new Error(`CF API error: ${response.data.comment}`);
      }

      const result = response.data.result[0];
      await setCache(cacheKey, result, CACHE_TTL.CF_API);
      console.log(`Cache MISS → stored: ${cacheKey}`);
      return result;
    } catch (err) {
      if (err.response?.status === 400) {
        throw new Error(`CF handle not found: ${handle}`);
      }
      throw new Error(`CF API unreachable: ${err.message}`);
    }
  }

  async getUserRatingHistory(handle) {
    const cacheKey = `cf:user.rating:${handle}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      console.log(`Cache HIT: ${cacheKey}`);
      return cached;
    }

    try {
      await this.sleep(300);
      const response = await axios.get(`${this.baseUrl}/user.rating`, {
        params: { handle },
        timeout: this.defaultTimeout
      });

      if (response.data.status !== 'OK') {
        throw new Error(`CF API error: ${response.data.comment}`);
      }

      const result = response.data.result;
      await setCache(cacheKey, result, CACHE_TTL.CF_API);
      console.log(`Cache MISS → stored: ${cacheKey}`);
      return result;
    } catch (err) {
      throw new Error(`CF rating fetch failed: ${err.message}`);
    }
  }
}

module.exports = new CFApiService();