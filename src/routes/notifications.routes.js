const express = require('express');
const ctrl = require('../controllers/notifications.controller');
const { verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(verifyToken);
router.get('/', ctrl.list);
router.put('/read-all', ctrl.markAll);
router.put('/:id/read', ctrl.markRead);

module.exports = router;
