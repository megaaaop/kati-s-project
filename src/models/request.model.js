// คิวรีคำขอลา + สายอนุมัติ (Phase 6 — Postgres, async)
const db = require('../db');
const { MAX_LEVEL, levelForRole, GRADE_ALL, APPROVER_ROLES } = require('../config/approval');

// คอลัมน์ leave_requests พร้อมแปลงวันที่/เวลาเป็น string (ให้ฝั่ง JS เทียบ/แสดงเหมือนเดิม)
const LR = `lr.id, lr.student_id, lr.leave_type,
  to_char(lr.start_date,'YYYY-MM-DD') AS start_date,
  to_char(lr.end_date,'YYYY-MM-DD') AS end_date,
  lr.reason, lr.status, lr.current_level,
  to_char(lr.created_at AT TIME ZONE 'Asia/Bangkok','YYYY-MM-DD HH24:MI:SS') AS created_at`;

async function createRequest({ student_id, leave_type, start_date, end_date, reason }) {
  const row = await db.one(`
    INSERT INTO leave_requests (student_id, leave_type, start_date, end_date, reason)
    VALUES ($1,$2,$3,$4,$5) RETURNING id
  `, [student_id, leave_type, start_date, end_date, reason]);
  return findById(row.id);
}

function findById(id) {
  return db.one(`SELECT ${LR} FROM leave_requests lr WHERE lr.id = $1`, [id]);
}

function findDetailById(id) {
  return db.one(`
    SELECT ${LR}, s.full_name AS student_name, s.student_id AS student_code,
           s.class_room, s.grade_level, s.advisor_id, s.parent_id
    FROM leave_requests lr JOIN users s ON s.id = lr.student_id
    WHERE lr.id = $1
  `, [id]);
}

// ----- รายการตามบทบาท -----
function listForStudent(uid) {
  return db.query(`SELECT ${LR} FROM leave_requests lr WHERE lr.student_id = $1 ORDER BY lr.created_at DESC`, [uid]);
}
function listForParent(parentId) {
  return db.query(`
    SELECT ${LR}, s.full_name AS student_name, s.class_room
    FROM leave_requests lr JOIN users s ON s.id = lr.student_id
    WHERE s.parent_id = $1 ORDER BY lr.created_at DESC
  `, [parentId]);
}
function listAll() {
  return db.query(`
    SELECT ${LR}, s.full_name AS student_name, s.class_room, s.grade_level
    FROM leave_requests lr JOIN users s ON s.id = lr.student_id
    ORDER BY lr.created_at DESC
  `);
}

async function listForApprover(user) {
  const level = levelForRole(user.role);
  const pending = (await db.query(`
    SELECT ${LR}, s.full_name AS student_name, s.class_room, s.grade_level, s.advisor_id
    FROM leave_requests lr JOIN users s ON s.id = lr.student_id
    WHERE lr.status = 'pending' AND lr.current_level = $1
  `, [level])).filter((r) => inScope(user, r, level));

  const mine = await db.query(`
    SELECT ${LR}, s.full_name AS student_name, s.class_room, s.grade_level, s.advisor_id
    FROM leave_requests lr JOIN users s ON s.id = lr.student_id
    WHERE lr.id IN (SELECT request_id FROM approval_steps WHERE approver_id = $1)
  `, [user.id]);

  const map = new Map();
  for (const r of pending) map.set(r.id, { ...r, in_queue: 1 });
  for (const r of mine) if (!map.has(r.id)) map.set(r.id, { ...r, in_queue: 0 });
  return [...map.values()].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

// ตรวจขอบเขตผู้อนุมัติ (pure, ไม่แตะ DB)
function inScope(user, r, level) {
  const lv = level || levelForRole(user.role);
  if (lv === 1) return r.advisor_id === user.id;
  if (user.grade_level === GRADE_ALL) return true;
  return !!r.grade_level && r.grade_level === user.grade_level;
}

function listForUser(user) {
  if (user.role === 'student') return listForStudent(user.id);
  if (user.role === 'parent') return listForParent(user.id);
  if (user.role === 'admin') return listAll();
  if (APPROVER_ROLES.includes(user.role)) return listForApprover(user);
  return Promise.resolve([]);
}

// บันทึกการตัดสิน + เลื่อนขั้น (transaction)
function recordDecision({ request, approver, decision, note }) {
  return db.tx(async (c) => {
    await c.query(`
      INSERT INTO approval_steps (request_id, level, role, approver_id, decision, note)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [request.id, request.current_level, approver.role, approver.id, decision, note || null]);

    if (decision === 'rejected') {
      await c.query("UPDATE leave_requests SET status = 'rejected' WHERE id = $1", [request.id]);
    } else if (request.current_level < MAX_LEVEL) {
      await c.query('UPDATE leave_requests SET current_level = current_level + 1 WHERE id = $1', [request.id]);
    } else {
      await c.query("UPDATE leave_requests SET status = 'approved' WHERE id = $1", [request.id]);
    }
    return c.one(`SELECT ${LR} FROM leave_requests lr WHERE lr.id = $1`, [request.id]);
  });
}

function stepsForRequest(requestId) {
  return db.query(`
    SELECT st.level, st.role, st.decision, st.note,
           to_char(st.decided_at AT TIME ZONE 'Asia/Bangkok','YYYY-MM-DD HH24:MI:SS') AS decided_at,
           u.full_name AS approver_name
    FROM approval_steps st LEFT JOIN users u ON u.id = st.approver_id
    WHERE st.request_id = $1 ORDER BY st.id
  `, [requestId]);
}

// แถวสำหรับสถิติ ตามขอบเขตผู้ใช้
function statsRows(user) {
  const cols = `lr.id, lr.leave_type, lr.status, lr.current_level,
    to_char(lr.created_at AT TIME ZONE 'Asia/Bangkok','YYYY-MM-DD HH24:MI:SS') AS created_at,
    s.full_name AS student_name, s.student_id AS student_code, s.grade_level, s.class_room`;
  const FROM = `FROM leave_requests lr JOIN users s ON s.id = lr.student_id`;
  if (user.role === 'admin' || user.grade_level === GRADE_ALL) {
    return db.query(`SELECT ${cols} ${FROM}`);
  }
  if (user.role === 'homeroom') {
    return db.query(`SELECT ${cols} ${FROM} WHERE s.advisor_id = $1`, [user.id]);
  }
  return db.query(`SELECT ${cols} ${FROM} WHERE s.grade_level = $1`, [user.grade_level || '']);
}

module.exports = {
  createRequest, findById, findDetailById, listForUser,
  recordDecision, stepsForRequest, inScope, statsRows,
};
