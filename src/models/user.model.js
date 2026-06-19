// คิวรีเกี่ยวกับตาราง users (Phase 6 — Postgres, async)
const db = require('../db');
const { roleForLevel, GRADE_ALL } = require('../config/approval');

const PUB = `id, full_name, email, role, student_id, class_room, grade_level, advisor_id, parent_id`;

async function createUser({ full_name, email, password_hash, role, student_id, class_room, grade_level }) {
  const row = await db.one(`
    INSERT INTO users (full_name, email, password_hash, role, student_id, class_room, grade_level)
    VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id
  `, [full_name, email, password_hash, role, student_id || null, class_room || null, grade_level || null]);
  return findById(row.id);
}

function findByEmail(email) { return db.one('SELECT * FROM users WHERE email = $1', [email]); }
function findById(id) { return db.one('SELECT * FROM users WHERE id = $1', [id]); }

// ----- สำหรับสายอนุมัติ -----
async function findApproversForLevel(level, student) {
  const role = roleForLevel(level);
  if (!role) return [];
  if (level === 1) {
    if (!student.advisor_id) return [];
    return db.query('SELECT * FROM users WHERE id = $1', [student.advisor_id]);
  }
  return db.query('SELECT * FROM users WHERE role = $1 AND (grade_level = $2 OR grade_level = $3)',
    [role, student.grade_level, GRADE_ALL]);
}

function findChildren(parentId) {
  return db.query(`SELECT ${PUB} FROM users WHERE parent_id = $1`, [parentId]);
}
function findByRole(role) {
  return db.query(`SELECT ${PUB} FROM users WHERE role = $1`, [role]);
}

// ----- หน้าแอดมิน -----
function listUsers() {
  return db.query(`
    SELECT u.id, u.full_name, u.email, u.role, u.student_id, u.class_room, u.grade_level,
           u.advisor_id, u.parent_id, to_char(u.created_at,'YYYY-MM-DD HH24:MI:SS') AS created_at,
           a.full_name AS advisor_name, p.full_name AS parent_name
    FROM users u
    LEFT JOIN users a ON a.id = u.advisor_id
    LEFT JOIN users p ON p.id = u.parent_id
    ORDER BY u.role, u.full_name
  `);
}

async function updateUser(id, fields) {
  const allowed = ['full_name', 'role', 'class_room', 'grade_level', 'advisor_id', 'parent_id', 'student_id'];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      params.push(fields[key] === '' ? null : fields[key]);
      sets.push(`${key} = $${params.length}`);
    }
  }
  if (!sets.length) return findById(id);
  params.push(id);
  await db.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
  return findById(id);
}

function deleteUser(id) { return db.query('DELETE FROM users WHERE id = $1', [id]); }

async function countReferences(id) {
  const row = await db.one(`
    SELECT
      (SELECT COUNT(*) FROM leave_requests WHERE student_id = $1) +
      (SELECT COUNT(*) FROM approval_steps  WHERE approver_id = $1) +
      (SELECT COUNT(*) FROM notifications   WHERE user_id = $1) +
      (SELECT COUNT(*) FROM users           WHERE advisor_id = $1 OR parent_id = $1) AS n
  `, [id]);
  return Number(row.n);
}

module.exports = {
  createUser, findByEmail, findById,
  findApproversForLevel, findChildren, findByRole,
  listUsers, updateUser, deleteUser, countReferences,
};
