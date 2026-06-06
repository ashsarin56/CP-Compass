const axios = require('axios');
const BaseService = require('./BaseService');

class CFApiService extends BaseService {
  constructor() {
    super();
  }

  async getUserSubmissions(handle) {
    try {
      const response = await axios.get(`${this.baseUrl}/user.status`, {
        params: { handle, from: 1, count: 10000 },
        timeout: this.defaultTimeout
      });

      if (response.data.status !== 'OK') {
        throw new Error(`CF API error: ${response.data.comment}`);
      }

      return response.data.result;
    } catch (err) {
      if (err.response?.status === 400) {
        throw new Error(`CF handle not found: ${handle}`);
      }
      throw new Error(`CF API unreachable: ${err.message}`);
    }
  }

  async getUserInfo(handle) {
    try {
      const response = await axios.get(`${this.baseUrl}/user.info`, {
        params: { handles: handle },
        timeout: this.defaultTimeout
      });

      if (response.data.status !== 'OK') {
        throw new Error(`CF API error: ${response.data.comment}`);
      }

      return response.data.result[0];
    } catch (err) {
      if (err.response?.status === 400) {
        throw new Error(`CF handle not found: ${handle}`);
      }
      throw new Error(`CF API unreachable: ${err.message}`);
    }
  }

  async getUserRatingHistory(handle) {
    try {
      await this.sleep(300);
      const response = await axios.get(`${this.baseUrl}/user.rating`, {
        params: { handle },
        timeout: this.defaultTimeout
      });

      if (response.data.status !== 'OK') {
        throw new Error(`CF API error: ${response.data.comment}`);
      }

      return response.data.result;
    } catch (err) {
      throw new Error(`CF rating fetch failed: ${err.message}`);
    }
  }
}

module.exports = new CFApiService();