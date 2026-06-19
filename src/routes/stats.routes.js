const express = require('express');
const ctrl = require('../controllers/stats.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { APPROVER_ROLES } = require('../config/approval');

const router = express.Router();

// ดูสถิติได้: แอดมิน + ผู้อนุมัติทุกระดับ (กรองขอบเขตในโมเดล)
router.use(verifyToken, requireRole('admin', ...APPROVER_ROLES));
router.get('/', ctrl.getStats);

module.exports = router;
