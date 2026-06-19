let me = null;

(async () => {
  me = await requireAuth(['parent']);
  if (!me) return;
  renderNav(me, 'children');
  load();
})();

async function load() {
  const el = document.getElementById('list');
  try {
    const { requests } = await apiFetch('/api/requests');
    if (!requests.length) {
      el.innerHTML = '<div class="card"><div class="card-body text-center py-5 muted">ยังไม่มีการลาของบุตรหลาน</div></div>';
      return;
    }
    el.innerHTML = requests.map(card).join('');
  } catch (e) {
    el.innerHTML = '<div class="alert alert-danger">' + escapeHtml(e.message) + '</div>';
  }
}

function card(r) {
  const s = statusInfo(r.status);
  const waiting = r.status === 'pending' ? `<span class="muted small">· รอ${levelLabel(r.current_level)}</span>` : '';
  return `<a class="card req-card mb-3 text-decoration-none text-reset" href="/parent/detail.html?id=${r.id}">
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-start gap-2">
        <div>
          <h5 class="mb-1">${typeLabel(r.leave_type)}</h5>
          <div class="muted small">${escapeHtml(r.student_name)} · 📅 ${escapeHtml(dateRange(r.start_date, r.end_date))} ${waiting}</div>
        </div>
        <span class="status-badge ${s.c}">${s.t}</span>
      </div>
      <p class="mb-0 mt-1">${escapeHtml(r.reason)}</p>
    </div>
  </a>`;
}
