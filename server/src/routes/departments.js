const express = require('express');
const router = express.Router();
const { getDepartments, createDepartment, updateDepartment } = require('../controllers/departmentController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.get('/', authenticateToken, getDepartments);
router.post('/', authenticateToken, authorizeRole('ADMIN'), createDepartment);
router.patch('/:id', authenticateToken, authorizeRole('ADMIN'), updateDepartment);

module.exports = router;
