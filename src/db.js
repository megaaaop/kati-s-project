// ชั้นฐานข้อมูล (Phase 6) — Postgres ผ่าน pg (prod/Supabase) หรือ pglite (dev/test, in-memory)
// เลือกอัตโนมัติ: ถ้ามี DATABASE_URL = ใช้ Postgres จริง; ไม่งั้นใช้ pglite (สร้าง schema ให้เลย)
const path = require('path');
const fs = require('fs');

// ใช้ pglite เมื่อ: โหมดทดสอบ หรือ ไม่ได้ตั้ง DATABASE_URL (dev). prod ตั้ง DATABASE_URL → ใช้ Postgres จริง
const usePglite = process.env.NODE_ENV === 'test' || !process.env.DATABASE_URL;

// กันพลาด: production ต้องมี DATABASE_URL (ชั่วคราว: log แทน throw เพื่อให้ /api/_diag เข้าถึงได้)
if (usePglite && process.env.NODE_ENV === 'production') {
  console.error('⚠️ DATABASE_URL ไม่ถูกตั้งใน production');
}
let _client = null;
let _readyP = null;

function ready() {
  if (_readyP) return _readyP;
  _readyP = (async () => {
    if (usePglite) {
      const { PGlite } = await import('@electric-sql/pglite');
      _client = new PGlite();
      const schema = fs.readFileSync(path.join(__dirname, 'schema.postgres.sql'), 'utf8');
      await _client.exec(schema);
    } else {
      const { Pool } = require('pg');
      // ถ้ามี PG_CA_CERT → ตรวจใบรับรองเต็มรูปแบบ (ปลอดภัยกว่า); ไม่งั้นเข้ารหัสแต่ไม่ตรวจ cert (ใช้ได้กับ Supabase ทันที)
      const ssl = process.env.PG_CA_CERT
        ? { ca: process.env.PG_CA_CERT, rejectUnauthorized: true }
        : { rejectUnauthorized: false };
      _client = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: Number(process.env.PG_MAX || 3),
        ssl,
      });
    }
  })();
  return _readyP;
}

async function query(text, params = []) {
  await ready();
  const res = await _client.query(text, params);
  return res.rows;
}
async function one(text, params = []) {
  return (await query(text, params))[0];
}

function clientFor(c) {
  return {
    query: async (t, p = []) => (await c.query(t, p)).rows,
    one: async (t, p = []) => (await c.query(t, p)).rows[0],
  };
}

// รัน callback ภายใน transaction (BEGIN/COMMIT/ROLLBACK)
async function tx(fn) {
  await ready();
  if (usePglite) {
    await _client.query('BEGIN');
    try {
      const r = await fn(clientFor(_client));
      await _client.query('COMMIT');
      return r;
    } catch (e) {
      await _client.query('ROLLBACK');
      throw e;
    }
  }
  const conn = await _client.connect();
  try {
    await conn.query('BEGIN');
    const r = await fn(clientFor(conn));
    await conn.query('COMMIT');
    return r;
  } catch (e) {
    await conn.query('ROLLBACK');
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = { query, one, tx, ready };
