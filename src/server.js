// จุดเริ่มต้นแอป Express
require('dotenv').config();
const path = require('path');
const express = require('express');

if (!process.env.JWT_SECRET) {
  console.error('❌ ไม่พบ JWT_SECRET ใน .env — คัดลอก .env.example เป็น .env แล้วใส่ค่าก่อน');
  process.exit(1);
}

const authRoutes = require('./routes/auth.routes');
const requestRoutes = require('./routes/requests.routes');

const app = express();
app.use(express.json());

// ----- API -----
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);

// API endpoint ที่ไม่รู้จัก → ตอบ JSON 404 (กันไม่ให้ตกไปที่ static)
app.use('/api', (req, res) => res.status(404).json({ error: 'ไม่พบ endpoint นี้' }));

// ----- Frontend (static) -----
app.use(express.static(path.join(__dirname, '..', 'public')));

// ----- Error handler รวม -----
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ ระบบยื่นใบลาทำงานที่ http://localhost:${PORT}`);
});
