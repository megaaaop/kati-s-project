// helper เรียก API + จัดการ token (โหลดก่อนสคริปต์อื่นทุกหน้า)
const TOKEN_KEY = 'absence_token';

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const res = await fetch(path, { ...options, headers });

  let data = null;
  try { data = await res.json(); } catch (e) { /* ไม่มี body */ }

  // ถ้ามี token อยู่แล้วแต่โดน 401 = session หมดอายุ → เด้งไปล็อกอิน
  if (res.status === 401 && token) {
    clearToken();
    if (!location.pathname.endsWith('/login.html')) location.href = '/login.html';
  }

  if (!res.ok) {
    throw new Error((data && data.error) || ('เกิดข้อผิดพลาด (' + res.status + ')'));
  }
  return data;
}
