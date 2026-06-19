// ตรรกะคำขอลา: ยื่น (F2) + ติดตามสถานะ (F4) + สายอนุมัติหลายขั้น + แจ้งเตือน (F6)
const requestModel = require('../models/request.model');
const attachmentModel = require('../models/attachment.model');
const userModel = require('../models/user.model');
const { notify } = require('../services/notify');
const { roleForLevel, labelForLevel, levelForRole, APPROVER_ROLES } = require('../config/approval');

const VALID_TYPES = ['sick', 'personal', 'activity'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ----- F2: นักเรียนยื่นใบลา -----
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

    // ต้องมีครูประจำชั้น (ผู้อนุมัติขั้น 1) ก่อน ไม่งั้นคำขอจะค้างเงียบ
    const student = userModel.findById(req.user.id);
    const approvers = userModel.findApproversForLevel(1, student);
    if (approvers.length === 0) {
      return res.status(409).json({ error: 'ยังไม่ได้กำหนดครูประจำชั้นให้คุณ กรุณาติดต่อผู้ดูแลระบบก่อนยื่นใบลา' });
    }

    const request = requestModel.createRequest({
      student_id: req.user.id, leave_type, start_date, end_date, reason: String(reason).trim(),
    });

    // แจ้งครูประจำชั้น (ขั้น 1) + ผู้ปกครอง
    notify(approvers, {
      request_id: request.id,
      subject: 'มีใบลารออนุมัติ',
      message: `นักเรียน ${student.full_name} ยื่นใบลา รอพิจารณา (${labelForLevel(1)})`,
    });
    if (student.parent_id) {
      notify([student.parent_id], {
        request_id: request.id,
        subject: 'บุตรหลานยื่นใบลา',
        message: `บุตรหลาน (${student.full_name}) ยื่นใบลาเข้าระบบแล้ว`,
      });
    }
    return res.status(201).json({ request });
  } catch (e) {
    next(e);
  }
}

// ----- รายการคำขอ (กรองตามบทบาทในโมเดล) -----
function listRequests(req, res, next) {
  try {
    // โหลด user เต็ม (JWT ไม่มี grade_level ที่จำเป็นต่อการกรองขอบเขต)
    const user = userModel.findById(req.user.id);
    return res.json({ requests: requestModel.listForUser(user) });
  } catch (e) {
    next(e);
  }
}

// ----- รายละเอียดคำขอ + ไฟล์แนบ + ประวัติขั้นอนุมัติ -----
function getRequest(req, res, next) {
  try {
    const request = requestModel.findDetailById(Number(req.params.id));
    if (!request) return res.status(404).json({ error: 'ไม่พบคำขอ' });
    const viewer = userModel.findById(req.user.id);
    if (!canView(viewer, request)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์ดูคำขอนี้' });
    }
    const attachments = attachmentModel.listForRequest(request.id)
      .map((a) => ({ id: a.id, file_name: a.file_name, uploaded_at: a.uploaded_at }));
    const steps = requestModel.stepsForRequest(request.id);
    return res.json({ request, attachments, steps });
  } catch (e) {
    next(e);
  }
}

function canView(user, r) {
  if (user.role === 'admin') return true;
  if (user.role === 'student') return r.student_id === user.id;
  if (user.role === 'parent') return r.parent_id === user.id;
  if (APPROVER_ROLES.includes(user.role)) {
    return requestModel.inScope(user, { advisor_id: r.advisor_id, grade_level: r.grade_level }, levelForRole(user.role));
  }
  return false;
}

