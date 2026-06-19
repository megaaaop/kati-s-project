// คิวรีการแจ้งเตือนในเว็บ (F6)
const db = require('../db');

function create({ user_id, request_id, message }) {
  const info = db.prepare(`
    INSERT INTO notifications (user_id, request_id, message)
    VALUES (@user_id, @request_id, @message)
  `).run({ user_id, request_id: request_id || null, message });
  return info.lastInsertRowid;
}

function listForUser(userId, limit = 30) {
  return db.prepare(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?'
  ).all(userId, limit);
}

function unreadCount(userId) {
  return db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0').get(userId).n;
}

// ทำเครื่องหมายอ่านแล้ว เฉพาะของเจ้าของ
function markRead(id, userId) {
  return db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, userId);
}

function markAllRead(userId) {
  return db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
}

module.exports = { create, listForUser, unreadCount, markRead, markAllRead };
