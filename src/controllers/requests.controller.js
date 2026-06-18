// ตรรกะคำขอลา (F2 ยื่นใบลา + F4 ดูสถานะ/ประวัติเบื้องต้น)
const requestModel = require('../models/request.model');

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
    const request = requestModel.findById(Number(req.params.id));
    if (!request) {
      return res.status(404).json({ error: 'ไม่พบคำขอ' });
    }
    // นักเรียนดูได้เฉพาะคำขอของตัวเอง
    if (req.user.role === 'student' && request.student_id !== req.user.id) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์ดูคำขอนี้' });
    }
    return res.json({ request });
  } catch (e) {
    next(e);
  }
}

module.exports = { createRequest, listRequests, getRequest };
