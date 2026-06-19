// ตรรกะการแจ้งเตือน (F6) — Phase 6 async
const notificationModel = require('../models/notification.model');

async function list(req, res, next) {
  try {
    return res.json({
      notifications: await notificationModel.listForUser(req.user.id),
      unread: await notificationModel.unreadCount(req.user.id),
    });
  } catch (e) { next(e); }
}

async function markRead(req, res, next) {
  try {
    await notificationModel.markRead(Number(req.params.id), req.user.id);
    return res.json({ ok: true });
  } catch (e) { next(e); }
}

async function markAll(req, res, next) {
  try {
    await notificationModel.markAllRead(req.user.id);
    return res.json({ ok: true });
  } catch (e) { next(e); }
}

module.exports = { list, markRead, markAll };
