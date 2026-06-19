const express = require('express');
const ctrl = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { rateLimit } = require('../middleware/ratelimit.middleware');

const router = express.Router();

// login: จำกัดต่อ (IP + อีเมล) เพื่อกัน brute-force รายบัญชี โดยไม่บล็อกทั้งโรงเรียนที่ใช้ IP เดียว (NAT)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่ใน 15 นาที',
  key: (req) => (req.ip || 'x') + ':' + String((req.body && req.body.email) || '').trim().toLowerCase(),
});
// register: จำกัดต่อ IP เพื่อกันการสมัครถล่ม
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: 'สมัครบ่อยเกินไป กรุณาลองใหม่ภายหลัง',
});

router.post('/register', registerLimiter, ctrl.register);
router.post('/login', loginLimiter, ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/me', verifyToken, ctrl.me);

module.exports = router;
