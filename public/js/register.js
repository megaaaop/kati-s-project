const form = document.getElementById('registerForm');
const errBox = document.getElementById('error');
const roleSel = document.getElementById('role');
const studentFields = document.getElementById('studentFields');

// แสดงช่องรหัสนักเรียน/ห้อง เฉพาะตอนเลือกบทบาทเป็นนักเรียน
function toggleStudentFields() {
  studentFields.style.display = roleSel.value === 'student' ? '' : 'none';
}
roleSel.addEventListener('change', toggleStudentFields);
toggleStudentFields();

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
