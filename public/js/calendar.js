let me = null;
let all = [];
let curY, curM;

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

(async () => {
  me = await requireAuth(['admin', ...APPROVER_ROLES_CLIENT]);
  if (!me) return;
  renderNav(me, 'calendar');
  load();
})();

async function load() {
  try {
    const { requests } = await apiFetch('/api/requests');
    all = requests;
    const now = new Date();
    curY = now.getFullYear();
    curM = now.getMonth();
    // ถ้ามีคำขอ ให้เริ่มที่เดือนของคำขอล่าสุด (จะได้เห็นข้อมูลทันที)
    if (all.length) {
      const latest = all.map((r) => r.start_date).sort().slice(-1)[0];
      const d = new Date(latest + 'T00:00:00');
      if (!isNaN(d.getTime())) { curY = d.getFullYear(); curM = d.getMonth(); }
    }
    render();
  } catch (e) {
    document.getElementById('cal').innerHTML = '<div class="alert alert-danger">' + escapeHtml(e.message) + '</div>';
  }
}

const pad = (n) => String(n).padStart(2, '0');

function render() {
  document.getElementById('calTitle').textContent = THAI_MONTHS[curM] + ' ' + curY;
  const startDow = new Date(curY, curM, 1).getDay();
  const days = new Date(curY, curM + 1, 0).getDate();
  const t = new Date();
  const todayStr = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;

  let cells = DOW.map((d) => `<div class="cal-dow">${d}</div>`).join('');
  for (let i = 0; i < startDow; i++) cells += '<div class="cal-cell empty"></div>';

  for (let day = 1; day <= days; day++) {
    const ds = `${curY}-${pad(curM + 1)}-${pad(day)}`;
    const items = all.filter((r) => r.start_date <= ds && ds <= r.end_date);
    const chips = items.slice(0, 3).map((r) => {
      const who = r.student_name || 'ฉัน';
      const tip = who + ' · ' + typeLabel(r.leave_type) + ' · ' + statusInfo(r.status).t;
      return `<span class="cal-chip status-${r.status}" title="${escapeHtml(tip)}">${escapeHtml(who)}</span>`;
    }).join('');
    const more = items.length > 3 ? `<span class="muted" style="font-size:11px">+${items.length - 3}</span>` : '';
    cells += `<div class="cal-cell ${ds === todayStr ? 'today' : ''}"><div class="cal-day">${day}</div>${chips}${more}</div>`;
  }
  document.getElementById('cal').innerHTML = `<div class="cal-grid">${cells}</div>`;
}

function move(delta) {
  curM += delta;
  if (curM < 0) { curM = 11; curY--; } else if (curM > 11) { curM = 0; curY++; }
  render();
}
