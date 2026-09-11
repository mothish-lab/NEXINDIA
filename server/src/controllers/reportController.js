const Report = require('../models/Report');
const Issue = require('../models/Issue');

/**
 * GET /api/reports/my — Citizen's linked reports (duplicates they submitted)
 */
async function getMyReports(req, res, next) {
  try {
    const reports = await Report.find({ reportedBy: req.user._id })
      .populate({
        path: 'issueId',
        select: 'ticketId title category status priority priorityScore reportCount slaDeadline isAging isEscalated',
        populate: { path: 'department', select: 'name' },
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: reports });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports/issue/:issueId — Reports linked to a master issue
 */
async function getReportsByIssue(req, res, next) {
  try {
    const reports = await Report.find({ issueId: req.params.issueId })
      .populate('reportedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: reports });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMyReports, getReportsByIssue };
