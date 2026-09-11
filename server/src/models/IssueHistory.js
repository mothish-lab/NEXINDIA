const mongoose = require('mongoose');

const issueHistorySchema = new mongoose.Schema({
  issueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Issue',
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLUTION_SUBMITTED', 'CITIZEN_VERIFICATION', 'RESOLVED', 'REWORK_REQUIRED', 'CLOSED'],
    required: true,
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  // Extra metadata (e.g. department assigned, priority changed)
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

issueHistorySchema.index({ issueId: 1, createdAt: 1 });

module.exports = mongoose.model('IssueHistory', issueHistorySchema);
