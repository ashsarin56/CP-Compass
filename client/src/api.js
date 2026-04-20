const BASE = 'http://localhost:3000/api';

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
export async function registerUser(handle) {
  const res = await fetch(`${BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handle })
  });
  return res.json();
}
export async function computeProfile(handle) {
  const res = await fetch(`${BASE}/profile/${handle}/compute`, {
    method: 'POST',
    headers: authHeaders()
  });
  return res.json();
}
export async function signup(handle, email, password) {
  const res = await fetch(`${BASE.replace('/api', '')}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handle, email, password })
  });
  return res.json();
}
export async function login(email, password) {
  const res = await fetch(`${BASE.replace('/api', '')}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return res.json();
}
export async function getMe() {
  const res = await fetch(`${BASE.replace('/api', '')}/auth/me`, {
    headers: authHeaders()
  });
  return res.json();
}
export function saveToken(token) {
  localStorage.setItem('cp_compass_token', token);
}

export function clearToken() {
  localStorage.removeItem('cp_compass_token');
}

export async function getProfile(handle) {
  const res = await fetch(`${BASE}/profile/${handle}`);
  return res.json();
}
export async function getRecommendations(handle) {
  const res = await fetch(`${BASE}/recommendations/${handle}`, {
    headers: authHeaders()
  });
  return res.json();
}
export async function getRadar(handle) {
  const res = await fetch(`${BASE}/radar/${handle}`);
  return res.json();
}
