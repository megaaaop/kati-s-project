// ตรรกะคำขอลา (F2 ยื่นใบลา + F4 ดูสถานะ/ประวัติ + F5 อนุมัติ/ปฏิเสธ)
const requestModel = require('../models/request.model');
const attachmentModel = require('../models/attachment.model');

const VALID_TYPES = ['sick', 'personal', 'activity'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function createRequest(req, res, next) {
  try {
    const { leave_type, start_date, end_date, reason } = req.body || {};

    if (!leave_type || !start_date || !end_date || !reason) {
      return res.status(400).json({ error: 'กรอกข้อมูลให้ครบทุกช่อง' });
    }
    if (!VALID_TYPES.includes(leave_type)) {
      return res.status(400).json({ error: 'ประเภทการลาไม่ถูกต้อง' });
    }
    if (!DATE_RE.test(start_date) || !DATE_RE.test(end_date)) {
      return res.status(400).json({ error: 'รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)' });
    }
    if (start_date > end_date) {
      return res.status(400).json({ error: 'วันที่เริ่มต้องไม่เกินวันที่สิ้นสุด' });
    }

    const request = requestModel.createRequest({
      student_id: req.user.id,
      leave_type,
      start_date,
      end_date,
      reason: String(reason).trim(),
    });
    return res.status(201).json({ request });
  } catch (e) {
    next(e);
  }
}

function listRequests(req, res, next) {
  try {
    const requests = requestModel.listForUser(req.user);
    return res.json({ requests });
  } catch (e) {
    next(e);
  }
}

function getRequest(req, res, next) {
  try {
    const request = requestModel.findDetailById(Number(req.params.id));
    if (!request) {
      return res.status(404).json({ error: 'ไม่พบคำขอ' });
    }
    // นักเรียนดูได้เฉพาะคำขอของตัวเอง (ครู/แอดมินดูได้ทั้งหมด)
    if (req.user.role === 'student' && request.student_id !== req.user.id) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์ดูคำขอนี้' });
    }
    const attachments = attachmentModel.listForRequest(request.id)
      .map((a) => ({ id: a.id, file_name: a.file_name, uploaded_at: a.uploaded_at }));
    return res.json({ request, attachments });
  } catch (e) {
    next(e);
  }
}

// F5: ครูอนุมัติ/ปฏิเสธ — ใช้ตัวเดียวกัน ต่างกันที่ค่า status
function reviewRequest(status) {
  return (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const request = requestModel.findById(id);
      if (!request) {
        return res.status(404).json({ error: 'ไม่พบคำขอ' });
      }
      if (request.status !== 'pending') {
        return res.status(409).json({ error: 'คำขอนี้ถูกพิจารณาไปแล้ว' });
      }
      const teacher_note = req.body && req.body.teacher_note ? String(req.body.teacher_note).trim() : '';
      if (status === 'rejected' && !teacher_note) {
        return res.status(400).json({ error: 'กรุณาระบุเหตุผลที่ไม่อนุมัติ' });
      }
      const updated = requestModel.updateReview({ id, status, teacher_note, reviewed_by: req.user.id });
      return res.json({ request: updated });
    } catch (e) {
      next(e);
    }
  };
}

const approveRequest = reviewRequest('approved');
const rejectRequest = reviewRequest('rejected');

module.exports = { createRequest, listRequests, getRequest, approveRequest, rejectRequest };
