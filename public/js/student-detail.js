let me = null;
let reqId = null;

(async () => {
  me = await requireAuth(['student']);
  if (!me) return;
  renderNav(me, 'mine');
  reqId = new URLSearchParams(location.search).get('id');
  if (!reqId) { fail('ไม่พบรหัสคำขอ'); return; }
  load();
})();

function fail(m) { document.getElementById('content').innerHTML = '<div class="alert alert-danger">' + escapeHtml(m) + '</div>'; }

async function load() {
  try {
    const data = await apiFetch('/api/requests/' + reqId);
    const r = data.request;
    // แนบไฟล์เพิ่มได้เฉพาะตอนยังพิจารณาอยู่
    const addPanel = r.status === 'pending' ? `
      <div class="card mt-3"><div class="card-body">
        <div id="upErr" class="alert alert-danger d-none"></div>
        <label class="form-label">แนบไฟล์เพิ่ม <span class="muted small">(JPG/PNG/PDF ≤ 5MB)</span></label>
        <div class="input-group">
          <input type="file" id="file" class="form-control" accept="image/jpeg,image/png,application/pdf">
          <button class="btn btn-brand" onclick="addFile()">อัปโหลด</button>
        </div>
      </div></div>` : '';
    document.getElementById('content').innerHTML =
      renderRequestDetail(data, { showStudent: false }) + addPanel +
      '<a href="/student/my-requests.html" class="btn btn-outline-secondary mt-3">← กลับไปรายการ</a>';
  } catch (e) { fail(e.message); }
}

async function addFile() {
  const fileEl = document.getElementById('file');
  const err = document.getElementById('upErr');
  err.classList.add('d-none');
  if (!fileEl.files || !fileEl.files[0]) {
    err.textContent = 'เลือกไฟล์ก่อน'; err.classList.remove('d-none'); return;
  }
  const fd = new FormData();
  fd.append('file', fileEl.files[0]);
  try {
    await apiUpload('/api/requests/' + reqId + '/attachments', fd);
    load();
  } catch (e) {
    err.textContent = e.message; err.classList.remove('d-none');
  }
}
