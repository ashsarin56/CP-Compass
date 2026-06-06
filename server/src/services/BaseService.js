const User = require('../models/User');
require('dotenv').config();

class BaseService {
  #baseUrl;
  #cacheTTL;
  #defaultTimeout;

  constructor({ baseUrl, cacheTTL, defaultTimeout } = {}) {
    this.#baseUrl = baseUrl || process.env.CF_API_BASE;
    this.#cacheTTL = cacheTTL || 6 * 60 * 60 * 1000;
    this.#defaultTimeout = defaultTimeout || 10000;
  }

  get baseUrl() {
    return this.#baseUrl;
  }

  get cacheTTL() {
    return this.#cacheTTL;
  }

  get defaultTimeout() {
    return this.#defaultTimeout;
  }

  async findUserOrThrow(handle) {
    const normalizedHandle = this.normalizeHandle(handle);
    const user = await User.findOne({ cf_handle: normalizedHandle });
    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }
    return user;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  normalizeHandle(handle) {
    return handle.trim().toUpperCase();
  }
}

module.exports = BaseService;
