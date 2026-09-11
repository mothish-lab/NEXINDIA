const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  issueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Issue',
    default: null,
  },
  type: {
    type: String,
    enum: [
      'ISSUE_CREATED',
      'ISSUE_CLASSIFIED',
      'DUPLICATE_DETECTED',
      'ISSUE_ASSIGNED',
      'STATUS_CHANGED',
      'ISSUE_AGING',
      'ISSUE_ESCALATED',
      'RESOLUTION_SUBMITTED',
      'RESOLUTION_VERIFIED',
      'REWORK_REQUIRED',
      'GENERAL',
    ],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  read: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
