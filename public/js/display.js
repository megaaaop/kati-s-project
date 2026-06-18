// ป้ายข้อความ/สถานะ และตัวช่วยแสดงผลที่ใช้ร่วมหลายหน้า
const TYPE_LABEL = { sick: 'ลาป่วย', personal: 'ลากิจ', activity: 'ลากิจกรรม' };
const STATUS_INFO = {
  pending: { t: 'รออนุมัติ', c: 'status-pending' },
  approved: { t: 'อนุมัติแล้ว', c: 'status-approved' },
  rejected: { t: 'ไม่อนุมัติ', c: 'status-rejected' },
};

function typeLabel(t) { return TYPE_LABEL[t] || t; }
function statusInfo(s) { return STATUS_INFO[s] || { t: s, c: '' }; }
function dateRange(a, b) { return a === b ? a : (a + ' ถึง ' + b); }

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
