// บทบาทผู้ใช้ + ตัวช่วยที่ใช้ร่วมกัน
const VALID_ROLES = ['student', 'parent', 'homeroom', 'gradehead', 'dormhead', 'deputy', 'principal', 'admin'];
const STAFF_ROLES = ['homeroom', 'gradehead', 'dormhead', 'deputy', 'principal', 'admin']; // ต้องใช้รหัสลับตอนสมัครเอง
const PUBLIC_ROLES = ['student', 'parent'];
// บทบาทผู้อนุมัติที่จับคิวตาม "ระดับชั้น" (grade_level) — ครูประจำชั้น (homeroom) ใช้ advisor แทน
const GRADE_ROLES = ['gradehead', 'dormhead', 'deputy', 'principal'];

// ข้อมูลผู้ใช้ที่ส่งกลับฝั่ง client (ไม่รวม password_hash)
function publicUser(u) {
  return {
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    role: u.role,
    student_id: u.student_id,
    class_room: u.class_room,
    grade_level: u.grade_level,
    advisor_id: u.advisor_id,
    parent_id: u.parent_id,
  };
}

// ระดับชั้นของนักเรียนจากห้อง เช่น "ม.5/2" -> "ม.5"
function deriveGrade(class_room) {
  if (!class_room) return null;
  const s = String(class_room).split('/')[0].trim();
  return s || null;
}

module.exports = { VALID_ROLES, STAFF_ROLES, PUBLIC_ROLES, GRADE_ROLES, publicUser, deriveGrade };
