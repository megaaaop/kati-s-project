// ถ้าล็อกอินอยู่แล้วเด้งเข้าระบบเลย
if (getToken()) {
  apiFetch('/api/auth/me')
    .then(({ user }) => redirectByRole(user.role))
    .catch(() => {});
}

const form = document.getElementById('loginForm');
const errBox = document.getElementById('error');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errBox.classList.add('d-none');
  const email = form.email.value.trim();
  const password = form.password.value;
  try {
    const { token, user } = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(token);
    redirectByRole(user.role);
  } catch (err) {
    errBox.textContent = err.message;
    errBox.classList.remove('d-none');
  }
});
