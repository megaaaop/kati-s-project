const express = require('express');
const ctrl = require('../controllers/requests.controller');
const attachCtrl = require('../controllers/attachments.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { handleUpload } = require('../middleware/upload.middleware');

const router = express.Router();

// ทุก endpoint ต้องล็อกอินก่อน
router.use(verifyToken);

router.post('/', requireRole('student'), ctrl.createRequest); // เฉพาะนักเรียนยื่น
router.get('/', ctrl.listRequests);                           // กรองตาม role ในโมเดล
router.get('/:id', ctrl.getRequest);

// F5 ครูอนุมัติ/ปฏิเสธ
router.put('/:id/approve', requireRole('teacher'), ctrl.approveRequest);
router.put('/:id/reject', requireRole('teacher'), ctrl.rejectRequest);

// F3 นักเรียนแนบไฟล์หลักฐานกับคำขอ
router.post('/:id/attachments', requireRole('student'), handleUpload, attachCtrl.uploadAttachment);

module.exports = router;
