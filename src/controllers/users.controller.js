// หน้าแอดมินจัดการผู้ใช้ + จับคู่ (Phase 6 async)
const bcrypt = require('bcryptjs');
const userModel = require('../models/user.model');
const { VALID_ROLES, GRADE_ROLES, publicUser, deriveGrade } = require('../utils/roles');

async function list(req, res, next) {
  try {
    return res.json({ users: await userModel.listUsers() });
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const { full_name, password, role, student_id, class_room, grade_level } = req.body || {};
    const email = String((req.body && req.body.email) || '').trim().toLowerCase();
    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ error: 'กรอกชื่อ อีเมล รหัสผ่าน และบทบาทให้ครบ' });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'บทบาทไม่ถูกต้อง' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร' });
    }
    if (await userModel.findByEmail(email)) {
      return res.status(409).json({ error: 'อีเมลนี้ถูกใช้ไปแล้ว' });
    }
    const password_hash = await bcrypt.hash(String(password), 10);
    const user = await userModel.createUser({
      full_name, email, password_hash, role,
      student_id: role === 'student' ? student_id : null,
      class_room: role === 'student' ? class_room : null,
      grade_level: role === 'student' ? deriveGrade(class_room) : (GRADE_ROLES.includes(role) ? (grade_level || null) : null),
    });
    return res.status(201).json({ user: publicUser(user) });
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    const existing = await userModel.findById(id);
    if (!existing) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });

    const fields = { ...(req.body || {}) };
    if (fields.role && !VALID_ROLES.includes(fields.role)) {
      return res.status(400).json({ error: 'บทบาทไม่ถูกต้อง' });
    }

    // รีเซ็ตรหัสผ่าน (ถ้าส่ง password มาและไม่ว่าง) — เข้ารหัสแล้วอัปเดตแยกจาก field ทั่วไป
    const newPassword = fields.password;
    delete fields.password;
    if (newPassword != null && String(newPassword) !== '') {
      if (String(newPassword).length < 6) {
        return res.status(400).json({ error: 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร' });
      }
      await userModel.updatePassword(id, await bcrypt.hash(String(newPassword), 10));
    }

    // อีเมล: normalize + กันซ้ำกับผู้ใช้คนอื่น; ถ้าเว้นว่างถือว่าไม่เปลี่ยน
    if (Object.prototype.hasOwnProperty.call(fields, 'email')) {
      const email = String(fields.email || '').trim().toLowerCase();
      if (!email) {
        delete fields.email;
      } else {
        const clash = await userModel.findByEmail(email);
        if (clash && clash.id !== id) {
          return res.status(409).json({ error: 'อีเมลนี้ถูกใช้ไปแล้ว' });
        }
        fields.email = email;
      }
    }

    const role = fields.role || existing.role;

    if (role === 'student') {
      const cls = Object.prototype.hasOwnProperty.call(fields, 'class_room') ? fields.class_room : existing.class_room;
      // ระดับชั้น: ถ้าแอดมินกรอกมาเองให้ใช้ค่านั้น; ถ้าเว้นว่างให้คำนวณจากห้องอัตโนมัติ
      const sentGrade = Object.prototype.hasOwnProperty.call(fields, 'grade_level') ? String(fields.grade_level || '').trim() : '';
      fields.grade_level = sentGrade || deriveGrade(cls);
    } else {
      fields.student_id = null;
      fields.class_room = null;
      fields.advisor_id = null;
      fields.parent_id = null;
      if (!GRADE_ROLES.includes(role)) fields.grade_level = null;
    }

    const user = await userModel.updateUser(id, fields);
    return res.json({ user: publicUser(user) });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (id === req.user.id) {
      return res.status(400).json({ error: 'ลบบัญชีตัวเองไม่ได้' });
    }
    if (!(await userModel.findById(id))) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    if ((await userModel.countReferences(id)) > 0) {
      return res.status(409).json({ error: 'ลบไม่ได้: ผู้ใช้นี้มีคำขอ/การอนุมัติ/การจับคู่ที่อ้างอิงอยู่' });
    }
    await userModel.deleteUser(id);
    return res.json({ ok: true });
  } catch (e) { next(e); }
}

module.exports = { list, create, update, remove };
