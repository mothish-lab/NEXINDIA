const express = require('express');
const router = express.Router();
const { getEscalations, processEscalations, manualEscalate } = require('../controllers/escalationController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.use(authenticateToken);
router.get('/', authorizeRole('AUTHORITY', 'ADMIN'), getEscalations);
router.post('/process', authorizeRole('ADMIN'), processEscalations);
router.post('/manual', authorizeRole('ADMIN'), manualEscalate);

module.exports = router;
