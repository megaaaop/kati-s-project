// คิวรีตาราง attachments (Phase 6 — Postgres, async)
const db = require('../db');

async function createAttachment({ request_id, file_name, file_path }) {
  const row = await db.one(`
    INSERT INTO attachments (request_id, file_name, file_path)
    VALUES ($1,$2,$3) RETURNING id
  `, [request_id, file_name, file_path]);
  return findById(row.id);
}

function listForRequest(request_id) {
  return db.query(`
    SELECT id, request_id, file_name, file_path,
           to_char(uploaded_at AT TIME ZONE 'Asia/Bangkok','YYYY-MM-DD HH24:MI:SS') AS uploaded_at
    FROM attachments WHERE request_id = $1 ORDER BY uploaded_at
  `, [request_id]);
}

function findById(id) {
  return db.one('SELECT * FROM attachments WHERE id = $1', [id]);
}

module.exports = { createAttachment, listForRequest, findById };
