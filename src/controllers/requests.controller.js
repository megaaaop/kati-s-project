// ตรรกะคำขอลา: ยื่น (F2) + ติดตามสถานะ (F4) + สายอนุมัติ + แจ้งเตือน (Phase 6 async)
const requestModel = require('../models/request.model');
const attachmentModel = require('../models/attachment.model');
const userModel = require('../models/user.model');
const { notify } = require('../services/notify');
const { roleForLevel, labelForLevel, levelForRole, APPROVER_ROLES } = require('../config/approval');

const VALID_TYPES = ['sick', 'personal', 'activity', 'dorm_stay'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ชื่อเอกสารตามประเภท (ใช้ในข้อความแจ้งเตือน): ใบอยู่หอ vs ใบลา
const docLabel = (t) => (t === 'dorm_stay' ? 'ใบอยู่หอ' : 'ใบลา');

// ----- F2: นักเรียนยื่นใบลา -----
async function createRequest(req, res, next) {
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

    const student = await userModel.findById(req.user.id);
    const approvers = await userModel.findApproversForLevel(1, student);
    if (approvers.length === 0) {
      return res.status(409).json({ error: `ยังไม่ได้กำหนดครูประจำชั้นให้คุณ กรุณาติดต่อผู้ดูแลระบบก่อนยื่น${docLabel(leave_type)}` });
    }

    const request = await requestModel.createRequest({
      student_id: req.user.id, leave_type, start_date, end_date, reason: String(reason).trim(),
    });

    const doc = docLabel(leave_type);
    await notify(approvers, {
      request_id: request.id, subject: `มี${doc}รออนุมัติ`,
      message: `นักเรียน ${student.full_name} ยื่น${doc} รอพิจารณา (${labelForLevel(1)})`,
    });
    if (student.parent_id) {
      await notify([student.parent_id], {
        request_id: request.id, subject: `บุตรหลานยื่น${doc}`,
        message: `บุตรหลาน (${student.full_name}) ยื่น${doc}เข้าระบบแล้ว`,
      });
    }
    return res.status(201).json({ request });
  } catch (e) {
    next(e);
  }
}

async function listRequests(req, res, next) {
  try {
    const user = await userModel.findById(req.user.id);
    return res.json({ requests: await requestModel.listForUser(user) });
  } catch (e) {
    next(e);
  }
}

// ----- Export CSV -----
async function exportCsv(req, res, next) {
  try {
    const user = await userModel.findById(req.user.id);
    const rows = await requestModel.listForUser(user);
    const TYPE = { sick: 'ลาป่วย', personal: 'ลากิจ', activity: 'ลากิจกรรม', dorm_stay: 'ใบอยู่หอ' };
    const STAT = { pending: 'รอพิจารณา', approved: 'อนุมัติแล้ว', rejected: 'ไม่อนุมัติ' };
    const esc = (v) => {
      let s = v == null ? '' : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // กัน CSV/formula injection
      return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const header = ['รหัส', 'นักเรียน', 'ห้อง', 'ระดับชั้น', 'ประเภท', 'วันเริ่ม', 'วันสิ้นสุด', 'สถานะ', 'ยื่นเมื่อ'];
    const lines = [header.join(',')];
    for (const r of rows) {
      const name = r.student_name || (user.role === 'student' ? user.full_name : '');
      lines.push([
        r.id, name, r.class_room || '', r.grade_level || '',
        TYPE[r.leave_type] || r.leave_type, r.start_date, r.end_date,
        STAT[r.status] || r.status, r.created_at,
      ].map(esc).join(','));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="leave-requests.csv"');
    return res.send(String.fromCharCode(0xFEFF) + lines.join('\r\n'));
  } catch (e) {
    next(e);
  }
}

// ----- รายละเอียด + ไฟล์แนบ + ประวัติขั้นอนุมัติ -----
async function getRequest(req, res, next) {
  try {
    const request = await requestModel.findDetailById(Number(req.params.id));
    if (!request) return res.status(404).json({ error: 'ไม่พบคำขอ' });
    const viewer = await userModel.findById(req.user.id);
    if (!canView(viewer, request)) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์ดูคำขอนี้' });
    }
    const attachments = (await attachmentModel.listForRequest(request.id))
      .map((a) => ({ id: a.id, file_name: a.file_name, uploaded_at: a.uploaded_at }));
    const steps = await requestModel.stepsForRequest(request.id);
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

// ----- F5: ผู้อนุมัติขั้นปัจจุบันตัดสิน -----
async function decideRequest(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { decision, note } = req.body || {};
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'การตัดสินไม่ถูกต้อง' });
    }
    const request = await requestModel.findById(id);
    if (!request) return res.status(404).json({ error: 'ไม่พบคำขอ' });
    if (request.status !== 'pending') {
      return res.status(409).json({ error: 'คำขอนี้พิจารณาเสร็จแล้ว' });
    }
    const approver = await userModel.findById(req.user.id);
    if (approver.role !== roleForLevel(request.current_level)) {
      return res.status(403).json({ error: 'ยังไม่ถึงคิวพิจารณาของบทบาทคุณ' });
    }
    const student = await userModel.findById(request.student_id);
    if (!requestModel.inScope(approver, { advisor_id: student.advisor_id, grade_level: student.grade_level }, request.current_level)) {
      return res.status(403).json({ error: 'คำขอนี้ไม่อยู่ในความรับผิดชอบของคุณ' });
    }
    const trimmedNote = note ? String(note).trim() : '';
    if (decision === 'rejected' && !trimmedNote) {
      return res.status(400).json({ error: 'กรุณาระบุเหตุผลที่ไม่อนุมัติ' });
    }

    const levelLabel = labelForLevel(request.current_level);
    const updated = await requestModel.recordDecision({ request, approver, decision, note: trimmedNote });
    await notifyDecision({ request, updated, student, decision, note: trimmedNote, levelLabel });
    return res.json({ request: await requestModel.findDetailById(id) });
  } catch (e) {
    next(e);
  }
}

