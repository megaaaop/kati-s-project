let currentUser = null;

(async () => {
  currentUser = await requireAuth(['student']);
  if (currentUser) initPage();
})();

function initPage() {
  document.getElementById('userName').textContent = currentUser.full_name;

  const form = document.getElementById('requestForm');
  const errBox = document.getElementById('error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.classList.add('d-none');

    const payload = {
      leave_type: form.leave_type.value,
      start_date: form.start_date.value,
      end_date: form.end_date.value,
      reason: form.reason.value.trim(),
    };

    if (!payload.leave_type || !payload.start_date || !payload.end_date || !payload.reason) {
      return showErr('กรอกข้อมูลให้ครบทุกช่อง');
    }
    if (payload.start_date > payload.end_date) {
      return showErr('วันที่เริ่มต้องไม่เกินวันที่สิ้นสุด');
    }

    try {
      await apiFetch('/api/requests', { method: 'POST', body: JSON.stringify(payload) });
      location.href = '/student/my-requests.html?created=1';
    } catch (err) {
      showErr(err.message);
    }
  });

  function showErr(msg) {
    errBox.textContent = msg;
    errBox.classList.remove('d-none');
  }
}
