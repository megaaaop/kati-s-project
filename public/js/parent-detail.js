let me = null;
let reqId = null;

(async () => {
  me = await requireAuth(['parent']);
  if (!me) return;
  renderNav(me, 'children');
  reqId = new URLSearchParams(location.search).get('id');
  if (!reqId) { fail('ไม่พบรหัสคำขอ'); return; }
  load();
})();

function fail(m) { document.getElementById('content').innerHTML = '<div class="alert alert-danger">' + escapeHtml(m) + '</div>'; }

async function load() {
  try {
    const data = await apiFetch('/api/requests/' + reqId);
    document.getElementById('content').innerHTML =
      renderRequestDetail(data, { showStudent: true }) +
      '<a href="/parent/children.html" class="btn btn-outline-secondary mt-3">← กลับ</a>';
  } catch (e) { fail(e.message); }
}