async function notifyDecision({ request, updated, student, decision, note, levelLabel }) {
  const doc = docLabel(request.leave_type);
  if (decision === 'rejected') {
    await notify([student.id], {
      request_id: request.id, subject: `${doc}ไม่อนุมัติ`,
      message: `${doc}ของคุณ "ไม่อนุมัติ" โดย${levelLabel}: ${note}`,
    });
    if (student.parent_id) {
      await notify([student.parent_id], {
        request_id: request.id, subject: `${doc}บุตรหลานไม่อนุมัติ`,
        message: `${doc}ของบุตรหลาน (${student.full_name}) ไม่อนุมัติโดย${levelLabel}`,
      });
    }
    return;
  }

  if (updated.status === 'approved') {
    await notify([student.id], {
      request_id: request.id, subject: `${doc}อนุมัติสมบูรณ์`,
      message: `${doc}ของคุณได้รับอนุมัติครบทุกขั้นแล้ว ✅`,
    });
    if (student.parent_id) {
      await notify([student.parent_id], {
        request_id: request.id, subject: `${doc}บุตรหลานอนุมัติ`,
        message: `${doc}ของบุตรหลาน (${student.full_name}) ได้รับอนุมัติสมบูรณ์`,
      });
    }
    return;
  }

  const nextLevel = updated.current_level;
  const nextLabel = labelForLevel(nextLevel);
  const nextApprovers = await userModel.findApproversForLevel(nextLevel, student);
  if (nextApprovers.length === 0) {
    await notify(await userModel.findByRole('admin'), {
      request_id: request.id, subject: 'ต้องตั้งค่าผู้อนุมัติ',
      message: `คำขอของ ${student.full_name} ค้างที่ขั้น "${nextLabel}" เพราะยังไม่มีผู้อนุมัติระดับนี้ กรุณาตั้งค่าผู้ใช้`,
    });
    console.warn(`⚠️ คำขอ #${request.id} ค้างที่ขั้น ${nextLabel}: ไม่มีผู้อนุมัติในขอบเขต`);
  }
  await notify(nextApprovers, {
    request_id: request.id, subject: `มี${doc}รอพิจารณา`,
    message: `มี${doc}ของนักเรียน ${student.full_name} รอพิจารณา (${nextLabel})`,
  });
  await notify([student.id], {
    request_id: request.id, subject: `ความคืบหน้า${doc}`,
    message: `${doc}ของคุณผ่าน${levelLabel}แล้ว กำลังรอ${nextLabel}`,
  });
}

module.exports = { createRequest, listRequests, exportCsv, getRequest, decideRequest };
