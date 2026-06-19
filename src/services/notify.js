// รวมการแจ้งเตือน: สร้างแจ้งเตือนในเว็บ + ส่งอีเมล (จำลอง) ให้ผู้รับ
const userModel = require('../models/user.model');
const notificationModel = require('../models/notification.model');
const { sendMail } = require('./mailer');

// users: array ของ user object (ต้องมี id, email); หรือ array ของ id
function notify(users, { request_id, message, subject }) {
  for (const u of users) {
    const user = typeof u === 'object' ? u : userModel.findById(u);
    if (!user) continue;
    notificationModel.create({ user_id: user.id, request_id, message });
    if (user.email) {
      // ไม่ await — ส่งแบบ fire-and-forget ไม่ให้บล็อก response
      sendMail({ to: user.email, subject: subject || 'แจ้งเตือนระบบยื่นใบลา', text: message });
    }
  }
}

module.exports = { notify };
