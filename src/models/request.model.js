// คิวรีคำขอลา + กลไกสายอนุมัติหลายขั้น
const db = require('../db');
const { MAX_LEVEL, levelForRole, GRADE_ALL, APPROVER_ROLES } = require('../config/approval');

function createRequest({ student_id, leave_type, start_date, end_date, reason }) {
  const info = db.prepare(`
    INSERT INTO leave_requests (student_id, leave_type, start_date, end_date, reason)
    VALUES (@student_id, @leave_type, @start_date, @end_date, @reason)
  `).run({ student_id, leave_type, start_date, end_date, reason });
  return findById(info.lastInsertRowid);
}

function findById(id) {
  return db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(id);
}

// รายละเอียดคำขอ + ชื่อผู้ยื่น
function findDetailById(id) {
  return db.prepare(`
    SELECT lr.*, s.full_name AS student_name, s.student_id AS student_code,
           s.class_room, s.grade_level, s.advisor_id, s.parent_id
    FROM leave_requests lr
    JOIN users s ON s.id = lr.student_id
    WHERE lr.id = ?
  `).get(id);
}

// ----- รายการตามบทบาท -----
function listForStudent(uid) {
  return db.prepare(
    'SELECT * FROM leave_requests WHERE student_id = ? ORDER BY created_at DESC'
  ).all(uid);
}

function listForParent(parentId) {
  return db.prepare(`
    SELECT lr.*, s.full_name AS student_name, s.class_room
    FROM leave_requests lr
    JOIN users s ON s.id = lr.student_id
    WHERE s.parent_id = ?
    ORDER BY lr.created_at DESC
  `).all(parentId);
}

function listAll() {
  return db.prepare(`
    SELECT lr.*, s.full_name AS student_name, s.class_room, s.grade_level
    FROM leave_requests lr
    JOIN users s ON s.id = lr.student_id
    ORDER BY lr.created_at DESC
  `).all();
}

// คิวของผู้อนุมัติ: ใบที่ค้างอยู่ขั้นของตน (กรองตามขอบเขต) + ใบที่ตนเคยตัดสิน
function listForApprover(user) {
  const level = levelForRole(user.role);
  const pending = db.prepare(`
    SELECT lr.*, s.full_name AS student_name, s.class_room, s.grade_level, s.advisor_id
    FROM leave_requests lr
    JOIN users s ON s.id = lr.student_id
    WHERE lr.status = 'pending' AND lr.current_level = ?
  `).all(level).filter((r) => inScope(user, r, level));

  const mine = db.prepare(`
    SELECT lr.*, s.full_name AS student_name, s.class_room, s.grade_level, s.advisor_id
    FROM leave_requests lr
    JOIN users s ON s.id = lr.student_id
    WHERE lr.id IN (SELECT request_id FROM approval_steps WHERE approver_id = ?)
  `).all(user.id);

  const map = new Map();
  for (const r of pending) map.set(r.id, { ...r, in_queue: 1 });
  for (const r of mine) if (!map.has(r.id)) map.set(r.id, { ...r, in_queue: 0 });
  return [...map.values()].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

// ตรวจว่าผู้อนุมัติคนนี้อยู่ในขอบเขตของคำขอนี้หรือไม่ (r ต้องมี advisor_id, grade_level ของนักเรียน)
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
  return [];
}

// ----- บันทึกการตัดสิน + เลื่อนขั้น (อยู่ใน transaction) -----
const recordDecision = db.transaction(({ request, approver, decision, note }) => {
  db.prepare(`
    INSERT INTO approval_steps (request_id, level, role, approver_id, decision, note)
    VALUES (@request_id, @level, @role, @approver_id, @decision, @note)
  `).run({
    request_id: request.id,
    level: request.current_level,
    role: approver.role,
    approver_id: approver.id,
    decision,
    note: note || null,
  });

  if (decision === 'rejected') {
    db.prepare("UPDATE leave_requests SET status = 'rejected' WHERE id = ?").run(request.id);
  } else if (request.current_level < MAX_LEVEL) {
    db.prepare('UPDATE leave_requests SET current_level = current_level + 1 WHERE id = ?').run(request.id);
  } else {
    db.prepare("UPDATE leave_requests SET status = 'approved' WHERE id = ?").run(request.id);
  }
  return findById(request.id);
});

// ประวัติขั้นอนุมัติของคำขอ (พร้อมชื่อผู้ตัดสิน)
function stepsForRequest(requestId) {
  return db.prepare(`
    SELECT st.level, st.role, st.decision, st.note, st.decided_at,
           u.full_name AS approver_name
    FROM approval_steps st
    LEFT JOIN users u ON u.id = st.approver_id
    WHERE st.request_id = ?
    ORDER BY st.id
  `).all(requestId);
}

module.exports = {
  createRequest, findById, findDetailById, listForUser,
  recordDecision, stepsForRequest, inScope,
};
