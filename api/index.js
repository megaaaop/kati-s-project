// จุดเข้า serverless ของ Vercel — รัน Express app (จาก src/server.js) เป็นฟังก์ชัน
// server.js export ตัว app และ "ไม่ listen" เมื่อถูก require (มี require.main guard)
module.exports = require('../src/server.js');
