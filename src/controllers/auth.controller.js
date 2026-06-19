// ตรรกะระบบสมาชิก/ล็อกอิน (F1)
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model');
const { VALID_ROLES, STAFF_ROLES, GRADE_ROLES, publicUser, deriveGrade } = require('../utils/roles');

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_TTL = '8h';

async function register(req, res, next) {
  try {
    const { full_name, email, password, role, student_id, class_room, grade_level, staff_code } = req.body || {};

    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ error: 'กรอกชื่อ-นามสกุล อีเมล รหัสผ่าน และบทบาทให้ครบ' });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'บทบาทไม่ถูกต้อง' });
    }
    // สมัครเป็นบทบาทพิเศษ (ครู/ผู้บริหาร/แอดมิน) ต้องมีรหัสลับที่ตรงกับ .env
    if (STAFF_ROLES.includes(role)) {
      if (!process.env.STAFF_SIGNUP_CODE || staff_code !== process.env.STAFF_SIGNUP_CODE) {
        return res.status(403).json({ error: 'รหัสลับสำหรับครู/ผู้บริหารไม่ถูกต้อง' });
      }
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร' });
    }
    if (userModel.findByEmail(email)) {
      return res.status(409).json({ error: 'อีเมลนี้ถูกใช้ไปแล้ว' });
    }

    const password_hash = await bcrypt.hash(String(password), 10);
    const user = userModel.createUser({
      full_name,
      email,
      password_hash,
      role,
      student_id: role === 'student' ? student_id : null,
      class_room: role === 'student' ? class_room : null,
      // นักเรียน: ระดับชั้นจากห้อง; ผู้อนุมัติที่จับคิวตามระดับชั้น: ระดับที่ดูแลตามที่กรอก
      grade_level: role === 'student' ? deriveGrade(class_room)
        : (GRADE_ROLES.includes(role) ? (grade_level || null) : null),
    });
    return res.status(201).json({ user: publicUser(user) });
  } catch (e) {
    next(e);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'กรอกอีเมลและรหัสผ่าน' });
    }
    const user = userModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }
    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }
    const token = jwt.sign(
      { id: user.id, role: user.role, full_name: user.full_name },
      JWT_SECRET,
      { expiresIn: TOKEN_TTL }
    );
    return res.json({ token, user: publicUser(user) });
  } catch (e) {
    next(e);
  }
}

function logout(req, res) {
  return res.json({ ok: true });
}

function me(req, res) {
  const user = userModel.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
  }
  return res.json({ user: publicUser(user) });
}

module.exports = { register, login, logout, me };
