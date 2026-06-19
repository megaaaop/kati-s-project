// คิวรีเกี่ยวกับตาราง users
const db = require('../db');
const { roleForLevel, GRADE_ALL } = require('../config/approval');

const PUBLIC_COLS =
  'id, full_name, email, role, student_id, class_room, grade_level, advisor_id, parent_id, created_at';

function createUser({ full_name, email, password_hash, role, student_id, class_room, grade_level }) {
  const info = db.prepare(`
    INSERT INTO users (full_name, email, password_hash, role, student_id, class_room, grade_level)
    VALUES (@full_name, @email, @password_hash, @role, @student_id, @class_room, @grade_level)
  `).run({
    full_name, email, password_hash, role,
    student_id: student_id || null,
    class_room: class_room || null,
    grade_level: grade_level || null,
  });
  return findById(info.lastInsertRowid);
}

function findByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}
function findById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

// ----- สำหรับสายอนุมัติ -----
// ผู้อนุมัติของขั้นหนึ่งๆ ตามนักเรียน: ขั้น 1 = ครูประจำชั้น (advisor); ขั้น 2-4 = ตามระดับชั้น
function findApproversForLevel(level, student) {
  const role = roleForLevel(level);
  if (!role) return [];
  if (level === 1) {
    return student.advisor_id ? [findById(student.advisor_id)].filter(Boolean) : [];
  }
  return db.prepare(
    'SELECT * FROM users WHERE role = ? AND (grade_level = ? OR grade_level = ?)'
  ).all(role, student.grade_level, GRADE_ALL);
}

function findChildren(parentId) {
  return db.prepare(`SELECT ${PUBLIC_COLS} FROM users WHERE parent_id = ?`).all(parentId);
}

function findByRole(role) {
  return db.prepare(`SELECT ${PUBLIC_COLS} FROM users WHERE role = ?`).all(role);
}

// นับจำนวนข้อมูลที่อ้างอิงผู้ใช้คนนี้ (กันลบแล้วทำ FK พัง)
function countReferences(id) {
  return db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM leave_requests WHERE student_id = @id) +
      (SELECT COUNT(*) FROM approval_steps  WHERE approver_id = @id) +
      (SELECT COUNT(*) FROM notifications   WHERE user_id = @id) +
      (SELECT COUNT(*) FROM users           WHERE advisor_id = @id OR parent_id = @id) AS n
  `).get({ id }).n;
}

// ----- สำหรับหน้าแอดมิน -----
function listUsers() {
  return db.prepare(`
    SELECT u.id, u.full_name, u.email, u.role, u.student_id, u.class_room, u.grade_level,
           u.advisor_id, u.parent_id, u.created_at,
           a.full_name AS advisor_name, p.full_name AS parent_name
    FROM users u
    LEFT JOIN users a ON a.id = u.advisor_id
    LEFT JOIN users p ON p.id = u.parent_id
    ORDER BY u.role, u.full_name
  `).all();
}

// อัปเดตเฉพาะฟิลด์ที่ส่งมา (role, grade_level, class_room, advisor_id, parent_id, full_name)
function updateUser(id, fields) {
  const allowed = ['full_name', 'role', 'class_room', 'grade_level', 'advisor_id', 'parent_id', 'student_id'];
  const sets = [];
  const params = { id };
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      sets.push(`${key} = @${key}`);
      params[key] = fields[key] === '' ? null : fields[key];
    }
  }
  if (!sets.length) return findById(id);
  db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = @id`).run(params);
  return findById(id);
}

function deleteUser(id) {
  return db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

module.exports = {
  createUser, findByEmail, findById,
  findApproversForLevel, findChildren, findByRole,
  listUsers, updateUser, deleteUser, countReferences,
};
