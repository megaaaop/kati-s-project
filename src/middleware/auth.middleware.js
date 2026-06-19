// Middleware ตรวจ token (JWT) และตรวจสิทธิ์ตามบทบาท (Phase 6 — async, โหลด user สดจาก DB)
const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model');

const JWT_SECRET = process.env.JWT_SECRET;

async function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) {
    return res.status(401).json({ error: 'ต้องล็อกอินก่อนใช้งาน' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET); // { id, role, full_name }
    // โหลด user สด: ถูกลบ → token ใช้ไม่ได้; ใช้ role ปัจจุบัน (กันสิทธิ์ค้างหลังถูกปรับบทบาท)
    const user = await userModel.findById(payload.id);
    if (!user) {
      return res.status(401).json({ error: 'บัญชีนี้ไม่มีอยู่แล้ว' });
    }
    req.user = { id: user.id, role: user.role, full_name: user.full_name };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'token ไม่ถูกต้องหรือหมดอายุ' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึงส่วนนี้' });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
