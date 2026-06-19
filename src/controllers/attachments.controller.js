// ตรรกะแนบไฟล์ + เปิดดูไฟล์ (F3)
const path = require('path');
const fs = require('fs');
const requestModel = require('../models/request.model');
const attachmentModel = require('../models/attachment.model');
const userModel = require('../models/user.model');
const { UPLOAD_DIR } = require('../middleware/upload.middleware');
const { APPROVER_ROLES, levelForRole } = require('../config/approval');

const MAX_ATTACHMENTS = 5; // จำกัดจำนวนไฟล์ต่อคำขอ (กัน disk-fill)

// ตรวจ "ลายเซ็นไบต์" จริงของไฟล์ ไม่เชื่อ Content-Type ที่ client ส่งมา
const SIGNATURES = [
  [0x25, 0x50, 0x44, 0x46],       // %PDF
  [0x89, 0x50, 0x4e, 0x47],       // PNG
  [0xff, 0xd8, 0xff],             // JPEG
];

function hasAllowedSignature(filePath) {
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(8);
    fs.readSync(fd, buf, 0, 8, 0);
    return SIGNATURES.some((sig) => sig.every((b, i) => buf[i] === b));
  } catch (_) {
    return false;
  } finally {
    if (fd !== undefined) { try { fs.closeSync(fd); } catch (_) { /* ignore */ } }
  }
}

// ลบไฟล์ที่ multer เพิ่งเซฟ ถ้าตรวจสิทธิ์ไม่ผ่าน (กันไฟล์ขยะค้าง)
function cleanup(file) {
  if (file && file.path) {
    try { fs.unlinkSync(file.path); } catch (_) { /* ignore */ }
  }
}

// POST /api/requests/:id/attachments — เฉพาะเจ้าของคำขอ + คำขอต้องเป็น pending
function uploadAttachment(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'ไม่พบไฟล์ที่อัปโหลด' });

    const id = Number(req.params.id);
    const request = requestModel.findById(id);
    if (!request) {
      cleanup(req.file);
      return res.status(404).json({ error: 'ไม่พบคำขอ' });
    }
    if (request.student_id !== req.user.id) {
      cleanup(req.file);
      return res.status(403).json({ error: 'ไม่มีสิทธิ์แนบไฟล์กับคำขอนี้' });
    }
    if (request.status !== 'pending') {
      cleanup(req.file);
      return res.status(409).json({ error: 'แนบไฟล์ได้เฉพาะคำขอที่ยังรออนุมัติ' });
    }
    if (attachmentModel.listForRequest(id).length >= MAX_ATTACHMENTS) {
      cleanup(req.file);
      return res.status(409).json({ error: 'แนบไฟล์ได้สูงสุด ' + MAX_ATTACHMENTS + ' ไฟล์ต่อคำขอ' });
    }
    // ตรวจไบต์จริง ไม่เชื่อ mimetype ที่ client ส่ง (กันไฟล์ปลอมนามสกุล)
    if (!hasAllowedSignature(req.file.path)) {
      cleanup(req.file);
      return res.status(400).json({ error: 'ไฟล์ไม่ใช่รูป (JPG/PNG) หรือ PDF ที่ถูกต้อง' });
    }

    // multer/busboy ถอดชื่อไฟล์ในส่วน multipart เป็น latin1 → แปลงกลับเป็น utf8 ให้ชื่อไทยถูกต้อง
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

    const attachment = attachmentModel.createAttachment({
      request_id: id,
      file_name: originalName,        // ชื่อเดิมไว้แสดงผล
      file_path: req.file.filename,    // ชื่อไฟล์ที่เก็บใน uploads (สุ่ม)
    });
    return res.status(201).json({
      attachment: { id: attachment.id, file_name: attachment.file_name, uploaded_at: attachment.uploaded_at },
    });
  } catch (e) {
    cleanup(req.file);
    next(e);
  }
}

// GET /api/attachments/:id/download — เจ้าของคำขอ หรือ ครู/แอดมิน เท่านั้น
function downloadAttachment(req, res, next) {
  try {
    const att = attachmentModel.findById(Number(req.params.id));
    if (!att) return res.status(404).json({ error: 'ไม่พบไฟล์' });

    const detail = requestModel.findDetailById(att.request_id);
    if (!detail) return res.status(404).json({ error: 'ไม่พบคำขอ' });

    // ใช้กติกาสิทธิ์เดียวกับการดูรายละเอียดคำขอ: เจ้าของ / ผู้ปกครอง / แอดมิน / ผู้อนุมัติในขอบเขต
    const viewer = userModel.findById(req.user.id);
    const isOwner = detail.student_id === viewer.id;
    const isParent = viewer.role === 'parent' && detail.parent_id === viewer.id;
    const isAdmin = viewer.role === 'admin';
    const isApproverInScope = APPROVER_ROLES.includes(viewer.role) &&
      requestModel.inScope(viewer, { advisor_id: detail.advisor_id, grade_level: detail.grade_level }, levelForRole(viewer.role));
    if (!isOwner && !isParent && !isAdmin && !isApproverInScope) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เปิดไฟล์นี้' });
    }

    // กัน path traversal: ใช้แค่ basename จาก DB แล้วยืนยันว่าอยู่ใน UPLOAD_DIR จริง
    const safeName = path.basename(att.file_path);
    const fullPath = path.join(UPLOAD_DIR, safeName);
    if (fullPath !== path.join(UPLOAD_DIR, safeName) || !fullPath.startsWith(UPLOAD_DIR + path.sep)) {
      return res.status(400).json({ error: 'เส้นทางไฟล์ไม่ถูกต้อง' });
    }
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'ไฟล์หายไปจากระบบ' });

    // กันเบราว์เซอร์เดา content-type เอง (กัน MIME sniffing)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // ชื่อไฟล์ UTF-8 สำหรับ header (RFC 5987)
    res.setHeader('Content-Disposition', "inline; filename*=UTF-8''" + encodeURIComponent(att.file_name));
    return res.sendFile(fullPath); // Express ตั้ง Content-Type ตามนามสกุลไฟล์ให้เอง
  } catch (e) {
    next(e);
  }
}

module.exports = { uploadAttachment, downloadAttachment };
