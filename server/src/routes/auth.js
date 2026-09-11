const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  forgotPassword,
  verifyOtp,
  resetPassword,
  registerValidation,
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/register', registerValidation, register);
router.post('/login', login);
router.get('/me', authenticateToken, getMe);

// Password recovery flow
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

module.exports = router;
