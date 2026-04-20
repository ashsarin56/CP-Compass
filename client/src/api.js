const BASE = 'http://localhost:3000/api';

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
    method: 'POST'
  });
  return res.json();
}

export async function getProfile(handle) {
  const res = await fetch(`${BASE}/profile/${handle}`);
  return res.json();
}

export async function getRecommendations(handle) {
  const res = await fetch(`${BASE}/recommendations/${handle}`);
  return res.json();
}
export async function getRadar(handle) {
  const res = await fetch(`${BASE}/radar/${handle}`);
  return res.json();
}