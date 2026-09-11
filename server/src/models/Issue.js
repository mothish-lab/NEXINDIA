const mongoose = require('mongoose');

// Category prefix mapping for readable ticket IDs
const CATEGORY_PREFIXES = {
  POTHOLE: 'PTH',
  GARBAGE: 'GRB',
  STREETLIGHT: 'STL',
  WATER_LEAK: 'WTL',
  WATER_LOGGING: 'WTG',
  ROAD_DAMAGE: 'RDM',
  DRAINAGE: 'DRN',
  OTHER: 'OTH',
};

const issueSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true,
    index: true,
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
  voiceNote: {
    type: String,
    default: null,
  },
  // User-selected category
  category: {
    type: String,
    enum: ['POTHOLE', 'GARBAGE', 'STREETLIGHT', 'WATER_LEAK', 'WATER_LOGGING', 'ROAD_DAMAGE', 'DRAINAGE', 'OTHER'],
    required: true,
  },
  // AI-classified category
  aiCategory: {
    type: String,
    enum: ['POTHOLE', 'GARBAGE', 'STREETLIGHT', 'WATER_LEAK', 'WATER_LOGGING', 'ROAD_DAMAGE', 'DRAINAGE', 'OTHER', null],
    default: null,
  },
  aiConfidence: {
    type: Number,
    min: 0,
    max: 1,
    default: null,
  },
  // Location
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  locationText: {
    type: String,
    default: '',
  },
  // Image (stored on Cloudinary)
  imageUrl: {
    type: String,
    default: null,
  },
  imagePublicId: {
    type: String,
    default: null,
  },
  // Image embedding for similarity detection (stored as array of floats)
  imageEmbedding: {
    type: [Number],
    default: [],
    select: false, // large field, don't include by default
  },
  // Issue lifecycle status
  status: {
    type: String,
    enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLUTION_SUBMITTED', 'CITIZEN_VERIFICATION', 'RESOLVED', 'REWORK_REQUIRED', 'CLOSED'],
    default: 'OPEN',
  },
  // Priority
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM',
  },
  priorityScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM',
  },
  // Duplicate clustering
  reportCount: {
    type: Number,
    default: 1,
    min: 1,
  },
  // If this issue is a duplicate, point to master
  masterIssueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Issue',
    default: null,
  },
  isMaster: {
    type: Boolean,
    default: true,
  },
  // Department and assignment
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  // SLA
  slaDeadline: {
    type: Date,
    default: null,
  },
  isAging: {
    type: Boolean,
    default: false,
  },
  isEscalated: {
    type: Boolean,
    default: false,
  },
  escalationLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 3,
  },
  // Resolution
  resolutionImageUrl: {
    type: String,
    default: null,
  },
  resolutionImagePublicId: {
    type: String,
    default: null,
  },
  resolutionDescription: {
    type: String,
    default: null,
  },
  resolvedAt: {
    type: Date,
    default: null,
  },
  // Citizen verification of resolution
  citizenVerificationStatus: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'REJECTED', null],
    default: null,
  },
  verificationComment: {
    type: String,
    default: null,
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  verifiedAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

// Auto-generate ticketId before saving
issueSchema.pre('save', async function (next) {
  if (!this.ticketId) {
    const prefix = CATEGORY_PREFIXES[this.category] || 'OTH';
    const count = await mongoose.model('Issue').countDocuments();
    const num = String(count + 100).padStart(4, '0');
    this.ticketId = `${prefix}-${num}`;
  }
  next();
});

// Geospatial indexes
issueSchema.index({ latitude: 1, longitude: 1 });
issueSchema.index({ status: 1 });
issueSchema.index({ priority: 1, priorityScore: -1 });
issueSchema.index({ reportedBy: 1 });
issueSchema.index({ department: 1 });
issueSchema.index({ createdAt: -1 });
issueSchema.index({ slaDeadline: 1, status: 1 });

module.exports = mongoose.model('Issue', issueSchema);
