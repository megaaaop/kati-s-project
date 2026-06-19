// ตรรกะแนบไฟล์ + เปิดดูไฟล์ (F3) — Phase 6: เก็บผ่าน storage service (Supabase/local/memory)
const path = require('path');
const requestModel = require('../models/request.model');
const attachmentModel = require('../models/attachment.model');
const userModel = require('../models/user.model');
const storage = require('../services/storage');
const { MIME_EXT } = require('../middleware/upload.middleware');
const { APPROVER_ROLES, levelForRole } = require('../config/approval');

const MAX_ATTACHMENTS = 5;

// ตรวจ "ลายเซ็นไบต์" จริง ไม่เชื่อ Content-Type ที่ client ส่ง
const SIGNATURES = [
  [0x25, 0x50, 0x44, 0x46],       // %PDF
  [0x89, 0x50, 0x4e, 0x47],       // PNG
  [0xff, 0xd8, 0xff],             // JPEG
];
function hasAllowedSignature(buf) {
  return SIGNATURES.some((sig) => sig.every((b, i) => buf[i] === b));
}
const EXT_CT = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg' };

// POST /api/requests/:id/attachments — เฉพาะเจ้าของคำขอ + คำขอต้องเป็น pending
async function uploadAttachment(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'ไม่พบไฟล์ที่อัปโหลด' });

    const id = Number(req.params.id);
    const request = await requestModel.findById(id);
    if (!request) return res.status(404).json({ error: 'ไม่พบคำขอ' });
    if (request.student_id !== req.user.id) return res.status(403).json({ error: 'ไม่มีสิทธิ์แนบไฟล์กับคำขอนี้' });
    if (request.status !== 'pending') return res.status(409).json({ error: 'แนบไฟล์ได้เฉพาะคำขอที่ยังรออนุมัติ' });
    if ((await attachmentModel.listForRequest(id)).length >= MAX_ATTACHMENTS) {
      return res.status(409).json({ error: 'แนบไฟล์ได้สูงสุด ' + MAX_ATTACHMENTS + ' ไฟล์ต่อคำขอ' });
    }

    const buffer = req.file.buffer;
    if (!hasAllowedSignature(buffer)) {
      return res.status(400).json({ error: 'ไฟล์ไม่ใช่รูป (JPG/PNG) หรือ PDF ที่ถูกต้อง' });
    }

    const ext = MIME_EXT[req.file.mimetype] || '';
    const key = storage.newKey(ext);
    await storage.put(key, buffer, req.file.mimetype);

    // multer ถอดชื่อไฟล์เป็น latin1 → แปลงกลับเป็น utf8
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const attachment = await attachmentModel.createAttachment({
      request_id: id, file_name: originalName, file_path: key,
    });
    return res.status(201).json({
      attachment: { id: attachment.id, file_name: attachment.file_name, uploaded_at: attachment.uploaded_at },
    });
  } catch (e) {
    next(e);
  }
}

// GET /api/attachments/:id/download — เจ้าของ/ผู้ปกครอง/แอดมิน/ผู้อนุมัติในขอบเขต
async function downloadAttachment(req, res, next) {
  try {
    const att = await attachmentModel.findById(Number(req.params.id));
    if (!att) return res.status(404).json({ error: 'ไม่พบไฟล์' });

    const detail = await requestModel.findDetailById(att.request_id);
    if (!detail) return res.status(404).json({ error: 'ไม่พบคำขอ' });

    const viewer = await userModel.findById(req.user.id);
    const isOwner = detail.student_id === viewer.id;
    const isParent = viewer.role === 'parent' && detail.parent_id === viewer.id;
    const isAdmin = viewer.role === 'admin';
    const isApproverInScope = APPROVER_ROLES.includes(viewer.role) &&
      requestModel.inScope(viewer, { advisor_id: detail.advisor_id, grade_level: detail.grade_level }, levelForRole(viewer.role));
    if (!isOwner && !isParent && !isAdmin && !isApproverInScope) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เปิดไฟล์นี้' });
    }

    let buffer;
    try {
      buffer = await storage.get(att.file_path);
    } catch (_) {
      return res.status(404).json({ error: 'ไฟล์หายไปจากระบบ' });
    }
    const ext = path.extname(att.file_path).toLowerCase();
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', EXT_CT[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', "inline; filename*=UTF-8''" + encodeURIComponent(att.file_name));
    return res.send(buffer);
  } catch (e) {
    next(e);
  }
}

module.exports = { uploadAttachment, downloadAttachment };
