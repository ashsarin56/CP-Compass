const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function getToken() {
  return localStorage.getItem('cp_compass_token');
}
function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function handleResponse(res) {
  if (res.ok) return res.json();

  if (res.status === 401) {
    clearToken();
    const err = new Error('Session expired. Please log in again.');
    err.code = 401;
    throw err;
  }

  let message = 'Something went wrong';
  try {
    const body = await res.json();
    message = body.error || body.message || message;
  } catch (_) {}

  const err = new Error(message);
  err.code = res.status;
  throw err;
}

async function safeFetch(url, options) {
  try {
    return await fetch(url, options);
  } catch (e) {
    const err = new Error('Network error. Please check your connection.');
    err.code = 0;
    throw err;
  }
}

export async function registerUser(handle) {
  const res = await safeFetch(`${BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handle })
  });
  return handleResponse(res);
}
export async function computeProfile(handle) {
  const res = await safeFetch(`${BASE}/profile/${handle}/compute`, {
    method: 'POST',
    headers: authHeaders()
  });
  return handleResponse(res);
}
export async function signup(handle, email, password) {
  const res = await safeFetch(`${BASE.replace('/api', '')}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handle, email, password })
  });
  return handleResponse(res);
}
export async function login(email, password) {
  const res = await safeFetch(`${BASE.replace('/api', '')}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return handleResponse(res);
}
export async function getMe() {
  const res = await safeFetch(`${BASE.replace('/api', '')}/auth/me`, {
    headers: authHeaders()
  });
  return handleResponse(res);
}
export function saveToken(token) {
  localStorage.setItem('cp_compass_token', token);
}

export function clearToken() {
  localStorage.removeItem('cp_compass_token');
}

export async function getProfile(handle) {
  const res = await safeFetch(`${BASE}/profile/${handle}`);
  return handleResponse(res);
}
export async function getRecommendations(handle) {
  const res = await safeFetch(`${BASE}/recommendations/${handle}`, {
    headers: authHeaders()
  });
  return handleResponse(res);
}
export async function getRadar(handle) {
  const res = await safeFetch(`${BASE}/radar/${handle}`);
  return handleResponse(res);
}

export function getAuthBaseUrl() {
  return BASE.replace('/api', '');
}

export async function linkCfHandle(handle) {
  const res = await safeFetch(`${BASE.replace('/api', '')}/auth/link-handle`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ handle })
  });
  return handleResponse(res);
}
