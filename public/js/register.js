const form = document.getElementById('registerForm');
const errBox = document.getElementById('error');
const roleSel = document.getElementById('role');
const studentFields = document.getElementById('studentFields');
const staffFields = document.getElementById('staffFields');

// แสดงช่องให้ตรงกับบทบาท: นักเรียน→รหัสนักเรียน/ห้อง, ครู/แอดมิน→รหัสลับ
function toggleRoleFields() {
  studentFields.style.display = roleSel.value === 'student' ? '' : 'none';
  staffFields.style.display = (roleSel.value === 'teacher' || roleSel.value === 'admin') ? '' : 'none';
}
roleSel.addEventListener('change', toggleRoleFields);
toggleRoleFields();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errBox.classList.add('d-none');

  const payload = {
    full_name: form.full_name.value.trim(),
    email: form.email.value.trim(),
    password: form.password.value,
    role: roleSel.value,
  };
  if (payload.role === 'student') {
    payload.student_id = form.student_id.value.trim();
    payload.class_room = form.class_room.value.trim();
  }
  if (payload.role === 'teacher' || payload.role === 'admin') {
    payload.staff_code = form.staff_code.value;
  }

  if (payload.password.length < 6) {
    errBox.textContent = 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร';
    errBox.classList.remove('d-none');
    return;
  }

  try {
    await apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) });
    // สมัครเสร็จ → ล็อกอินอัตโนมัติแล้วเข้าระบบ
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
