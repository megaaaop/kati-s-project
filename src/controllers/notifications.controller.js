// ตรรกะการแจ้งเตือน (F6)
const notificationModel = require('../models/notification.model');

function list(req, res, next) {
  try {
    return res.json({
      notifications: notificationModel.listForUser(req.user.id),
      unread: notificationModel.unreadCount(req.user.id),
    });
  } catch (e) { next(e); }
}

function markRead(req, res, next) {
  try {
    notificationModel.markRead(Number(req.params.id), req.user.id);
    return res.json({ ok: true });
  } catch (e) { next(e); }
}

function markAll(req, res, next) {
  try {
    notificationModel.markAllRead(req.user.id);
    return res.json({ ok: true });
  } catch (e) { next(e); }
}

module.exports = { list, markRead, markAll };
