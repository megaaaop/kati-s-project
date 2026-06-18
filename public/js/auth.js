// guard หน้า protected + redirect ตามบทบาท (ต้องโหลด api.js ก่อน)

// เรียกบนหน้า protected: คืน user ถ้าผ่าน, ไม่งั้นเด้งออกแล้วคืน null
async function requireAuth(allowedRoles) {
  if (!getToken()) { location.href = '/login.html'; return null; }
  try {
    const { user } = await apiFetch('/api/auth/me');
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      redirectByRole(user.role);
      return null;
    }
    return user;
  } catch (e) {
    location.href = '/login.html';
    return null;
  }
}

function redirectByRole(role) {
  if (role === 'student') location.href = '/student/dashboard.html';
  else if (role === 'teacher') location.href = '/teacher/requests.html';
  // admin / parent dashboards จะมาในเฟสถัดไป
  else location.href = '/coming-soon.html';
}

function logout() {
  apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  clearToken();
  location.href = '/login.html';
}
