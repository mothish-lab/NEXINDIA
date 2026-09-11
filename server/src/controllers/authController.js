const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const OtpCode = require('../models/OtpCode');

const SALT_ROUNDS = 12;
const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RATE_LIMIT_MINUTES = 2; // min gap between OTP requests

/**
 * Generate a cryptographically secure 6-digit OTP.
 */
function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

// ─── Validation middleware ────────────────────────────────────────────────────

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').optional().trim().isLength({ max: 20 }),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register — CITIZEN self-registration only
 */
async function register(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, phone, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({
      name,
      email,
      phone: phone || '',
      passwordHash,
      role: 'CITIZEN', // always CITIZEN — never trust client-provided role
    });

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        department: user.department,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me — Return current user profile
 */
async function getMe(req, res) {
  res.json({ success: true, user: req.user });
}

/**
 * POST /api/auth/forgot-password
 * Enumerate-safe: always responds with the same message regardless of whether
 * the email exists. OTP is logged to console in development.
 */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Enumerate-safe: always say "If this email exists, you'll receive an OTP"
    const genericResponse = {
      success: true,
      message: 'If an account with that email exists, an OTP has been sent.',
    };

    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !user.isActive) {
      // Don't reveal whether the account exists
      return res.json(genericResponse);
    }

    // Rate limiting: check if a recent OTP was already sent
    const recentCutoff = new Date(Date.now() - OTP_RATE_LIMIT_MINUTES * 60 * 1000);
    const recentOtp = await OtpCode.findOne({
      requestedFor: normalizedEmail,
      type: 'FORGOT_PASSWORD',
      createdAt: { $gte: recentCutoff },
    });
    if (recentOtp) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${OTP_RATE_LIMIT_MINUTES} minutes before requesting another OTP.`,
      });
    }

    // Invalidate any existing OTPs for this user
    await OtpCode.updateMany(
      { userId: user._id, type: 'FORGOT_PASSWORD', used: false },
      { used: true }
    );

    // Generate and store new OTP
    const plainOtp = generateOtp();
    const otp = new OtpCode({
      userId: user._id,
      type: 'FORGOT_PASSWORD',
      requestedFor: normalizedEmail,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
    });
    await otp.setCode(plainOtp);
    await otp.save();

    // In production: send via email/SMS provider configured via env vars
    // In development: log to console (never log in production)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n🔐 OTP for ${normalizedEmail}: ${plainOtp} (expires in ${OTP_EXPIRY_MINUTES} min)\n`);
    }

    // If email provider configured, send email
    if (process.env.EMAIL_PROVIDER && process.env.EMAIL_API_KEY) {
      // Provider abstraction — add real email sending here
      // await sendOtpEmail(normalizedEmail, plainOtp, user.name);
    }

    res.json(genericResponse);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/verify-otp
 * Verifies the OTP and returns a short-lived reset token.
 */
async function verifyOtp(req, res, next) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Generic error to prevent enumeration
    const invalidMsg = 'Invalid or expired OTP';

    if (!user) {
      return res.status(400).json({ success: false, message: invalidMsg });
    }

    // Find the most recent unused, unexpired OTP
    const otpRecord = await OtpCode.findOne({
      userId: user._id,
      type: 'FORGOT_PASSWORD',
      used: false,
      expiresAt: { $gt: new Date() },
    }).select('+codeHash').sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: invalidMsg });
    }

    // Check attempt limit
    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      otpRecord.used = true;
      await otpRecord.save();
      return res.status(429).json({ success: false, message: 'Too many attempts. Request a new OTP.' });
    }

    // Increment attempts before verifying
    otpRecord.attempts += 1;
    await otpRecord.save();

    const isValid = await otpRecord.compareCode(String(otp).trim());
    if (!isValid) {
      const remaining = OTP_MAX_ATTEMPTS - otpRecord.attempts;
      return res.status(400).json({
        success: false,
        message: `${invalidMsg}. ${remaining} attempt(s) remaining.`,
      });
    }

    // Mark OTP as used
    otpRecord.used = true;
    await otpRecord.save();

    // Issue a short-lived reset token (10 min)
    const resetToken = jwt.sign(
      { userId: user._id, purpose: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    res.json({
      success: true,
      message: 'OTP verified. You may now reset your password.',
      resetToken,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/reset-password
 * Requires valid resetToken from verifyOtp step.
 */
async function resetPassword(req, res, next) {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'Reset token and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({ success: false, message: 'Invalid reset token' });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await User.findByIdAndUpdate(decoded.userId, { passwordHash });

    res.json({ success: true, message: 'Password reset successful. You may now log in.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  getMe,
  forgotPassword,
  verifyOtp,
  resetPassword,
  registerValidation,
};
