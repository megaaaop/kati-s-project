// จุดเริ่มต้นแอป Express
require('dotenv').config();
const path = require('path');
const express = require('express');

// (ชั่วคราว) ไม่ throw เพื่อให้ /api/_diag เข้าถึงได้ — จะคืน fail-fast หลังแก้เสร็จ
if (!process.env.JWT_SECRET) console.error('❌ ไม่พบ JWT_SECRET');
if (!process.env.STAFF_SIGNUP_CODE) console.error('❌ ไม่พบ STAFF_SIGNUP_CODE');

const authRoutes = require('./routes/auth.routes');
const requestRoutes = require('./routes/requests.routes');
const attachmentRoutes = require('./routes/attachments.routes');
const notificationRoutes = require('./routes/notifications.routes');
const userRoutes = require('./routes/users.routes');
const statsRoutes = require('./routes/stats.routes');

const app = express();

// อยู่หลัง reverse proxy ของผู้ให้บริการ (Render/Railway) ตอน production
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.use(express.json());

// security headers พื้นฐาน
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

// ----- API -----
app.get('/api/health', (req, res) => res.json({ ok: true, status: 'up' }));

// ตัวตรวจชั่วคราว (ลบหลังแก้เสร็จ): รายงานว่า env ตัวไหนมี (true/false, ไม่โชว์ค่า) + ลองต่อ DB
app.get('/api/_diag', async (req, res) => {
  const out = {
    env: {
      NODE_ENV: process.env.NODE_ENV || '(unset)',
      JWT_SECRET: !!process.env.JWT_SECRET,
      STAFF_SIGNUP_CODE: !!process.env.STAFF_SIGNUP_CODE,
      DATABASE_URL: !!process.env.DATABASE_URL,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
      SUPABASE_BUCKET: !!process.env.SUPABASE_BUCKET,
    },
  };
  try {
    const db = require('./db');
    await db.query('SELECT 1');
    out.connect = 'ok';
    if (req.query.cleanup === 'diagtest') {
      const del = await db.query("DELETE FROM users WHERE email LIKE 'diagtest%' RETURNING id");
      out.cleaned = del.length;
    }
    try {
      const r = await db.query('SELECT COUNT(*) AS n FROM users');
      out.usersTable = 'ok (' + r[0].n + ' rows)';
    } catch (e2) {
      out.usersTable = 'FAIL: ' + e2.message + ' [' + (e2.code || '') + ']';
    }
  } catch (e) {
    out.connect = 'FAIL: ' + e.message + ' [' + (e.code || '') + ']';
  }
  res.json(out);
});
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);

// API endpoint ที่ไม่รู้จัก → ตอบ JSON 404 (กันไม่ให้ตกไปที่ static)
app.use('/api', (req, res) => res.status(404).json({ error: 'ไม่พบ endpoint นี้' }));

// favicon (เปลี่ยน .ico ที่เบราว์เซอร์ขอเป็น svg ของเรา)
app.get('/favicon.ico', (req, res) => res.redirect(301, '/favicon.svg'));

// ----- Frontend (static) -----
app.use(express.static(path.join(__dirname, '..', 'public')));

// ----- Error handler รวม -----
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
});

const PORT = process.env.PORT || 3000;

// listen เฉพาะเมื่อรันไฟล์นี้ตรงๆ (ไม่ listen ตอนถูก import ในเทสต์)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ ระบบยื่นใบลาทำงานที่ http://localhost:${PORT}`);
  });
}

module.exports = app;
