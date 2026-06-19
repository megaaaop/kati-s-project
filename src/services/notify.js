// รวมการแจ้งเตือน: สร้างแจ้งเตือนในเว็บ + ส่งอีเมล (จำลอง) ให้ผู้รับ (Phase 6 — async)
const userModel = require('../models/user.model');
const notificationModel = require('../models/notification.model');
const { sendMail } = require('./mailer');

// users: array ของ user object (ต้องมี id, email) หรือ array ของ id
async function notify(users, { request_id, message, subject }) {
  for (const u of users) {
    const user = typeof u === 'object' ? u : await userModel.findById(u);
    if (!user) continue;
    await notificationModel.create({ user_id: user.id, request_id, message });
    if (user.email) {
      // ส่งอีเมลแบบ fire-and-forget ไม่บล็อก
      sendMail({ to: user.email, subject: subject || 'แจ้งเตือนระบบยื่นใบลา', text: message });
    }
  }
}

module.exports = { notify };
