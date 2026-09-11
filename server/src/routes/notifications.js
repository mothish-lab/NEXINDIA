const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead } = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);
router.get('/', getNotifications);
router.patch('/read-all', markAsRead);

module.exports = router;
