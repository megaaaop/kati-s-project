// แถบนำทางส่วนบน + กระดิ่งแจ้งเตือน (ใช้ร่วมทุกหน้า) — ต้องโหลด api.js + display.js + auth.js ก่อน
let CURRENT_ROLE = null;

function navLinks(role) {
  if (role === 'student') return [
    { key: 'home', label: 'หน้าหลัก', href: '/student/dashboard.html' },
    { key: 'new', label: 'ยื่นใบลา', href: '/student/request-new.html' },
    { key: 'dormnew', label: 'ยื่นใบอยู่หอ', href: '/student/dorm-stay-new.html' },
    { key: 'mine', label: 'คำขอของฉัน', href: '/student/my-requests.html' },
  ];
  if (APPROVER_ROLES_CLIENT.includes(role)) return [
    { key: 'queue', label: 'คิวอนุมัติ', href: '/approver/queue.html' },
    { key: 'stats', label: 'สถิติ', href: '/stats.html' },
    { key: 'calendar', label: 'ปฏิทิน', href: '/calendar.html' },
  ];
  if (role === 'parent') return [{ key: 'children', label: 'การลาของบุตรหลาน', href: '/parent/children.html' }];
  if (role === 'admin') return [
    { key: 'users', label: 'จัดการผู้ใช้', href: '/admin/users.html' },
    { key: 'stats', label: 'สถิติ', href: '/stats.html' },
    { key: 'calendar', label: 'ปฏิทิน', href: '/calendar.html' },
  ];
  return [];
}
function homeFor(role) { const l = navLinks(role); return l.length ? l[0].href : '/login.html'; }
function detailHrefFor(role, id) {
  if (role === 'student') return '/student/request-detail.html?id=' + id;
  if (APPROVER_ROLES_CLIENT.includes(role)) return '/approver/detail.html?id=' + id;
  if (role === 'parent') return '/parent/detail.html?id=' + id;
  return '#';
}

function renderNav(user, active) {
  CURRENT_ROLE = user.role;
  const links = navLinks(user.role)
    .map((l) => `<li class="nav-item"><a class="nav-link ${l.key === active ? 'active' : ''}" href="${l.href}">${l.label}</a></li>`)
    .join('');
  document.getElementById('appnav').innerHTML = `
  <nav class="navbar navbar-expand-lg brand-gradient navbar-dark">
    <div class="container">
      <a class="navbar-brand" href="${homeFor(user.role)}">📋 ระบบยื่นใบลา</a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nv"><span class="navbar-toggler-icon"></span></button>
      <div class="collapse navbar-collapse" id="nv">
        <ul class="navbar-nav me-auto">${links}</ul>
        <div class="d-flex align-items-center gap-2 py-2">
          <div class="dropdown" id="bell"></div>
          <span class="navbar-text text-white small">${roleLabel(user.role)} · ${escapeHtml(user.full_name)}</span>
          <button class="btn btn-light btn-sm" onclick="logout()">ออก</button>
        </div>
      </div>
    </div>
  </nav>`;
  refreshBell();
}

async function refreshBell() {
  const el = document.getElementById('bell');
  if (!el) return;
  try {
    const { notifications, unread } = await apiFetch('/api/notifications');
    const badge = unread > 0
      ? `<span class="badge rounded-pill bg-danger" style="position:absolute;top:-3px;right:-3px;font-size:10px">${unread}</span>` : '';
    const items = notifications.length
      ? notifications.map((n) => `<li><a class="dropdown-item ${n.is_read ? '' : 'fw-semibold'}" style="white-space:normal" href="#" onclick="openNoti(${n.id}, ${n.request_id == null ? 'null' : n.request_id});return false;">${escapeHtml(n.message)}<div class="muted" style="font-size:11px">${escapeHtml(n.created_at)}</div></a></li>`).join('')
      : '<li><span class="dropdown-item-text muted">ไม่มีการแจ้งเตือน</span></li>';
    el.innerHTML = `
      <button class="btn btn-light btn-sm position-relative" data-bs-toggle="dropdown" aria-expanded="false">🔔${badge}</button>
      <ul class="dropdown-menu dropdown-menu-end shadow" style="max-height:400px;overflow:auto;min-width:300px">
        <li><div class="d-flex justify-content-between align-items-center px-3 py-1"><b>การแจ้งเตือน</b>${unread > 0 ? '<a href="#" style="font-size:12px" onclick="markAllNoti();return false;">อ่านทั้งหมด</a>' : ''}</div></li>
        <li><hr class="dropdown-divider my-1"></li>
        ${items}
      </ul>`;
  } catch (e) { /* เงียบไว้ */ }
}

async function openNoti(id, requestId) {
  try { await apiFetch('/api/notifications/' + id + '/read', { method: 'PUT' }); } catch (e) {}
  if (requestId) location.href = detailHrefFor(CURRENT_ROLE, requestId);
  else refreshBell();
}
async function markAllNoti() {
  try { await apiFetch('/api/notifications/read-all', { method: 'PUT' }); } catch (e) {}
  refreshBell();
}
