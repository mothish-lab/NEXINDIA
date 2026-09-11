const Escalation = require('../models/Escalation');
const { processSLAAndEscalations, escalateIssue } = require('../services/escalationService');

async function getEscalations(req, res, next) {
  try {
    const escalations = await Escalation.find()
      .populate('issueId', 'ticketId title category status priority')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, data: escalations });
  } catch (err) {
    next(err);
  }
}

async function processEscalations(req, res, next) {
  try {
    const result = await processSLAAndEscalations();
    res.json({ success: true, message: 'SLA processing complete', ...result });
  } catch (err) {
    next(err);
  }
}

async function manualEscalate(req, res, next) {
  try {
    const { issueId, reason } = req.body;
    const result = await escalateIssue(issueId, reason || 'Manual escalation by admin');
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

module.exports = { getEscalations, processEscalations, manualEscalate };
