let currentUser = null;

const TYPE_LABEL = { sick: 'ลาป่วย', personal: 'ลากิจ', activity: 'ลากิจกรรม' };
const STATUS = {
  pending: { t: 'รออนุมัติ', c: 'status-pending' },
  approved: { t: 'อนุมัติแล้ว', c: 'status-approved' },
  rejected: { t: 'ไม่อนุมัติ', c: 'status-rejected' },
};

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
  const s = STATUS[r.status] || { t: r.status, c: '' };
  const range = r.start_date === r.end_date ? r.start_date : (r.start_date + ' ถึง ' + r.end_date);
  return `<div class="card req-card mb-3"><div class="card-body">
    <div class="d-flex justify-content-between align-items-start gap-2">
      <div>
        <h5 class="mb-1">${TYPE_LABEL[r.leave_type] || escapeHtml(r.leave_type)}</h5>
        <div class="muted small mb-2">📅 ${escapeHtml(range)}</div>
      </div>
      <span class="status-badge ${s.c}">${s.t}</span>
    </div>
    <p class="mb-1">${escapeHtml(r.reason)}</p>
    <div class="muted small">ยื่นเมื่อ ${escapeHtml(r.created_at)}</div>
  </div></div>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
