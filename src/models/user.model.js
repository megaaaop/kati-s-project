// คิวรีเกี่ยวกับตาราง users
const db = require('../db');

function createUser({ full_name, email, password_hash, role, student_id, class_room }) {
  const info = db.prepare(`
    INSERT INTO users (full_name, email, password_hash, role, student_id, class_room)
    VALUES (@full_name, @email, @password_hash, @role, @student_id, @class_room)
  `).run({
    full_name,
    email,
    password_hash,
    role,
    student_id: student_id || null,
    class_room: class_room || null,
  });
  return findById(info.lastInsertRowid);
}

function findByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function findById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

module.exports = { createUser, findByEmail, findById };
