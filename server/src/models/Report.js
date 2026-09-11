const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  issueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Issue',
    required: true,
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  imageUrl: {
    type: String,
    default: null,
  },
  imagePublicId: {
    type: String,
    default: null,
  },
  imageEmbedding: {
    type: [Number],
    default: [],
    select: false,
  },
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    enum: ['POTHOLE', 'GARBAGE', 'STREETLIGHT', 'WATER_LEAK', 'WATER_LOGGING', 'ROAD_DAMAGE', 'DRAINAGE', 'OTHER'],
    required: true,
  },
  similarityScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 0,
  },
  geoScore: { type: Number, default: 0 },
  imageScore: { type: Number, default: 0 },
  categoryScore: { type: Number, default: 0 },
  timeScore: { type: Number, default: 0 },
  description: {
    type: String,
    default: '',
  },
}, { timestamps: true });

reportSchema.index({ issueId: 1 });
reportSchema.index({ reportedBy: 1 });
reportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
