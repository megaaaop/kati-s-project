const express = require('express');
const ctrl = require('../controllers/requests.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

// ทุก endpoint ต้องล็อกอินก่อน
router.use(verifyToken);

router.post('/', requireRole('student'), ctrl.createRequest); // เฉพาะนักเรียนยื่น
router.get('/', ctrl.listRequests);                           // กรองตาม role ในโมเดล
router.get('/:id', ctrl.getRequest);

module.exports = router;
