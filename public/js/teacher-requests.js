let currentUser = null;
let allRequests = [];

(async () => {
  currentUser = await requireAuth(['teacher']);
  if (currentUser) load();
})();

async function load() {
  document.getElementById('userName').textContent = currentUser.full_name;
  try {
    const { requests } = await apiFetch('/api/requests');
    allRequests = requests;
    render('all');
  } catch (err) {
    document.getElementById('list').innerHTML = '<div class="alert alert-danger">' + escapeHtml(err.message) + '</div>';
  }
}

function render(filter) {
  document.querySelectorAll('[data-filter]').forEach((b) =>
    b.classList.toggle('active', b.dataset.filter === filter));

  const items = filter === 'all' ? allRequests : allRequests.filter((r) => r.status === filter);
  const listEl = document.getElementById('list');
  if (!items.length) {
    listEl.innerHTML = '<div class="card"><div class="card-body text-center py-5 muted">ไม่มีรายการ</div></div>';
    return;
  }
  listEl.innerHTML = items.map(renderRow).join('');
}

function renderRow(r) {
  const s = statusInfo(r.status);
  return `<a class="card req-card mb-2 text-decoration-none text-reset" href="/teacher/request-detail.html?id=${r.id}">
    <div class="card-body d-flex justify-content-between align-items-center gap-2">
      <div>
        <div class="fw-semibold">${escapeHtml(r.student_name)} <span class="muted small">${escapeHtml(r.class_room)}</span></div>
        <div class="small">${typeLabel(r.leave_type)} · 📅 ${escapeHtml(dateRange(r.start_date, r.end_date))}</div>
      </div>
      <span class="status-badge ${s.c}">${s.t}</span>
    </div>
  </a>`;
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-filter]');
  if (btn) render(btn.dataset.filter);
});
