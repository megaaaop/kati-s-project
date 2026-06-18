// คิวรีเกี่ยวกับตาราง leave_requests
const db = require('../db');

function createRequest({ student_id, leave_type, start_date, end_date, reason }) {
  const info = db.prepare(`
    INSERT INTO leave_requests (student_id, leave_type, start_date, end_date, reason)
    VALUES (@student_id, @leave_type, @start_date, @end_date, @reason)
  `).run({ student_id, leave_type, start_date, end_date, reason });
  return findById(info.lastInsertRowid);
}

// คืนคำขอตามบทบาท: นักเรียนเห็นเฉพาะของตัวเอง, ครู/แอดมินเห็นทั้งหมด
// (การกรองตามครูที่ปรึกษา advisor_id จะทำให้สมบูรณ์ในเฟส 2)
function listForUser(user) {
  if (user.role === 'student') {
    return db.prepare(
      'SELECT * FROM leave_requests WHERE student_id = ? ORDER BY created_at DESC'
    ).all(user.id);
  }
  return db.prepare(`
    SELECT lr.*, u.full_name AS student_name, u.class_room
    FROM leave_requests lr
    JOIN users u ON u.id = lr.student_id
    ORDER BY lr.created_at DESC
  `).all();
}

function findById(id) {
  return db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(id);
}

module.exports = { createRequest, listForUser, findById };
