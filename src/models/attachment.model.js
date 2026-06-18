// คิวรีเกี่ยวกับตาราง attachments (F3)
const db = require('../db');

function createAttachment({ request_id, file_name, file_path }) {
  const info = db.prepare(`
    INSERT INTO attachments (request_id, file_name, file_path)
    VALUES (@request_id, @file_name, @file_path)
  `).run({ request_id, file_name, file_path });
  return findById(info.lastInsertRowid);
}

function listForRequest(request_id) {
  return db.prepare(
    'SELECT id, request_id, file_name, file_path, uploaded_at FROM attachments WHERE request_id = ? ORDER BY uploaded_at'
  ).all(request_id);
}

function findById(id) {
  return db.prepare('SELECT * FROM attachments WHERE id = ?').get(id);
}

module.exports = { createAttachment, listForRequest, findById };
