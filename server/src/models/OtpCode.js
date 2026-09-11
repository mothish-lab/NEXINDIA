const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const otpCodeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Hashed OTP — never store plaintext
  codeHash: {
    type: String,
    required: true,
    select: false,
  },
  type: {
    type: String,
    enum: ['FORGOT_PASSWORD'],
    default: 'FORGOT_PASSWORD',
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  used: {
    type: Boolean,
    default: false,
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5,
  },
  // For rate limiting: track IP or identifier
  requestedFor: {
    type: String, // email or phone
    required: true,
  },
}, { timestamps: true });

// Auto-expire documents via MongoDB TTL index
otpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpCodeSchema.index({ userId: 1, type: 1 });
otpCodeSchema.index({ requestedFor: 1, createdAt: -1 });

/**
 * Hash and set the OTP code.
 */
otpCodeSchema.methods.setCode = async function (plainCode) {
  this.codeHash = await bcrypt.hash(plainCode, 10);
};

/**
 * Compare a plaintext code to the stored hash.
 */
otpCodeSchema.methods.compareCode = async function (plainCode) {
  return bcrypt.compare(plainCode, this.codeHash);
};

module.exports = mongoose.model('OtpCode', otpCodeSchema);
