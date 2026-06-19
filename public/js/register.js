const form = document.getElementById('registerForm');
const errBox = document.getElementById('error');
const roleSel = document.getElementById('role');
const studentFields = document.getElementById('studentFields');
const staffFields = document.getElementById('staffFields');
const gradeField = document.getElementById('gradeField');

const STAFF_ROLES = ['homeroom', 'gradehead', 'dormhead', 'deputy', 'principal', 'admin'];
const GRADE_ROLES = ['gradehead', 'dormhead', 'deputy', 'principal'];

function toggleRoleFields() {
  const role = roleSel.value;
  studentFields.style.display = role === 'student' ? '' : 'none';
  staffFields.style.display = STAFF_ROLES.includes(role) ? '' : 'none';
  gradeField.style.display = GRADE_ROLES.includes(role) ? '' : 'none';
}
roleSel.addEventListener('change', toggleRoleFields);
toggleRoleFields();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errBox.classList.add('d-none');

  const role = roleSel.value;
  const payload = {
    full_name: form.full_name.value.trim(),
    email: form.email.value.trim(),
    password: form.password.value,
    role,
  };
  if (role === 'student') {
    payload.student_id = form.student_id.value.trim();
    payload.class_room = form.class_room.value.trim();
  }
  if (GRADE_ROLES.includes(role)) {
    payload.grade_level = form.grade_level.value.trim();
  }
  if (STAFF_ROLES.includes(role)) {
    payload.staff_code = form.staff_code.value;
  }

  if (payload.password.length < 6) {
    errBox.textContent = 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร';
    errBox.classList.remove('d-none');
    return;
  }

  try {
    await apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) });
    const { token, user } = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: payload.email, password: payload.password }),
    });
    setToken(token);
    redirectByRole(user.role);
  } catch (err) {
    errBox.textContent = err.message;
    errBox.classList.remove('d-none');
  }
});
