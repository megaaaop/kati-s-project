// Middleware ตรวจ token (JWT) และตรวจสิทธิ์ตามบทบาท (spec §7)
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// ตรวจว่ามี token ที่ถูกต้องใน header: Authorization: Bearer <token>
function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) {
    return res.status(401).json({ error: 'ต้องล็อกอินก่อนใช้งาน' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET); // { id, role, full_name }
    next();
  } catch (e) {
    return res.status(401).json({ error: 'token ไม่ถูกต้องหรือหมดอายุ' });
  }
}

// อนุญาตเฉพาะบทบาทที่ระบุ เช่น requireRole('teacher','admin')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึงส่วนนี้' });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
