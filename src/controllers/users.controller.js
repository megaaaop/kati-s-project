// หน้าแอดมินจัดการผู้ใช้ + จับคู่ครู/ระดับชั้น (เฉพาะ role=admin)
const bcrypt = require('bcryptjs');
const userModel = require('../models/user.model');
const { VALID_ROLES, GRADE_ROLES, publicUser, deriveGrade } = require('../utils/roles');

function list(req, res, next) {
  try {
    return res.json({ users: userModel.listUsers() });
  } catch (e) { next(e); }
}

// แอดมินสร้างผู้ใช้บทบาทใดก็ได้ (ไม่ต้องใช้รหัสลับ)
async function create(req, res, next) {
  try {
    const { full_name, email, password, role, student_id, class_room, grade_level } = req.body || {};
    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ error: 'กรอกชื่อ อีเมล รหัสผ่าน และบทบาทให้ครบ' });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'บทบาทไม่ถูกต้อง' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร' });
    }
    if (userModel.findByEmail(email)) {
      return res.status(409).json({ error: 'อีเมลนี้ถูกใช้ไปแล้ว' });
    }
    const password_hash = await bcrypt.hash(String(password), 10);
    const user = userModel.createUser({
      full_name, email, password_hash, role,
      student_id: role === 'student' ? student_id : null,
      class_room: role === 'student' ? class_room : null,
      grade_level: role === 'student' ? deriveGrade(class_room) : (GRADE_ROLES.includes(role) ? (grade_level || null) : null),
    });
    return res.status(201).json({ user: publicUser(user) });
  } catch (e) { next(e); }
}

// แก้ไขผู้ใช้ + จับคู่ — normalize ฟิลด์ตามบทบาทสุดท้าย (สอดคล้องกับ create กัน scope เพี้ยน)
function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    const existing = userModel.findById(id);
    if (!existing) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });

    const fields = { ...(req.body || {}) };
    if (fields.role && !VALID_ROLES.includes(fields.role)) {
      return res.status(400).json({ error: 'บทบาทไม่ถูกต้อง' });
    }
    const role = fields.role || existing.role;

    if (role === 'student') {
      // ระดับชั้นต้องอิงจากห้องเสมอ (กันห้องกับระดับไม่ตรงกัน → route ผิด)
      const cls = Object.prototype.hasOwnProperty.call(fields, 'class_room') ? fields.class_room : existing.class_room;
      fields.grade_level = deriveGrade(cls);
    } else {
      // ไม่ใช่นักเรียน → ล้างฟิลด์เฉพาะนักเรียน
      fields.student_id = null;
      fields.class_room = null;
      fields.advisor_id = null;
      fields.parent_id = null;
      if (!GRADE_ROLES.includes(role)) fields.grade_level = null; // homeroom/parent/admin ไม่มีระดับที่ดูแล
    }

    const user = userModel.updateUser(id, fields);
    return res.json({ user: publicUser(user) });
  } catch (e) { next(e); }
}

function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (id === req.user.id) {
      return res.status(400).json({ error: 'ลบบัญชีตัวเองไม่ได้' });
    }
    if (!userModel.findById(id)) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    // กันลบผู้ใช้ที่มีข้อมูลอ้างอิง (จะทำ FK พัง) — ตอบ 409 พร้อมเหตุผลชัดเจน
    if (userModel.countReferences(id) > 0) {
      return res.status(409).json({ error: 'ลบไม่ได้: ผู้ใช้นี้มีคำขอ/การอนุมัติ/การจับคู่ที่อ้างอิงอยู่' });
    }
    userModel.deleteUser(id);
    return res.json({ ok: true });
  } catch (e) { next(e); }
}

module.exports = { list, create, update, remove };
