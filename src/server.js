// จุดเริ่มต้นแอป Express
require('dotenv').config();
const path = require('path');
const express = require('express');

// ต้องมีค่าลับเหล่านี้เสมอ — ขาดแล้วหยุดทันที (fail-fast กันรันแบบไม่ปลอดภัย)
if (!process.env.JWT_SECRET) throw new Error('ต้องตั้งค่า environment variable: JWT_SECRET');
if (!process.env.STAFF_SIGNUP_CODE) throw new Error('ต้องตั้งค่า environment variable: STAFF_SIGNUP_CODE');

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
