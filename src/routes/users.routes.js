const express = require('express');
const ctrl = require('../controllers/users.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

// เฉพาะแอดมิน
router.use(verifyToken, requireRole('admin'));

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
