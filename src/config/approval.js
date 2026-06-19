// นิยามสายอนุมัติ (data-driven — แก้จำนวน/ลำดับขั้นที่นี่ที่เดียว)
const APPROVAL_CHAIN = [
  { level: 1, role: 'homeroom', label: 'ครูประจำชั้น' },
  { level: 2, role: 'gradehead', label: 'ครูหัวหน้าระดับ' },
  { level: 3, role: 'dormhead', label: 'หัวหน้าฝ่ายหอพัก' },
  { level: 4, role: 'deputy', label: 'รองผอ' },
  { level: 5, role: 'principal', label: 'ผอ' },
];

const MAX_LEVEL = APPROVAL_CHAIN.length;
const GRADE_ALL = 'ทุกระดับ'; // ผู้อนุมัติที่ดูแลทุกระดับชั้น (เช่น ผอ)
const APPROVER_ROLES = APPROVAL_CHAIN.map((s) => s.role);

function levelForRole(role) {
  const s = APPROVAL_CHAIN.find((x) => x.role === role);
  return s ? s.level : null;
}
function roleForLevel(level) {
  const s = APPROVAL_CHAIN.find((x) => x.level === level);
  return s ? s.role : null;
}
function labelForLevel(level) {
  const s = APPROVAL_CHAIN.find((x) => x.level === level);
  return s ? s.label : 'ขั้น ' + level;
}
function labelForRole(role) {
  const s = APPROVAL_CHAIN.find((x) => x.role === role);
  return s ? s.label : role;
}

module.exports = {
  APPROVAL_CHAIN, MAX_LEVEL, GRADE_ALL, APPROVER_ROLES,
  levelForRole, roleForLevel, labelForLevel, labelForRole,
};
