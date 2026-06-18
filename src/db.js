// เปิดการเชื่อมต่อ SQLite และสร้างตารางตาม schema.sql ตอนเริ่มแอป
// ใช้ better-sqlite3 (synchronous, อ่านง่าย). ถ้า native build ล้มเหลว ดู fallback ใน README/แผนงาน
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'absence.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// รัน schema (idempotent) ทุกครั้งที่เริ่มแอป
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

module.exports = db;
