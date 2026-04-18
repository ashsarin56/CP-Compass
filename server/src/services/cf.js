const axios = require('axios');
require('dotenv').config();

const CF_BASE = process.env.CF_API_BASE;

// Sleep helper — CF API allows 1 request per 2 seconds
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch all submissions for a CF handle
// Returns array of submission objects or throws
async function getUserSubmissions(handle) {
  try {
    const response = await axios.get(`${CF_BASE}/user.status`, {
      params: { handle, from: 1, count: 10000 },
      timeout: 10000
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

// Fetch user info + current rating
async function getUserInfo(handle) {
  try {
    const response = await axios.get(`${CF_BASE}/user.info`, {
      params: { handles: handle },
      timeout: 10000
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

// Fetch contest rating history
async function getUserRatingHistory(handle) {
  try {
    await sleep(300); // respect rate limit between calls
    const response = await axios.get(`${CF_BASE}/user.rating`, {
      params: { handle },
      timeout: 10000
    });

    if (response.data.status !== 'OK') {
      throw new Error(`CF API error: ${response.data.comment}`);
    }

    return response.data.result;
  } catch (err) {
    throw new Error(`CF rating fetch failed: ${err.message}`);
  }
}

module.exports = { getUserSubmissions, getUserInfo, getUserRatingHistory };