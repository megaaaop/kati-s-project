// คิวรีการแจ้งเตือน (Phase 6 — Postgres, async)
const db = require('../db');

async function create({ user_id, request_id, message }) {
  const row = await db.one(`
    INSERT INTO notifications (user_id, request_id, message)
    VALUES ($1,$2,$3) RETURNING id
  `, [user_id, request_id || null, message]);
  return row.id;
}

function listForUser(userId, limit = 30) {
  return db.query(`
    SELECT id, user_id, request_id, message, is_read,
           to_char(created_at AT TIME ZONE 'Asia/Bangkok','YYYY-MM-DD HH24:MI:SS') AS created_at
    FROM notifications WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2
  `, [userId, limit]);
}

async function unreadCount(userId) {
  const row = await db.one('SELECT COUNT(*) AS n FROM notifications WHERE user_id = $1 AND is_read = false', [userId]);
  return Number(row.n);
}

function markRead(id, userId) {
  return db.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [id, userId]);
}
function markAllRead(userId) {
  return db.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [userId]);
}

module.exports = { create, listForUser, unreadCount, markRead, markAllRead };
