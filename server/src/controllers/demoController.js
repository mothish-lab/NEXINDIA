const Issue = require('../models/Issue');
const { processSLAAndEscalations } = require('../services/escalationService');
const { calculatePriority } = require('../services/priorityService');

/**
 * POST /api/demo/fast-forward
 * Simulates time passing for demo purposes.
 * Only available when DEMO_MODE=true.
 *
 * Body: { hours: 1|6|12|24|48, issueId?: string }
 *
 * IMPORTANT: This ONLY modifies SLA deadlines for demo/test issues.
 * In production (DEMO_MODE=false), this endpoint is not mounted.
 */
async function fastForward(req, res, next) {
  try {
    const { hours, issueId } = req.body;
    const validHours = [1, 6, 12, 24, 48];
    if (!validHours.includes(parseInt(hours))) {
      return res.status(400).json({
        success: false,
        message: `hours must be one of: ${validHours.join(', ')}`,
      });
    }

    const msToSubtract = parseInt(hours) * 60 * 60 * 1000;

    let filter = {
      isMaster: true,
      status: { $nin: ['RESOLVED', 'CLOSED'] },
      slaDeadline: { $exists: true, $ne: null },
    };

    // If specific issueId provided, only affect that issue
    if (issueId) filter._id = issueId;

    // Move SLA deadline back by the specified hours
    const result = await Issue.updateMany(filter, [
      {
        $set: {
          slaDeadline: { $subtract: ['$slaDeadline', msToSubtract] },
          createdAt: { $subtract: ['$createdAt', msToSubtract] },
        },
      },
    ]);

    // Trigger SLA/escalation processing immediately
    const escalationResult = await processSLAAndEscalations();

    res.json({
      success: true,
      message: `Demo: Simulated ${hours} hours of time passing`,
      issuesAffected: result.modifiedCount,
      escalationsProcessed: escalationResult.processed,
      warning: 'This endpoint is for DEMO purposes only and should never be enabled in production.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/demo/status — Current demo data summary
 */
async function getDemoStatus(req, res, next) {
  try {
    const summary = await Issue.aggregate([
      { $match: { isMaster: true } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          issues: { $push: { ticketId: '$ticketId', priority: '$priority', isAging: '$isAging', isEscalated: '$isEscalated' } },
        },
      },
    ]);
    res.json({ success: true, demoMode: true, summary });
  } catch (err) {
    next(err);
  }
}

module.exports = { fastForward, getDemoStatus };
