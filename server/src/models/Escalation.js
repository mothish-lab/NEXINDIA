const mongoose = require('mongoose');

const escalationSchema = new mongoose.Schema({
  issueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Issue',
    required: true,
  },
  fromLevel: {
    type: Number,
    required: true,
    min: 0,
  },
  toLevel: {
    type: Number,
    required: true,
    min: 1,
  },
  reason: {
    type: String,
    required: true,
  },
  escalatedBy: {
    type: String,
    default: 'SYSTEM',
  },
}, { timestamps: true });

escalationSchema.index({ issueId: 1 });
escalationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Escalation', escalationSchema);