// ----- F5 ใหม่: ผู้อนุมัติขั้นปัจจุบันตัดสิน (อนุมัติ=เลื่อนขั้น / ปฏิเสธ=จบ) -----
function decideRequest(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { decision, note } = req.body || {};
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'การตัดสินไม่ถูกต้อง' });
    }

    const request = requestModel.findById(id);
    if (!request) return res.status(404).json({ error: 'ไม่พบคำขอ' });
    if (request.status !== 'pending') {
      return res.status(409).json({ error: 'คำขอนี้พิจารณาเสร็จแล้ว' });
    }

    // โหลดผู้อนุมัติเต็ม (JWT ไม่มี grade_level)
    const approver = userModel.findById(req.user.id);
    // บทบาทต้องตรงกับขั้นปัจจุบัน
    if (approver.role !== roleForLevel(request.current_level)) {
      return res.status(403).json({ error: 'ยังไม่ถึงคิวพิจารณาของบทบาทคุณ' });
    }
    // ต้องอยู่ในขอบเขต (ที่ปรึกษา/ระดับชั้น) ของคำขอนี้
    const student = userModel.findById(request.student_id);
    if (!requestModel.inScope(approver, { advisor_id: student.advisor_id, grade_level: student.grade_level }, request.current_level)) {
      return res.status(403).json({ error: 'คำขอนี้ไม่อยู่ในความรับผิดชอบของคุณ' });
    }

    const trimmedNote = note ? String(note).trim() : '';
    if (decision === 'rejected' && !trimmedNote) {
      return res.status(400).json({ error: 'กรุณาระบุเหตุผลที่ไม่อนุมัติ' });
    }

    const levelLabel = labelForLevel(request.current_level);
    const updated = requestModel.recordDecision({ request, approver, decision, note: trimmedNote });

    notifyDecision({ request, updated, student, decision, note: trimmedNote, levelLabel });
    return res.json({ request: requestModel.findDetailById(id) });
  } catch (e) {
    next(e);
  }
}

function notifyDecision({ request, updated, student, decision, note, levelLabel }) {
  if (decision === 'rejected') {
    notify([student.id], {
      request_id: request.id, subject: 'ใบลาไม่อนุมัติ',
      message: `ใบลาของคุณ "ไม่อนุมัติ" โดย${levelLabel}: ${note}`,
    });
    if (student.parent_id) {
      notify([student.parent_id], {
        request_id: request.id, subject: 'ใบลาบุตรหลานไม่อนุมัติ',
        message: `ใบลาของบุตรหลาน (${student.full_name}) ไม่อนุมัติโดย${levelLabel}`,
      });
    }
    return;
  }

  if (updated.status === 'approved') {
    // ผ่านครบทุกขั้น
    notify([student.id], {
      request_id: request.id, subject: 'ใบลาอนุมัติสมบูรณ์',
      message: 'ใบลาของคุณได้รับอนุมัติครบทุกขั้นแล้ว ✅',
    });
    if (student.parent_id) {
      notify([student.parent_id], {
        request_id: request.id, subject: 'ใบลาบุตรหลานอนุมัติ',
        message: `ใบลาของบุตรหลาน (${student.full_name}) ได้รับอนุมัติสมบูรณ์`,
      });
    }
    return;
  }

  // เลื่อนไปขั้นถัดไป — แจ้งผู้อนุมัติขั้นถัดไป + นักเรียน
  const nextLevel = updated.current_level;
  const nextLabel = labelForLevel(nextLevel);
  const nextApprovers = userModel.findApproversForLevel(nextLevel, student);
  if (nextApprovers.length === 0) {
    // ไม่มีผู้อนุมัติขั้นถัดไป — แจ้งแอดมินให้ตั้งค่า แทนที่จะปล่อยค้างเงียบ
    notify(userModel.findByRole('admin'), {
      request_id: request.id, subject: 'ต้องตั้งค่าผู้อนุมัติ',
      message: `คำขอของ ${student.full_name} ค้างที่ขั้น "${nextLabel}" เพราะยังไม่มีผู้อนุมัติระดับนี้ กรุณาตั้งค่าผู้ใช้`,
    });
    console.warn(`⚠️ คำขอ #${request.id} ค้างที่ขั้น ${nextLabel}: ไม่มีผู้อนุมัติในขอบเขต`);
  }
  notify(nextApprovers, {
    request_id: request.id, subject: 'มีใบลารอพิจารณา',
    message: `มีใบลาของนักเรียน ${student.full_name} รอพิจารณา (${nextLabel})`,
  });
  notify([student.id], {
    request_id: request.id, subject: 'ความคืบหน้าใบลา',
    message: `ใบลาของคุณผ่าน${levelLabel}แล้ว กำลังรอ${nextLabel}`,
  });
}

module.exports = { createRequest, listRequests, getRequest, decideRequest };
