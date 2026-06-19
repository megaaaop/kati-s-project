// ส่งอีเมล — โหมด dev ใช้ jsonTransport (ไม่ส่งจริง, log ลง console)
// ถ้าตั้งค่า SMTP_* ใน .env ครบ จะสลับไปส่งจริงผ่าน Nodemailer ได้ทันที
const nodemailer = require('nodemailer');

let transporter;
const hasSmtp = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

if (hasSmtp) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
} else {
  // อีเมลจำลอง: สร้างข้อความจริงแต่ไม่ส่งออก
  transporter = nodemailer.createTransport({ jsonTransport: true });
}

const FROM = process.env.MAIL_FROM || 'ระบบยื่นใบลา <no-reply@absence.local>';

async function sendMail({ to, subject, text }) {
  if (!to) return;
  try {
    const info = await transporter.sendMail({ from: FROM, to, subject, text });
    if (!hasSmtp) {
      // โหมดจำลอง: แสดงให้เห็นว่า "ส่ง" อะไรไปหาใคร
      console.log(`📧 [อีเมลจำลอง] → ${to} | ${subject}`);
    } else {
      console.log(`📧 ส่งอีเมลจริง → ${to} (${info.messageId})`);
    }
  } catch (e) {
    console.error('ส่งอีเมลไม่สำเร็จ:', e.message);
  }
}

module.exports = { sendMail };
