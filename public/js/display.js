// ป้ายข้อความ/สถานะ + ตัวช่วยแสดงผลที่ใช้ร่วมหลายหน้า
const TYPE_LABEL = { sick: 'ลาป่วย', personal: 'ลากิจ', activity: 'ลากิจกรรม' };
const STATUS_INFO = {
  pending: { t: 'รอพิจารณา', c: 'status-pending' },
  approved: { t: 'อนุมัติแล้ว', c: 'status-approved' },
  rejected: { t: 'ไม่อนุมัติ', c: 'status-rejected' },
};
const ROLE_LABEL = {
  student: 'นักเรียน', parent: 'ผู้ปกครอง', homeroom: 'ครูประจำชั้น',
  gradehead: 'ครูหัวหน้าระดับ', dormhead: 'หัวหน้าฝ่ายหอพัก', deputy: 'รองผอ', principal: 'ผอ', admin: 'แอดมิน',
};
// สายอนุมัติ (ให้ตรงกับ src/config/approval.js)
const CHAIN = [
  { level: 1, role: 'homeroom', label: 'ครูประจำชั้น' },
  { level: 2, role: 'gradehead', label: 'ครูหัวหน้าระดับ' },
  { level: 3, role: 'dormhead', label: 'หัวหน้าฝ่ายหอพัก' },
  { level: 4, role: 'deputy', label: 'รองผอ' },
  { level: 5, role: 'principal', label: 'ผอ' },
];
const APPROVER_ROLES_CLIENT = ['homeroom', 'gradehead', 'dormhead', 'deputy', 'principal'];

function typeLabel(t) { return TYPE_LABEL[t] || t; }
function statusInfo(s) { return STATUS_INFO[s] || { t: s, c: '' }; }
function roleLabel(r) { return ROLE_LABEL[r] || r; }
function levelLabel(lv) { const c = CHAIN.find((x) => x.level === lv); return c ? c.label : 'ขั้น ' + lv; }
function roleToLevel(role) { const c = CHAIN.find((x) => x.role === role); return c ? c.level : null; }
function dateRange(a, b) { return a === b ? a : (a + ' ถึง ' + b); }

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ไทม์ไลน์สายอนุมัติ 4 ขั้น
function renderChainTimeline(request, steps) {
  const byLevel = {};
  (steps || []).forEach((s) => { byLevel[s.level] = s; });
  const rows = CHAIN.map((c) => {
    const st = byLevel[c.level];
    let icon, cls, detail;
    if (st) {
      if (st.decision === 'approved') { icon = '✓'; cls = 'ok'; detail = 'อนุมัติโดย ' + escapeHtml(st.approver_name); }
      else { icon = '✕'; cls = 'no'; detail = 'ไม่อนุมัติโดย ' + escapeHtml(st.approver_name) + (st.note ? ' — ' + escapeHtml(st.note) : ''); }
    } else if (request.status === 'pending' && c.level === request.current_level) {
      icon = '⏳'; cls = 'now'; detail = 'กำลังพิจารณา';
    } else if (request.status === 'rejected') {
      icon = '–'; cls = 'skip'; detail = '—';
    } else {
      icon = '○'; cls = 'wait'; detail = 'รอคิว';
    }
    return `<li class="tl tl-${cls}"><span class="tl-ic">${icon}</span><div><div class="tl-h">${c.label}</div><div class="tl-d muted">${detail}</div></div></li>`;
  }).join('');
  return `<ul class="timeline">${rows}</ul>`;
}

// การ์ดรายละเอียดคำขอ (ใช้ร่วม: นักเรียน/ผู้อนุมัติ/ผู้ปกครอง)
function renderRequestDetail(data, opts = {}) {
  const r = data.request;
  const atts = data.attachments || [];
  const s = statusInfo(r.status);
  const attHtml = atts.length
    ? atts.map((a) => `<li><a href="#" onclick="openAttachment(${a.id});return false;">📎 ${escapeHtml(a.file_name)}</a></li>`).join('')
    : '<li class="muted">— ไม่มีไฟล์แนบ —</li>';
  const studentLine = opts.showStudent
    ? `<div class="muted mb-2">${escapeHtml(r.student_name)}${r.student_code ? ' · ' + escapeHtml(r.student_code) : ''}${r.class_room ? ' · ' + escapeHtml(r.class_room) : ''}</div>`
    : '';
  return `<div class="card"><div class="card-body p-4">
    <div class="d-flex justify-content-between align-items-start gap-2">
      <h4 class="mb-0">${typeLabel(r.leave_type)}</h4>
      <span class="status-badge ${s.c}">${s.t}</span>
    </div>
    ${studentLine}
    <dl class="row mt-2 mb-0">
      <dt class="col-sm-3">ช่วงวันที่</dt><dd class="col-sm-9">${escapeHtml(dateRange(r.start_date, r.end_date))}</dd>
      <dt class="col-sm-3">เหตุผล</dt><dd class="col-sm-9">${escapeHtml(r.reason)}</dd>
      <dt class="col-sm-3">หลักฐาน</dt><dd class="col-sm-9"><ul class="mb-0 ps-3">${attHtml}</ul></dd>
    </dl>
    <hr><h6 class="mb-2">สถานะการอนุมัติ (${CHAIN.length} ขั้น)</h6>
    ${renderChainTimeline(r, data.steps)}
  </div></div>`;
}
