let me = null;
let all = [];

(async () => {
  me = await requireAuth(APPROVER_ROLES_CLIENT);
  if (!me) return;
  renderNav(me, 'queue');
  load();
})();

async function load() {
  try {
    const { requests } = await apiFetch('/api/requests');
    all = requests;
    render('queue');
  } catch (e) {
    document.getElementById('list').innerHTML = '<div class="alert alert-danger">' + escapeHtml(e.message) + '</div>';
  }
}

function render(filter) {
  document.querySelectorAll('[data-filter]').forEach((b) => b.classList.toggle('active', b.dataset.filter === filter));
  const items = filter === 'queue' ? all.filter((r) => r.in_queue === 1) : all;
  const listEl = document.getElementById('list');
  if (!items.length) {
    listEl.innerHTML = '<div class="card"><div class="card-body text-center py-5 muted">ไม่มีรายการ</div></div>';
    return;
  }
  listEl.innerHTML = items.map(row).join('');
}

function row(r) {
  const s = statusInfo(r.status);
  const waiting = r.status === 'pending' ? `<span class="muted">· รอ${levelLabel(r.current_level)}</span>` : '';
  return `<a class="card req-card mb-2 text-decoration-none text-reset" href="/approver/detail.html?id=${r.id}">
    <div class="card-body d-flex justify-content-between align-items-center gap-2">
      <div>
        <div class="fw-semibold">${escapeHtml(r.student_name)} <span class="muted small">${escapeHtml(r.class_room || '')}</span></div>
        <div class="small">${typeLabel(r.leave_type)} · 📅 ${escapeHtml(dateRange(r.start_date, r.end_date))} ${waiting}</div>
      </div>
      <span class="status-badge ${s.c}">${s.t}</span>
    </div>
  </a>`;
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-filter]');
  if (b) render(b.dataset.filter);
});
