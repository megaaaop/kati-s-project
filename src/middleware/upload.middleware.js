// รับไฟล์แนบ (F3) ด้วย Multer — เก็บใน memory (buffer) แล้วส่งต่อให้ storage service
const multer = require('multer');

// ชนิดไฟล์ที่อนุญาต → นามสกุลที่จะใช้เก็บ (ไม่เชื่อชื่อไฟล์เดิมจากผู้ใช้)
const MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf',
};

function fileFilter(req, file, cb) {
  if (MIME_EXT[file.mimetype]) cb(null, true);
  else cb(new Error('รองรับเฉพาะไฟล์รูป (JPG/PNG) หรือ PDF เท่านั้น'));
}

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ห่อ upload.single ให้แปลง error ของ multer เป็น JSON 400
function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'ไฟล์ใหญ่เกิน 5MB' : err.message;
      return res.status(400).json({ error: msg });
    }
    next();
  });
}

module.exports = { handleUpload, MIME_EXT };
