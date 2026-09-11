/**
 * Priority Service — Deterministic priority scoring.
 *
 * BASE SCORES BY CATEGORY:
 *   POTHOLE       = 50
 *   GARBAGE       = 30
 *   STREETLIGHT   = 35
 *   WATER_LEAK    = 60
 *   WATER_LOGGING = 55
 *   ROAD_DAMAGE   = 50
 *   DRAINAGE      = 45
 *   OTHER         = 20
 *
 * ADDITIONAL BONUSES:
 *   +10 per extra citizen report (max +30)
 *   +10 near SLA breach (within 20% of SLA remaining)
 *   +25 overdue / past SLA deadline
 *
 * PRIORITY BANDS:
 *    0–39  → LOW
 *   40–69  → MEDIUM
 *   70–84  → HIGH
 *   85–100 → CRITICAL
 */

const BASE_SCORES = {
  POTHOLE: 50,
  GARBAGE: 30,
  STREETLIGHT: 35,
  WATER_LEAK: 60,
  WATER_LOGGING: 55,
  ROAD_DAMAGE: 50,
  DRAINAGE: 45,
  OTHER: 20,
};

/**
 * Map numeric score to priority label.
 * @param {number} score
 * @returns {'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'}
 */
function scoreToPriority(score) {
  if (score >= 85) return 'CRITICAL';
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

/**
 * Calculate priority score for an issue.
 * @param {object} params
 * @param {string} params.category
 * @param {number} params.reportCount
 * @param {Date|null} params.slaDeadline
 * @param {Date|null} params.createdAt
 * @returns {{ priorityScore: number, priority: string }}
 */
function calculatePriority({ category, reportCount = 1, slaDeadline = null, createdAt = null }) {
  let score = BASE_SCORES[category] || BASE_SCORES.OTHER;

  // +10 per additional report beyond the first, capped at +30
  const extraReports = Math.max(0, reportCount - 1);
  const reportBonus = Math.min(extraReports * 10, 30);
  score += reportBonus;

  // SLA-based bonuses
  if (slaDeadline) {
    const now = new Date();
    const deadline = new Date(slaDeadline);
    const created = createdAt ? new Date(createdAt) : now;
    const totalDuration = deadline - created;
    const remaining = deadline - now;

    if (remaining < 0) {
      // Overdue
      score += 25;
    } else if (totalDuration > 0 && remaining / totalDuration < 0.2) {
      // Within 20% of SLA remaining → near breach
      score += 10;
    }
  }

  // Cap at 100
  const finalScore = Math.min(100, Math.max(0, Math.round(score)));
  return {
    priorityScore: finalScore,
    priority: scoreToPriority(finalScore),
  };
}

module.exports = { calculatePriority, BASE_SCORES, scoreToPriority };
