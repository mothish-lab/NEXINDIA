const express = require('express');
const router = express.Router();
const { fastForward, getDemoStatus } = require('../controllers/demoController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Demo routes require admin authentication
router.use(authenticateToken, authorizeRole('ADMIN'));
router.post('/fast-forward', fastForward);
router.get('/status', getDemoStatus);

module.exports = router;
