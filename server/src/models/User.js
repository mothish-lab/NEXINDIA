const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: 100,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
  },
  phone: {
    type: String,
    trim: true,
    maxlength: 20,
  },
  passwordHash: {
    type: String,
    required: true,
    select: false, // never expose by default
  },
  role: {
    type: String,
    enum: ['CITIZEN', 'AUTHORITY', 'ADMIN'],
    default: 'CITIZEN',
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

// Never return passwordHash in JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

// Index for fast role lookup (email index is already created by unique:true)
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
