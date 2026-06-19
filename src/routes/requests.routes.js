const express = require('express');
const ctrl = require('../controllers/requests.controller');
const attachCtrl = require('../controllers/attachments.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { handleUpload } = require('../middleware/upload.middleware');
const { APPROVER_ROLES } = require('../config/approval');

const router = express.Router();

router.use(verifyToken);

router.post('/', requireRole('student'), ctrl.createRequest); // เฉพาะนักเรียนยื่น
router.get('/', ctrl.listRequests);                           // กรองตาม role ในโมเดล
router.get('/:id', ctrl.getRequest);

// สายอนุมัติหลายขั้น: ผู้อนุมัติขั้นปัจจุบันตัดสิน (อนุมัติ/ปฏิเสธ)
router.put('/:id/decide', requireRole(...APPROVER_ROLES), ctrl.decideRequest);

// F3 นักเรียนแนบไฟล์หลักฐาน
router.post('/:id/attachments', requireRole('student'), handleUpload, attachCtrl.uploadAttachment);

module.exports = router;
