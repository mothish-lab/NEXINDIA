const Notification = require('../models/Notification');

async function getNotifications(req, res, next) {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .populate('issueId', 'ticketId title')
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({ userId: req.user._id, read: false });
    res.json({ success: true, data: notifications, unreadCount });
  } catch (err) {
    next(err);
  }
}

async function markAsRead(req, res, next) {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getNotifications, markAsRead };
