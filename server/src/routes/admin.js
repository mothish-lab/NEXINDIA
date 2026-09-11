const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser, getAnalytics } = require('../controllers/adminController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.use(authenticateToken, authorizeRole('ADMIN'));
router.get('/users', getUsers);
router.post('/users', createUser);
router.patch('/users/:id', updateUser);
router.get('/analytics', getAnalytics);

module.exports = router;
