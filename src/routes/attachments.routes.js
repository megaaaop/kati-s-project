const express = require('express');
const ctrl = require('../controllers/attachments.controller');
const { verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(verifyToken);
router.get('/:id/download', ctrl.downloadAttachment);

module.exports = router;
