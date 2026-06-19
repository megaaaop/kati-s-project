// เปิดการเชื่อมต่อ SQLite และสร้างตารางตาม schema.sql ตอนเริ่มแอป
// ใช้ better-sqlite3 (synchronous, อ่านง่าย). ถ้า native build ล้มเหลว ดู fallback ใน README/แผนงาน
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// ที่อยู่ไฟล์ DB ตั้งได้ผ่าน env (เช่นชี้ไป persistent disk ตอน deploy หรือไฟล์ชั่วคราวตอนเทสต์)
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'absence.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// รัน schema (idempotent) ทุกครั้งที่เริ่มแอป
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

module.exports = db;
