let me = null;

(async () => {
  me = await requireAuth(['admin', ...APPROVER_ROLES_CLIENT]);
  if (!me) return;
  renderNav(me, 'stats');
  load();
})();

const PALETTE = ['#4f46e5', '#0ea5e9', '#0d9488', '#f59e0b', '#be123c', '#7c3aed', '#16a34a', '#64748b'];

async function load() {
  try {
    const s = await apiFetch('/api/stats');
    renderCards(s);
    renderTop(s);
    // doughnut: ตามประเภท
    chart('typeChart', 'doughnut', {
      labels: ['ลาป่วย', 'ลากิจ', 'ลากิจกรรม'],
      datasets: [{ data: [s.byType.sick, s.byType.personal, s.byType.activity], backgroundColor: PALETTE.slice(0, 3) }],
    }, { plugins: { legend: { position: 'bottom' } } });
    // bar: ตามเดือน
    chart('monthChart', 'bar', {
      labels: s.byMonth.map((m) => m.month),
      datasets: [{ label: 'คำขอ', data: s.byMonth.map((m) => m.count), backgroundColor: '#4f46e5' }],
    }, { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } });
    // bar: ตามระดับชั้น
    chart('gradeChart', 'bar', {
      labels: s.byGrade.map((g) => g.grade),
      datasets: [{ label: 'คำขอ', data: s.byGrade.map((g) => g.count), backgroundColor: '#0d9488' }],
    }, { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } });
  } catch (e) {
    document.getElementById('err').innerHTML = '<div class="alert alert-danger mt-3">' + escapeHtml(e.message) + '</div>';
  }
}

function card(label, value, cls) {
  return `<div class="col-6 col-md-3"><div class="card text-center"><div class="card-body py-3">
    <div class="fs-3 fw-bold ${cls || ''}">${value}</div><div class="muted small">${label}</div>
  </div></div></div>`;
}

function renderCards(s) {
  document.getElementById('cards').innerHTML =
    card('คำขอทั้งหมด', s.total, '') +
    card('รอพิจารณา', s.byStatus.pending, 'text-warning') +
    card('อนุมัติแล้ว', s.byStatus.approved, 'text-success') +
    card('ไม่อนุมัติ', s.byStatus.rejected, 'text-danger');
}

function renderTop(s) {
  const el = document.getElementById('topStudents');
  if (!s.topStudents.length) { el.innerHTML = '<div class="muted">— ยังไม่มีข้อมูล —</div>'; return; }
  el.innerHTML = s.topStudents.map((t, i) => `
    <div class="d-flex justify-content-between border-bottom py-1">
      <span>${i + 1}. ${escapeHtml(t.name || '-')} ${t.student_id ? '<span class="muted">(' + escapeHtml(t.student_id) + ')</span>' : ''}</span>
      <span class="fw-semibold">${t.count} ครั้ง</span>
    </div>`).join('');
}

function chart(id, type, data, options) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  // eslint-disable-next-line no-undef
  new Chart(ctx, { type, data, options: { responsive: true, maintainAspectRatio: false, ...options } });
}
