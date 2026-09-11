const Issue = require('../models/Issue');
const Report = require('../models/Report');
const IssueHistory = require('../models/IssueHistory');
const Notification = require('../models/Notification');
const Department = require('../models/Department');
const { uploadImageBuffer } = require('../services/cloudinaryService');
const { classifyImage, generateImageEmbedding } = require('../services/aiService');
const { findDuplicateIssue } = require('../services/duplicateService');
const { calculatePriority } = require('../services/priorityService');
const { calculateSLADeadline } = require('../services/slaService');
const { createNotification, getDepartmentForCategory } = require('../services/notificationService');
const { createError } = require('../middleware/errorHandler');

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Record a status change in IssueHistory.
 */
async function recordHistory(issueId, status, message, changedBy = null, meta = {}) {
  try {
    await IssueHistory.create({ issueId, status, message, changedBy, meta });
  } catch (err) {
    console.error('IssueHistory write error:', err.message);
  }
}

// ─── POST /api/issues ─────────────────────────────────────────────────────────

/**
 * Full pipeline: upload → classify → embed → duplicate check → create/link
 */
async function createIssue(req, res, next) {
  try {
    const { title, description, category, latitude, longitude, locationText, voiceNote } = req.body;

    if (!title || !description || !category || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'title, description, category, latitude, longitude are required' });
    }

    const validCategories = ['POTHOLE', 'GARBAGE', 'STREETLIGHT', 'WATER_LEAK', 'WATER_LOGGING', 'ROAD_DAMAGE', 'DRAINAGE', 'OTHER'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ success: false, message: 'Invalid category' });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ success: false, message: 'Invalid coordinates' });
    }

    // 1. Upload image to Cloudinary (if provided)
    let imageUrl = null;
    let imagePublicId = null;
    let imageBuffer = null;

    if (req.file) {
      imageBuffer = req.file.buffer;
      const uploadResult = await uploadImageBuffer(imageBuffer, 'civic-issues');
      imageUrl = uploadResult.secure_url;
      imagePublicId = uploadResult.public_id;
    }

    // 2. AI Classification
    const context = `${title} ${description} ${category}`;
    const aiResult = await classifyImage(imageBuffer, context);

    // 3. Generate image embedding for duplicate detection
    const embedding = await generateImageEmbedding(imageBuffer, context);

    // 4. Find best matching department
    const departmentId = await getDepartmentForCategory(category);

    // 5. Calculate SLA deadline
    const slaDeadline = await calculateSLADeadline(departmentId, new Date());

    // 6. Duplicate detection
    const duplicateResult = await findDuplicateIssue({
      latitude: lat,
      longitude: lon,
      category,
      embedding,
      createdAt: new Date(),
    });

    if (duplicateResult.isDuplicate && duplicateResult.masterIssue) {
      // --- DUPLICATE PATH: attach to existing master issue ---
      const master = duplicateResult.masterIssue;

      const report = await Report.create({
        issueId: master._id,
        reportedBy: req.user._id,
        imageUrl,
        imagePublicId,
        imageEmbedding: embedding,
        latitude: lat,
        longitude: lon,
        category,
        description,
        similarityScore: duplicateResult.score,
        geoScore: duplicateResult.breakdown.geoScore,
        imageScore: duplicateResult.breakdown.imageScore,
        categoryScore: duplicateResult.breakdown.categoryScore,
        timeScore: duplicateResult.breakdown.timeScore,
      });

      const newReportCount = master.reportCount + 1;
      const { priorityScore, priority } = calculatePriority({
        category: master.category,
        reportCount: newReportCount,
        slaDeadline: master.slaDeadline,
        createdAt: master.createdAt,
      });

      await Issue.findByIdAndUpdate(master._id, {
        $inc: { reportCount: 1 },
        priorityScore,
        priority,
      });

      await createNotification({
        userId: req.user._id,
        issueId: master._id,
        type: 'DUPLICATE_DETECTED',
        message: `Your report is similar to existing issue #${master.ticketId}. It has been linked. The issue now has ${newReportCount} citizen reports.`,
      });

      const updatedMaster = await Issue.findById(master._id).populate('department', 'name slaHours');

      return res.status(200).json({
        success: true,
        isDuplicate: true,
        message: 'Similar issue already reported. Your report has been linked.',
        masterIssue: updatedMaster,
        report,
        aiCategory: aiResult.category,
        aiConfidence: aiResult.confidence,
        aiSource: aiResult.source,
        duplicateScore: duplicateResult.score,
        duplicateBreakdown: duplicateResult.breakdown,
      });
    }

    // --- NEW ISSUE PATH ---
    const { priorityScore, priority } = calculatePriority({
      category,
      reportCount: 1,
      slaDeadline,
      createdAt: new Date(),
    });

    const issue = await Issue.create({
      reportedBy: req.user._id,
      title,
      description,
      voiceNote: voiceNote || null,
      category,
      aiCategory: aiResult.category,
      aiConfidence: aiResult.confidence,
      latitude: lat,
      longitude: lon,
      locationText: locationText || '',
      imageUrl,
      imagePublicId,
      imageEmbedding: embedding,
      status: 'OPEN',
      priority,
      priorityScore,
      department: departmentId,
      slaDeadline,
      isMaster: true,
      reportCount: 1,
    });

    // Record initial history
    await recordHistory(issue._id, 'OPEN', 'Issue reported by citizen', req.user._id, { aiCategory: aiResult.category });

    await createNotification({
      userId: req.user._id,
      issueId: issue._id,
      type: 'ISSUE_CREATED',
      message: `✅ Your issue #${issue.ticketId} has been received and is being processed.`,
    });

    await createNotification({
      userId: req.user._id,
      issueId: issue._id,
      type: 'ISSUE_CLASSIFIED',
      message: `🤖 AI has classified your issue as "${aiResult.category}" (${Math.round(aiResult.confidence * 100)}% confidence).`,
    });

    const populatedIssue = await Issue.findById(issue._id).populate('department', 'name slaHours');

    res.status(201).json({
      success: true,
      isDuplicate: false,
      message: 'Issue reported successfully',
      issue: populatedIssue,
      aiCategory: aiResult.category,
      aiConfidence: aiResult.confidence,
      aiSource: aiResult.source,
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/issues ──────────────────────────────────────────────────────────

async function getIssues(req, res, next) {
  try {
    const {
      status, category, priority, department, isAging, isEscalated,
      page = 1, limit = 20, sortBy = 'priorityScore', sortOrder = 'desc',
    } = req.query;

    const filter = { isMaster: true };
    const { role, _id: userId } = req.user;

    if (role === 'CITIZEN') {
      filter.reportedBy = userId;
    }

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (department) filter.department = department;
    if (isAging === 'true') filter.isAging = true;
    if (isEscalated === 'true') filter.isEscalated = true;

    if (role === 'AUTHORITY' && req.user.department) {
      filter.$or = [
        { department: req.user.department },
        { department: null },
      ];
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [issues, total] = await Promise.all([
      Issue.find(filter)
        .populate('reportedBy', 'name email')
        .populate('department', 'name slaHours')
        .populate('assignedTo', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Issue.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: issues,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/issues/public/nearby ───────────────────────────────────────────

/**
 * Public endpoint — no auth required.
 * Returns nearby issues with limited public fields (no citizen PII).
 */
async function getNearbyPublic(req, res, next) {
  try {
    const { lat, lon, radius = 5000, category, page = 1, limit = 50 } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ success: false, message: 'lat and lon are required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const radiusM = Math.min(parseFloat(radius), 50000); // cap at 50km

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ success: false, message: 'Invalid coordinates' });
    }

    // Bounding box approximation
    const latDelta = radiusM / 111320;
    const lonDelta = radiusM / (111320 * Math.cos((latitude * Math.PI) / 180));

    const filter = {
      isMaster: true,
      status: { $nin: ['CLOSED'] },
      latitude: { $gte: latitude - latDelta, $lte: latitude + latDelta },
      longitude: { $gte: longitude - lonDelta, $lte: longitude + lonDelta },
    };

    if (category && category !== 'ALL') filter.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [issues, total] = await Promise.all([
      Issue.find(filter)
        .select('ticketId title category status priority priorityScore reportCount latitude longitude locationText imageUrl isAging isEscalated escalationLevel slaDeadline createdAt department')
        .populate('department', 'name')
        .sort({ priorityScore: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Issue.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: issues,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/issues/stats ────────────────────────────────────────────────────

async function getStats(req, res, next) {
  try {
    // If called without auth (public stats), show all
    const filter = { isMaster: true };

    if (req.user) {
      const { role, _id: userId } = req.user;
      if (role === 'CITIZEN') filter.reportedBy = userId;
      if (role === 'AUTHORITY' && req.user.department) {
        filter.department = req.user.department;
      }
    }

    const [stats] = await Issue.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ['$status', 'OPEN'] }, 1, 0] } },
          assigned: { $sum: { $cond: [{ $eq: ['$status', 'ASSIGNED'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'IN_PROGRESS'] }, 1, 0] } },
          resolutionSubmitted: { $sum: { $cond: [{ $eq: ['$status', 'RESOLUTION_SUBMITTED'] }, 1, 0] } },
          citizenVerification: { $sum: { $cond: [{ $eq: ['$status', 'CITIZEN_VERIFICATION'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] } },
          reworkRequired: { $sum: { $cond: [{ $eq: ['$status', 'REWORK_REQUIRED'] }, 1, 0] } },
          aging: { $sum: { $cond: ['$isAging', 1, 0] } },
          escalated: { $sum: { $cond: ['$isEscalated', 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$priority', 'CRITICAL'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$priority', 'HIGH'] }, 1, 0] } },
        },
      },
    ]);

    const categoryBreakdown = await Issue.aggregate([
      { $match: filter },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      stats: stats || {
        total: 0, open: 0, assigned: 0, inProgress: 0, resolutionSubmitted: 0,
        citizenVerification: 0, resolved: 0, reworkRequired: 0, aging: 0,
        escalated: 0, critical: 0, high: 0,
      },
      categoryBreakdown,
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/issues/:id ──────────────────────────────────────────────────────

async function getIssueById(req, res, next) {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('reportedBy', 'name email phone')
      .populate('department', 'name slaHours authorityLevel')
      .populate('assignedTo', 'name email')
      .populate('verifiedBy', 'name email');

    if (!issue) return next(createError('Issue not found', 404));

    if (req.user.role === 'CITIZEN' && !issue.reportedBy._id.equals(req.user._id)) {
      return next(createError('Access denied', 403));
    }

    const reports = await Report.find({ issueId: issue._id })
      .populate('reportedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, issue, reports });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/issues/:id/history ─────────────────────────────────────────────

async function getIssueHistory(req, res, next) {
  try {
    const issue = await Issue.findById(req.params.id).select('reportedBy isMaster');
    if (!issue) return next(createError('Issue not found', 404));

    if (req.user.role === 'CITIZEN' && !issue.reportedBy.equals(req.user._id)) {
      return next(createError('Access denied', 403));
    }

    const history = await IssueHistory.find({ issueId: req.params.id })
      .populate('changedBy', 'name role')
      .sort({ createdAt: 1 });

    res.json({ success: true, history });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/issues/:id/assign ────────────────────────────────────────────

async function assignIssue(req, res, next) {
  try {
    const { departmentId, assignedTo } = req.body;
    const issue = await Issue.findById(req.params.id);
    if (!issue) return next(createError('Issue not found', 404));

    const updateData = { status: 'ASSIGNED' };
    if (departmentId) {
      updateData.department = departmentId;
      const slaDeadline = await calculateSLADeadline(departmentId, issue.createdAt);
      updateData.slaDeadline = slaDeadline;
    }
    if (assignedTo) updateData.assignedTo = assignedTo;

    await Issue.findByIdAndUpdate(req.params.id, updateData);

    const dept = departmentId ? await Department.findById(departmentId).select('name') : null;
    await recordHistory(
      issue._id, 'ASSIGNED',
      `Issue assigned to ${dept ? dept.name : 'department'} by ${req.user.name || 'admin'}`,
      req.user._id,
      { departmentId, assignedTo }
    );

    await createNotification({
      userId: issue.reportedBy,
      issueId: issue._id,
      type: 'ISSUE_ASSIGNED',
      message: `📋 Issue #${issue.ticketId} has been assigned to a department and is now being processed.`,
    });

    const updated = await Issue.findById(req.params.id)
      .populate('department', 'name slaHours')
      .populate('assignedTo', 'name email');
    res.json({ success: true, message: 'Issue assigned', issue: updated });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/issues/:id/status ────────────────────────────────────────────

async function updateStatus(req, res, next) {
  try {
    const { status, message: statusMessage } = req.body;
    const validStatuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLUTION_SUBMITTED', 'CITIZEN_VERIFICATION', 'RESOLVED', 'REWORK_REQUIRED', 'CLOSED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const issue = await Issue.findById(req.params.id);
    if (!issue) return next(createError('Issue not found', 404));

    await Issue.findByIdAndUpdate(req.params.id, { status });

    const histMsg = statusMessage || `Status updated to ${status.replace(/_/g, ' ')} by ${req.user.name || req.user.role}`;
    await recordHistory(issue._id, status, histMsg, req.user._id);

    await createNotification({
      userId: issue.reportedBy,
      issueId: issue._id,
      type: 'STATUS_CHANGED',
      message: `🔄 Issue #${issue.ticketId} status updated to ${status.replace(/_/g, ' ')}.`,
    });

    res.json({ success: true, message: 'Status updated', status });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/issues/:id/resolution ─────────────────────────────────────────

async function submitResolution(req, res, next) {
  try {
    const { resolutionDescription } = req.body;
    const issue = await Issue.findById(req.params.id);
    if (!issue) return next(createError('Issue not found', 404));

    if (!req.file && !resolutionDescription) {
      return res.status(400).json({ success: false, message: 'Resolution image or description required' });
    }

    let resolutionImageUrl = null;
    let resolutionImagePublicId = null;

    if (req.file) {
      const result = await uploadImageBuffer(req.file.buffer, 'civic-resolutions');
      resolutionImageUrl = result.secure_url;
      resolutionImagePublicId = result.public_id;
    }

    await Issue.findByIdAndUpdate(req.params.id, {
      status: 'CITIZEN_VERIFICATION',
      resolutionImageUrl,
      resolutionImagePublicId,
      resolutionDescription: resolutionDescription || '',
    });

    await recordHistory(
      issue._id, 'CITIZEN_VERIFICATION',
      `Resolution submitted by authority — awaiting citizen verification`,
      req.user._id,
      { hasImage: !!resolutionImageUrl }
    );

    await createNotification({
      userId: issue.reportedBy,
      issueId: issue._id,
      type: 'RESOLUTION_SUBMITTED',
      message: `🔧 Authority has submitted a resolution for issue #${issue.ticketId}. Please verify the resolution.`,
    });

    const updated = await Issue.findById(req.params.id);
    res.json({ success: true, message: 'Resolution submitted. Awaiting citizen verification.', issue: updated });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/issues/:id/verify ─────────────────────────────────────────────

async function verifyResolution(req, res, next) {
  try {
    const { decision, comment } = req.body;
    if (!['ACCEPTED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'decision must be ACCEPTED or REJECTED' });
    }
    if (decision === 'REJECTED' && !comment) {
      return res.status(400).json({ success: false, message: 'Comment is required when rejecting' });
    }

    const issue = await Issue.findById(req.params.id);
    if (!issue) return next(createError('Issue not found', 404));

    if (!issue.reportedBy.equals(req.user._id)) {
      return next(createError('Only the original reporter can verify the resolution', 403));
    }

    if (issue.status !== 'CITIZEN_VERIFICATION') {
      return res.status(400).json({ success: false, message: 'Issue is not pending citizen verification' });
    }

    const newStatus = decision === 'ACCEPTED' ? 'RESOLVED' : 'REWORK_REQUIRED';
    const updateData = {
      status: newStatus,
      citizenVerificationStatus: decision,
      verificationComment: comment || null,
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
    };
    if (decision === 'ACCEPTED') {
      updateData.resolvedAt = new Date();
    }

    await Issue.findByIdAndUpdate(req.params.id, updateData);

    const histMsg = decision === 'ACCEPTED'
      ? 'Citizen accepted the resolution — issue RESOLVED'
      : `Citizen rejected the resolution: ${comment}`;
    await recordHistory(issue._id, newStatus, histMsg, req.user._id);

    const notifType = decision === 'ACCEPTED' ? 'RESOLUTION_VERIFIED' : 'REWORK_REQUIRED';
    const notifMsg = decision === 'ACCEPTED'
      ? `✅ Issue #${issue.ticketId} has been RESOLVED and verified by the citizen.`
      : `❌ Resolution for issue #${issue.ticketId} was rejected. Reason: ${comment}. Rework required.`;

    if (issue.assignedTo) {
      await createNotification({ userId: issue.assignedTo, issueId: issue._id, type: notifType, message: notifMsg });
    }

    await createNotification({
      userId: issue.reportedBy,
      issueId: issue._id,
      type: notifType,
      message: decision === 'ACCEPTED'
        ? `✅ You accepted the resolution for issue #${issue.ticketId}. Issue is now RESOLVED.`
        : `❌ You rejected the resolution for issue #${issue.ticketId}. The authority will resubmit.`,
    });

    res.json({ success: true, message: `Resolution ${decision.toLowerCase()}`, newStatus });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/issues/:id ───────────────────────────────────────────────────

async function deleteIssue(req, res, next) {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return next(createError('Issue not found', 404));
    await Issue.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Issue deleted' });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/issues/check-duplicate ────────────────────────────────────────

async function checkDuplicate(req, res, next) {
  try {
    const { latitude, longitude, category, embedding } = req.body;
    const result = await findDuplicateIssue({
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      category,
      embedding: embedding || [],
      createdAt: new Date(),
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/issues/map ──────────────────────────────────────────────────────

async function getIssuesForMap(req, res, next) {
  try {
    const filter = { isMaster: true };
    if (req.user.role === 'CITIZEN') filter.reportedBy = req.user._id;
    if (req.user.role === 'AUTHORITY' && req.user.department) filter.department = req.user.department;

    const issues = await Issue.find(filter)
      .select('ticketId title category status priority priorityScore reportCount latitude longitude isAging isEscalated department')
      .populate('department', 'name')
      .sort({ priorityScore: -1 })
      .limit(500)
      .lean();

    res.json({ success: true, data: issues });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createIssue,
  getIssues,
  getIssueById,
  getIssueHistory,
  getNearbyPublic,
  assignIssue,
  updateStatus,
  submitResolution,
  verifyResolution,
  deleteIssue,
  checkDuplicate,
  getIssuesForMap,
  getStats,
};
