let me = null;
let reqId = null;

(async () => {
  me = await requireAuth(APPROVER_ROLES_CLIENT);
  if (!me) return;
  renderNav(me, 'queue');
  reqId = new URLSearchParams(location.search).get('id');
  if (!reqId) { fail('ไม่พบรหัสคำขอ'); return; }
  load();
})();

function fail(m) { document.getElementById('content').innerHTML = '<div class="alert alert-danger">' + escapeHtml(m) + '</div>'; }

async function load() {
  try {
    const data = await apiFetch('/api/requests/' + reqId);
    render(data);
  } catch (e) { fail(e.message); }
}

function render(data) {
  const r = data.request;
  const myTurn = r.status === 'pending' && CHAIN.find((c) => c.level === r.current_level).role === me.role;
  const panel = myTurn ? `
    <div class="card mt-3"><div class="card-body">
      <div id="decErr" class="alert alert-danger d-none"></div>
      <label class="form-label">หมายเหตุถึงนักเรียน <span class="muted small">(บังคับเมื่อไม่อนุมัติ)</span></label>
      <textarea id="note" class="form-control mb-3" rows="2" placeholder="ความเห็น/เหตุผล"></textarea>
      <div class="d-flex gap-2 flex-wrap">
        <button class="btn btn-success" onclick="decide('approved')">✅ อนุมัติ (ส่งต่อขั้นถัดไป)</button>
        <button class="btn btn-danger" onclick="decide('rejected')">❌ ไม่อนุมัติ</button>
      </div>
    </div></div>` : '';
  document.getElementById('content').innerHTML =
    renderRequestDetail(data, { showStudent: true }) + panel +
    '<a href="/approver/queue.html" class="btn btn-outline-secondary mt-3">← กลับคิว</a>';
}

async function decide(decision) {
  const noteEl = document.getElementById('note');
  const err = document.getElementById('decErr');
  err.classList.add('d-none');
  const note = noteEl ? noteEl.value.trim() : '';
  if (decision === 'rejected' && !note) {
    err.textContent = 'กรุณาระบุเหตุผลที่ไม่อนุมัติ';
    err.classList.remove('d-none');
    return;
  }
  try {
    await apiFetch('/api/requests/' + reqId + '/decide', { method: 'PUT', body: JSON.stringify({ decision, note }) });
    load();
    refreshBell();
  } catch (e) {
    err.textContent = e.message;
    err.classList.remove('d-none');
  }
}
