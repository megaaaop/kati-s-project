let currentUser = null;

(async () => {
  currentUser = await requireAuth(['student']);
  if (currentUser) load();
})();

async function load() {
  document.getElementById('userName').textContent = currentUser.full_name;

  if (new URLSearchParams(location.search).get('created')) {
    document.getElementById('createdAlert').classList.remove('d-none');
  }

  const listEl = document.getElementById('list');
  try {
    const { requests } = await apiFetch('/api/requests');
    if (!requests.length) {
      document.getElementById('empty').classList.remove('d-none');
      return;
    }
    listEl.innerHTML = requests.map(renderCard).join('');
  } catch (err) {
    listEl.innerHTML = '<div class="alert alert-danger">' + escapeHtml(err.message) + '</div>';
  }
}

function renderCard(r) {
  const s = statusInfo(r.status);
  const note = r.teacher_note
    ? `<div class="muted small mt-1">📝 หมายเหตุครู: ${escapeHtml(r.teacher_note)}</div>` : '';
  return `<a class="card req-card mb-3 text-decoration-none text-reset" href="/student/request-detail.html?id=${r.id}">
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-start gap-2">
        <div>
          <h5 class="mb-1">${typeLabel(r.leave_type)}</h5>
          <div class="muted small mb-1">📅 ${escapeHtml(dateRange(r.start_date, r.end_date))}</div>
        </div>
        <span class="status-badge ${s.c}">${s.t}</span>
      </div>
      <p class="mb-0">${escapeHtml(r.reason)}</p>
      ${note}
      <div class="muted small mt-1">ยื่นเมื่อ ${escapeHtml(r.created_at)}</div>
    </div>
  </a>`;
}
