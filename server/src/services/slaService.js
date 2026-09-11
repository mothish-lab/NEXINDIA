/**
 * SLA Service — SLA deadline calculation and aging detection.
 */

const Department = require('../models/Department');

/**
 * Calculate SLA deadline for an issue.
 * @param {string|null} departmentId
 * @param {Date} createdAt
 * @returns {Promise<Date>} SLA deadline
 */
async function calculateSLADeadline(departmentId, createdAt = new Date()) {
  let slaHours = 24; // default

  if (departmentId) {
    try {
      const dept = await Department.findById(departmentId);
      if (dept) slaHours = dept.slaHours;
    } catch (e) {
      // Use default if department lookup fails
    }
  }

  const deadline = new Date(createdAt);
  deadline.setHours(deadline.getHours() + slaHours);
  return deadline;
}

/**
 * Check if an issue is aging (within final 20% of SLA window).
 * @param {Date} slaDeadline
 * @param {Date} createdAt
 * @returns {boolean}
 */
function isIssueAging(slaDeadline, createdAt) {
  if (!slaDeadline) return false;
  const now = new Date();
  const deadline = new Date(slaDeadline);
  const created = new Date(createdAt);
  const totalDuration = deadline - created;
  const remaining = deadline - now;
  return remaining > 0 && totalDuration > 0 && remaining / totalDuration < 0.2;
}

/**
 * Check if an issue's SLA has been breached.
 * @param {Date} slaDeadline
 * @returns {boolean}
 */
function isSLABreached(slaDeadline) {
  if (!slaDeadline) return false;
  return new Date() > new Date(slaDeadline);
}

/**
 * Get SLA status string for display.
 * @param {object} issue
 * @returns {{ label: string, color: string, hoursRemaining: number|null }}
 */
function getSLAStatus(issue) {
  if (!issue.slaDeadline) {
    return { label: 'No SLA', color: 'gray', hoursRemaining: null };
  }

  if (['RESOLVED', 'CLOSED'].includes(issue.status)) {
    return { label: 'Resolved', color: 'green', hoursRemaining: null };
  }

  const now = new Date();
  const deadline = new Date(issue.slaDeadline);
  const msRemaining = deadline - now;
  const hoursRemaining = Math.round(msRemaining / (1000 * 60 * 60) * 10) / 10;

  if (msRemaining < 0) {
    return { label: 'OVERDUE', color: 'red', hoursRemaining: hoursRemaining };
  } else if (msRemaining < 2 * 60 * 60 * 1000) {
    return { label: `${hoursRemaining}h remaining`, color: 'orange', hoursRemaining };
  } else {
    return { label: `${hoursRemaining}h remaining`, color: 'yellow', hoursRemaining };
  }
}

module.exports = {
  calculateSLADeadline,
  isIssueAging,
  isSLABreached,
  getSLAStatus,
};
