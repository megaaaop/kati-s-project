let currentUser = null;
let reqId = null;

(async () => {
  currentUser = await requireAuth(['teacher']);
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
    : '<li class="muted">— ไม่มีไฟล์แนบ —</li>';
  const noteShown = r.teacher_note
    ? `<div class="mt-3"><b>หมายเหตุ:</b> ${escapeHtml(r.teacher_note)}</div>` : '';
  const reviewInfo = r.reviewed_at
    ? `<div class="muted small mt-1">พิจารณาโดย ${escapeHtml(r.reviewer_name)} เมื่อ ${escapeHtml(r.reviewed_at)}</div>` : '';

  const actionPanel = r.status === 'pending' ? `
    <hr>
    <div id="actionError" class="alert alert-danger d-none"></div>
    <label class="form-label">หมายเหตุถึงนักเรียน <span class="muted small">(บังคับเมื่อไม่อนุมัติ)</span></label>
    <textarea id="note" class="form-control mb-3" rows="2" placeholder="ความเห็น/เหตุผล"></textarea>
    <div class="d-flex gap-2">
      <button class="btn btn-success" onclick="review('approve')">✅ อนุมัติ</button>
      <button class="btn btn-danger" onclick="review('reject')">❌ ไม่อนุมัติ</button>
    </div>` : '';

  document.getElementById('content').innerHTML = `
    <div class="card"><div class="card-body p-4">
      <div class="d-flex justify-content-between align-items-start gap-2">
        <h4 class="mb-0">${typeLabel(r.leave_type)}</h4>
        <span class="status-badge ${s.c}">${s.t}</span>
      </div>
      <div class="muted mb-3">${escapeHtml(r.student_name)}${r.student_code ? ' · ' + escapeHtml(r.student_code) : ''}${r.class_room ? ' · ' + escapeHtml(r.class_room) : ''}</div>
      <dl class="row mb-0">
        <dt class="col-sm-3">ช่วงวันที่</dt><dd class="col-sm-9">${escapeHtml(dateRange(r.start_date, r.end_date))}</dd>
        <dt class="col-sm-3">เหตุผล</dt><dd class="col-sm-9">${escapeHtml(r.reason)}</dd>
        <dt class="col-sm-3">หลักฐาน</dt><dd class="col-sm-9"><ul class="mb-0 ps-3">${attHtml}</ul></dd>
      </dl>
      ${noteShown}${reviewInfo}
      ${actionPanel}
    </div></div>
    <a href="/teacher/requests.html" class="btn btn-outline-secondary mt-3">← กลับไปรายการ</a>`;
}

async function review(action) {
  const noteEl = document.getElementById('note');
  const errEl = document.getElementById('actionError');
  errEl.classList.add('d-none');
  const teacher_note = noteEl ? noteEl.value.trim() : '';
  if (action === 'reject' && !teacher_note) {
    errEl.textContent = 'กรุณาระบุเหตุผลที่ไม่อนุมัติ';
    errEl.classList.remove('d-none');
    return;
  }
  try {
    await apiFetch('/api/requests/' + reqId + '/' + action, {
      method: 'PUT',
      body: JSON.stringify({ teacher_note }),
    });
    load(); // โหลดใหม่ให้เห็นสถานะที่อัปเดต
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('d-none');
  }
}
