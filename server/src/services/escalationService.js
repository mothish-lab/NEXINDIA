/**
 * Escalation Service — Automatic SLA-breach escalation engine.
 *
 * Escalation levels:
 *   0 → unescalated
 *   1 → Department Officer
 *   2 → Municipal Authority
 *   3 → Commissioner (max)
 */

const Issue = require('../models/Issue');
const Escalation = require('../models/Escalation');
const Notification = require('../models/Notification');
const { isIssueAging, isSLABreached } = require('./slaService');
const { calculatePriority } = require('./priorityService');

const LEVEL_LABELS = {
  0: 'Field Officer',
  1: 'Department Officer',
  2: 'Municipal Authority',
  3: 'Commissioner',
};

/**
 * Process all open issues for aging and escalation.
 * Called by cron every 5 minutes.
 */
async function processSLAAndEscalations() {
  const activeStatuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REWORK_REQUIRED'];
  const issues = await Issue.find({
    status: { $in: activeStatuses },
    isMaster: true,
    slaDeadline: { $exists: true, $ne: null },
  }).lean();

  let processed = 0;
  for (const issue of issues) {
    let updated = false;
    const updateData = {};

    // Check aging
    const aging = isIssueAging(issue.slaDeadline, issue.createdAt);
    if (aging && !issue.isAging) {
      updateData.isAging = true;
      updated = true;

      // Notify reporter
      await Notification.create({
        userId: issue.reportedBy,
        issueId: issue._id,
        type: 'ISSUE_AGING',
        message: `⚠️ Issue #${issue.ticketId} is approaching its SLA deadline and is now marked as AGING.`,
      });
    }

    // Check SLA breach — escalate
    if (isSLABreached(issue.slaDeadline)) {
      const currentLevel = issue.escalationLevel || 0;
      if (currentLevel < 3) {
        const newLevel = currentLevel + 1;
        updateData.isEscalated = true;
        updateData.escalationLevel = newLevel;
        updated = true;

        // Create escalation record
        await Escalation.create({
          issueId: issue._id,
          fromLevel: currentLevel,
          toLevel: newLevel,
          reason: `SLA breached. Issue #${issue.ticketId} auto-escalated from ${LEVEL_LABELS[currentLevel]} to ${LEVEL_LABELS[newLevel]}.`,
          escalatedBy: 'SYSTEM',
        });

        // Notify reporter
        await Notification.create({
          userId: issue.reportedBy,
          issueId: issue._id,
          type: 'ISSUE_ESCALATED',
          message: `🚨 Issue #${issue.ticketId} has been ESCALATED to ${LEVEL_LABELS[newLevel]} due to SLA breach.`,
        });
      }
    }

    // Recalculate priority with SLA context
    const { priorityScore, priority } = calculatePriority({
      category: issue.category,
      reportCount: issue.reportCount,
      slaDeadline: issue.slaDeadline,
      createdAt: issue.createdAt,
    });
    if (priorityScore !== issue.priorityScore) {
      updateData.priorityScore = priorityScore;
      updateData.priority = priority;
      updated = true;
    }

    if (updated) {
      await Issue.findByIdAndUpdate(issue._id, updateData);
      processed++;
    }
  }

  if (processed > 0) {
    console.log(`[SLA Cron] Processed ${processed} issues for aging/escalation`);
  }
  return { processed };
}

/**
 * Manually trigger escalation for a specific issue (admin/demo use).
 */
async function escalateIssue(issueId, reason = 'Manual escalation') {
  const issue = await Issue.findById(issueId);
  if (!issue) throw new Error('Issue not found');

  const currentLevel = issue.escalationLevel || 0;
  if (currentLevel >= 3) {
    return { message: 'Issue already at maximum escalation level', level: currentLevel };
  }

  const newLevel = currentLevel + 1;
  await Escalation.create({
    issueId: issue._id,
    fromLevel: currentLevel,
    toLevel: newLevel,
    reason,
    escalatedBy: 'ADMIN',
  });

  await Issue.findByIdAndUpdate(issueId, {
    isEscalated: true,
    escalationLevel: newLevel,
    isAging: true,
  });

  await Notification.create({
    userId: issue.reportedBy,
    issueId: issue._id,
    type: 'ISSUE_ESCALATED',
    message: `🚨 Issue #${issue.ticketId} has been escalated to ${LEVEL_LABELS[newLevel]}.`,
  });

  return { message: 'Issue escalated', fromLevel: currentLevel, toLevel: newLevel };
}

module.exports = { processSLAAndEscalations, escalateIssue, LEVEL_LABELS };
