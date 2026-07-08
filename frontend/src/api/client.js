const DEV_API = 'http://localhost:5001/api';
const PROD_API = 'https://keyflow-backend-w0br.onrender.com/api';
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? DEV_API : PROD_API);
export const API_BASE = API_URL.replace(/\/api\/?$/, '');

function getToken() {
  return localStorage.getItem('keyflow_token');
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // no JSON body
  }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  // auth
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => request('/auth/me'),
  updateProfile: (payload) => request('/auth/profile', { method: 'PUT', body: payload }),
  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const token = getToken();
    const res = await fetch(`${API_URL}/upload/avatar`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData
    });
    if (!res.ok) throw new Error('Failed to upload avatar');
    return res.json();
  },

  // content
  getWords: (count) => request(`/content/words?count=${count}`, { auth: false }),
  getQuote: () => request('/content/quote', { auth: false }),
  getCode: () => request('/content/code', { auth: false }),

  // tests
  submitTest: (payload) => request('/tests', { method: 'POST', body: payload }),
  getHistory: (limit = 50) => request(`/tests/history?limit=${limit}`),
  getStats: () => request('/tests/stats'),

  // leaderboard
  getLeaderboard: (mode, modeValue) =>
    request(`/leaderboard?mode=${mode}${modeValue ? `&modeValue=${modeValue}` : ''}`, { auth: false }),

  // custom texts
  uploadText: (payload) => request('/texts', { method: 'POST', body: payload }),
  getMyTexts: () => request('/texts/mine'),
  getPublicTexts: (type) => request(`/texts/public${type ? `?type=${type}` : ''}`, { auth: false }),
  deleteText: (id) => request(`/texts/${id}`, { method: 'DELETE' }),

  // achievements
  getAllAchievements: () => request('/achievements', { auth: false }),
  getMyAchievements: () => request('/achievements/mine'),
  getAchievementsProgress: () => request('/achievements/progress'),

  // daily challenge
  getDailyChallenge: () => request('/daily-challenge', { auth: false }),
  getMyDailyStatus: () => request('/daily-challenge/mine'),
  submitDailyChallenge: (payload) => request('/daily-challenge/submit', { method: 'POST', body: payload }),
  getDailyLeaderboard: () => request('/daily-challenge/leaderboard', { auth: false })
};

export { getToken };
