// รับไฟล์แนบหลักฐาน (F3) ด้วย Multer — จำกัดชนิด/ขนาด และตั้งชื่อไฟล์แบบสุ่ม
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

// ที่เก็บไฟล์แนบ ตั้งได้ผ่าน env (ชี้ไป persistent disk ตอน deploy)
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ชนิดไฟล์ที่อนุญาต → นามสกุลที่จะใช้เก็บ (ไม่เชื่อชื่อไฟล์เดิมจากผู้ใช้)
const MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = MIME_EXT[file.mimetype] || '';
    cb(null, crypto.randomBytes(16).toString('hex') + ext);
  },
});

function fileFilter(req, file, cb) {
  if (MIME_EXT[file.mimetype]) cb(null, true);
  else cb(new Error('รองรับเฉพาะไฟล์รูป (JPG/PNG) หรือ PDF เท่านั้น'));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ห่อ upload.single ให้แปลง error ของ multer เป็น JSON 400 (ไม่ตกไปที่ 500)
function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'ไฟล์ใหญ่เกิน 5MB' : err.message;
      return res.status(400).json({ error: msg });
    }
    next();
  });
}

module.exports = { handleUpload, UPLOAD_DIR };
