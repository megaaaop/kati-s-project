let currentUser = null;
let reqId = null;

(async () => {
  currentUser = await requireAuth(['student']);
  if (!currentUser) return;
  document.getElementById('userName').textContent = currentUser.full_name;
  reqId = new URLSearchParams(location.search).get('id');
  if (!reqId) {
    document.getElementById('content').innerHTML = '<div class="alert alert-danger">ไม่พบรหัสคำขอ</div>';
    return;
  }
  load();
})();

async function load() {
  try {
    const { request, attachments } = await apiFetch('/api/requests/' + reqId);
    render(request, attachments);
  } catch (err) {
    document.getElementById('content').innerHTML = '<div class="alert alert-danger">' + escapeHtml(err.message) + '</div>';
  }
}

function render(r, atts) {
  const s = statusInfo(r.status);
  const attHtml = atts.length
    ? atts.map((a) => `<li><a href="#" onclick="openAttachment(${a.id});return false;">📎 ${escapeHtml(a.file_name)}</a></li>`).join('')
    : '<li class="muted">— ยังไม่มีไฟล์แนบ —</li>';
  const noteShown = r.teacher_note
    ? `<div class="mt-3"><b>หมายเหตุจากครู:</b> ${escapeHtml(r.teacher_note)}</div>` : '';
  const reviewInfo = r.reviewed_at
    ? `<div class="muted small mt-1">พิจารณาโดย ${escapeHtml(r.reviewer_name)} เมื่อ ${escapeHtml(r.reviewed_at)}</div>` : '';
  const addPanel = r.status === 'pending' ? `
    <hr>
    <div id="upErr" class="alert alert-danger d-none"></div>
    <label class="form-label">แนบไฟล์เพิ่ม <span class="muted small">(JPG/PNG/PDF ไม่เกิน 5MB)</span></label>
    <div class="input-group">
      <input type="file" id="file" class="form-control" accept="image/jpeg,image/png,application/pdf">
      <button class="btn btn-brand" onclick="addFile()">อัปโหลด</button>
    </div>` : '';

  document.getElementById('content').innerHTML = `
    <div class="card"><div class="card-body p-4">
      <div class="d-flex justify-content-between align-items-start gap-2">
        <h4 class="mb-0">${typeLabel(r.leave_type)}</h4>
        <span class="status-badge ${s.c}">${s.t}</span>
      </div>
      <dl class="row mt-3 mb-0">
        <dt class="col-sm-3">ช่วงวันที่</dt><dd class="col-sm-9">${escapeHtml(dateRange(r.start_date, r.end_date))}</dd>
        <dt class="col-sm-3">เหตุผล</dt><dd class="col-sm-9">${escapeHtml(r.reason)}</dd>
        <dt class="col-sm-3">หลักฐาน</dt><dd class="col-sm-9"><ul class="mb-0 ps-3">${attHtml}</ul></dd>
      </dl>
      ${noteShown}${reviewInfo}
      ${addPanel}
    </div></div>
    <a href="/student/my-requests.html" class="btn btn-outline-secondary mt-3">← กลับไปรายการ</a>`;
}

async function addFile() {
  const fileEl = document.getElementById('file');
  const errEl = document.getElementById('upErr');
  errEl.classList.add('d-none');
  if (!fileEl.files || !fileEl.files[0]) {
    errEl.textContent = 'เลือกไฟล์ก่อน';
    errEl.classList.remove('d-none');
    return;
  }
  const fd = new FormData();
  fd.append('file', fileEl.files[0]);
  try {
    await apiUpload('/api/requests/' + reqId + '/attachments', fd);
    load();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('d-none');
  }
}
