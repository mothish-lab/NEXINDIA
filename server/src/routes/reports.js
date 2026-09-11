const express = require('express');
const router = express.Router();
const { getMyReports, getReportsByIssue } = require('../controllers/reportController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.use(authenticateToken);
router.get('/my', getMyReports);
router.get('/issue/:issueId', authorizeRole('AUTHORITY', 'ADMIN'), getReportsByIssue);

module.exports = router;
