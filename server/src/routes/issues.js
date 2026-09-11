const express = require('express');
const router = express.Router();
const {
  createIssue, getIssues, getIssueById, assignIssue, updateStatus,
  submitResolution, verifyResolution, deleteIssue, checkDuplicate,
  getIssuesForMap, getStats, getIssueHistory, getNearbyPublic,
} = require('../controllers/issueController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// ─── Public endpoints (no auth required) ─────────────────────────────────────
router.get('/public/nearby', getNearbyPublic);
router.get('/public/stats', getStats); // reuse stats but without auth filter

// ─── All other issue routes require authentication ────────────────────────────
router.use(authenticateToken);

// Stats (must be before /:id to avoid conflict)
router.get('/stats', getStats);
router.get('/map', getIssuesForMap);
router.post('/check-duplicate', checkDuplicate);

// Main CRUD
router.post('/', upload.single('image'), createIssue);
router.get('/', getIssues);
router.get('/:id', getIssueById);
router.get('/:id/history', getIssueHistory);
router.delete('/:id', authorizeRole('ADMIN'), deleteIssue);

// Authority actions
router.patch('/:id/assign', authorizeRole('AUTHORITY', 'ADMIN'), assignIssue);
router.patch('/:id/status', authorizeRole('AUTHORITY', 'ADMIN'), updateStatus);

// Resolution workflow
router.post('/:id/resolution', authorizeRole('AUTHORITY', 'ADMIN'), upload.single('image'), submitResolution);
router.post('/:id/verify', authorizeRole('CITIZEN'), verifyResolution);

module.exports = router;
