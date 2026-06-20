let currentUser = null;

(async () => {
  currentUser = await requireAuth(['student']);
  if (currentUser) initPage();
})();

function initPage() {
  renderNav(currentUser, 'dormnew');

  const form = document.getElementById('requestForm');
  const errBox = document.getElementById('error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.classList.add('d-none');

    const payload = {
      leave_type: 'dorm_stay',
      start_date: form.start_date.value,
      end_date: form.end_date.value,
      reason: form.reason.value.trim(),
    };

    if (!payload.start_date || !payload.end_date || !payload.reason) {
      return showErr('กรอกข้อมูลให้ครบทุกช่อง');
    }
    if (payload.start_date > payload.end_date) {
      return showErr('วันที่เริ่มต้องไม่เกินวันที่สิ้นสุด');
    }

    try {
      const { request } = await apiFetch('/api/requests', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // ถ้าเลือกไฟล์แนบ → อัปโหลดต่อ
      const fileInput = form.evidence;
      if (fileInput && fileInput.files && fileInput.files[0]) {
        const fd = new FormData();
        fd.append('file', fileInput.files[0]);
        try {
          await apiUpload('/api/requests/' + request.id + '/attachments', fd);
        } catch (upErr) {
          alert('สร้างคำขอแล้ว แต่แนบไฟล์ไม่สำเร็จ: ' + upErr.message +
            '\nคุณสามารถแนบไฟล์อีกครั้งในหน้ารายละเอียดคำขอ');
          location.href = '/student/request-detail.html?id=' + request.id;
          return;
        }
      }

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
