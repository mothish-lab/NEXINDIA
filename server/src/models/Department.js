const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  authorityLevel: {
    type: String,
    enum: ['WARD', 'ZONE', 'MUNICIPAL'],
    default: 'WARD',
  },
  slaHours: {
    type: Number,
    required: true,
    default: 24,
  },
  categories: [{
    type: String,
    enum: ['POTHOLE', 'GARBAGE', 'STREETLIGHT', 'WATER_LEAK', 'WATER_LOGGING', 'ROAD_DAMAGE', 'DRAINAGE', 'OTHER'],
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Department', departmentSchema);
