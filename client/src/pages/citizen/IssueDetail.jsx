import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { issueService } from '../../services';
import { PriorityBadge, StatusBadge, CategoryBadge, AgingBadge, EscalatedBadge, SLAIndicator, ReportCountBadge } from '../../components/Badges';
import { PageLoading, ErrorAlert } from '../../components/UI';
import { CATEGORY_LABELS, timeAgo } from '../../utils';

const LIFECYCLE_STEPS = [
  { key: 'OPEN', label: 'Reported' },
  { key: 'AI_VERIFIED', label: 'AI Verified' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'CITIZEN_VERIFICATION', label: 'Verification' },
  { key: 'RESOLVED', label: 'Resolved' },
];

export default function IssueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [issue, setIssue] = useState(null);
  const [reports, setReports] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    try {
      const [issueRes, historyRes] = await Promise.all([
        issueService.getById(id),
        issueService.getHistory(id).catch(() => ({ data: { history: [] } })),
      ]);
      setIssue(issueRes.data.issue);
      setReports(issueRes.data.reports || []);
      setHistory(historyRes.data.history || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(decision) {
    if (decision === 'REJECTED' && !rejectComment.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setVerifying(true);
    try {
      await issueService.verify(id, decision, rejectComment);
      toast.success(decision === 'ACCEPTED' ? '✅ Resolution accepted! Issue is now RESOLVED.' : '❌ Resolution rejected. Authority notified.');
      load();
      setShowRejectForm(false);
      setRejectComment('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setVerifying(false);
    }
  }

  if (loading) return <PageLoading />;
  if (error) return <ErrorAlert message={error} />;
  if (!issue) return null;

  // Determine active step index
  const statusOrder = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'CITIZEN_VERIFICATION', 'RESOLVED', 'CLOSED'];
  const currentStepIdx = statusOrder.indexOf(issue.status);

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10">
      <button onClick={() => navigate(-1)} className="text-sm font-semibold text-blue-700 hover:underline">
        ← Back to Reports
      </button>

      {/* Header Ticket Card */}
      <div className={`card p-6 ${issue.isEscalated ? 'border-l-4 border-red-500' : issue.isAging ? 'border-l-4 border-amber-400' : ''}`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h1 className="text-2xl font-black text-blue-900 tracking-tight">#{issue.ticketId}</h1>
              <CategoryBadge category={issue.category} />
              {issue.isEscalated && <EscalatedBadge level={issue.escalationLevel} />}
              {issue.isAging && !issue.isEscalated && <AgingBadge />}
            </div>
            <h2 className="font-bold text-gray-900 text-lg">{issue.title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">📍 {issue.locationText || `${issue.latitude?.toFixed(4)}, ${issue.longitude?.toFixed(4)}`}</p>
          </div>
          <div className="text-right space-y-1">
            <PriorityBadge priority={issue.priority} />
            <div className="block"><StatusBadge status={issue.status} /></div>
            <ReportCountBadge count={issue.reportCount} />
          </div>
        </div>

        <p className="text-sm text-gray-700 mt-4 leading-relaxed">{issue.description}</p>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-gray-100 pt-3">
          <div>
            <span className="text-gray-400 font-medium">Priority Score</span>
            <div className="font-bold text-gray-900">{issue.priorityScore}/100</div>
          </div>
          <div>
            <span className="text-gray-400 font-medium">SLA Countdown</span>
            <div><SLAIndicator slaDeadline={issue.slaDeadline} status={issue.status} /></div>
          </div>
          <div>
            <span className="text-gray-400 font-medium">Reported</span>
            <div className="font-medium text-gray-800">{timeAgo(issue.createdAt)}</div>
          </div>
          <div>
            <span className="text-gray-400 font-medium">Department</span>
            <div className="font-semibold text-blue-800">{issue.department?.name || 'Unassigned'}</div>
          </div>
        </div>
      </div>

      {/* Visual Resolution Lifecycle Tracker */}
      <div className="card p-5 space-y-3">
        <h3 className="font-bold text-gray-900 text-sm">Issue Resolution Pipeline</h3>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          {LIFECYCLE_STEPS.map((step, idx) => {
            const isCompleted = currentStepIdx >= idx || (step.key === 'AI_VERIFIED' && issue.aiCategory);
            const isCurrent = (issue.status === step.key) || (issue.status === 'RESOLUTION_SUBMITTED' && step.key === 'CITIZEN_VERIFICATION');
            return (
              <div
                key={step.key}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  isCurrent
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : isCompleted
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}
              >
                <div className="text-xs mb-0.5">
                  {isCurrent ? '●' : isCompleted ? '✓' : '○'}
                </div>
                <div className="text-[11px] font-semibold truncate">{step.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Classification Summary */}
      {issue.aiCategory && (
        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <h4 className="font-bold text-blue-950 text-xs">AI Engine Verification</h4>
              <p className="text-xs text-blue-800">
                Classified as <strong>{CATEGORY_LABELS[issue.aiCategory] || issue.aiCategory}</strong> ({Math.round((issue.aiConfidence || 0.85) * 100)}% confidence score)
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full font-semibold">Verified</span>
        </div>
      )}

      {/* Reported Image */}
      {issue.imageUrl && (
        <div className="card p-4 space-y-2">
          <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider">Report Photograph</h3>
          <div className="aspect-video max-h-72 rounded-xl overflow-hidden border border-gray-200 bg-gray-900">
            <img src={issue.imageUrl} alt="Issue" className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      {/* Community Reports (Duplicates merged) */}
      {reports.length > 0 && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm">
              👥 Community Reports ({reports.length + 1} citizens backing this issue)
            </h3>
            <span className="text-xs text-purple-700 bg-purple-50 font-semibold px-2.5 py-1 rounded-full border border-purple-200">
              Clustered Ticket
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {reports.map((r) => (
              <div key={r._id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-gray-800">{r.reportedBy?.name || 'Citizen'}</span>
                  <span className="text-gray-500 ml-2 italic truncate max-w-xs inline-block align-bottom">
                    "{r.description?.slice(0, 60)}"
                  </span>
                </div>
                <span className="text-gray-400">{timeAgo(r.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline / History Audit Trail */}
      <div className="card p-5 space-y-4">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          <span>📜</span>
          <span>Timeline &amp; Action Log</span>
        </h3>

        {history.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No historical status updates recorded yet.</p>
        ) : (
          <div className="relative pl-6 border-l-2 border-blue-200 space-y-4 my-2">
            {history.map((h, i) => (
              <div key={h._id || i} className="relative">
                {/* Dot */}
                <div className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-600 shadow-sm" />
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                      {h.status?.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-gray-400">{timeAgo(h.createdAt)}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{h.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CITIZEN RESOLUTION VERIFICATION SECTION */}
      {issue.status === 'CITIZEN_VERIFICATION' && (
        <div className="card border-2 border-orange-400 shadow-md overflow-hidden">
          <div className="p-4 bg-orange-50 border-b border-orange-200">
            <h3 className="font-bold text-orange-950 text-base">⚠️ Resolution Submitted — Verification Required</h3>
            <p className="text-xs text-orange-800 mt-0.5">
              The assigned authority reported that this civic problem has been fixed. Please review and verify the work.
            </p>
          </div>
          <div className="p-5 space-y-4">
            {/* Before / After comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Before (Reported)</p>
                {issue.imageUrl ? (
                  <img src={issue.imageUrl} alt="Before" className="w-full h-44 object-cover rounded-xl border" />
                ) : (
                  <div className="h-44 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-xs">No image</div>
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">After (Resolution Proof)</p>
                {issue.resolutionImageUrl ? (
                  <img src={issue.resolutionImageUrl} alt="After" className="w-full h-44 object-cover rounded-xl border" />
                ) : (
                  <div className="h-44 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-xs">No photo submitted</div>
                )}
              </div>
            </div>

            {issue.resolutionDescription && (
              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Authority Resolution Notes</p>
                <p className="text-xs text-gray-800">{issue.resolutionDescription}</p>
              </div>
            )}

            {!showRejectForm ? (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => handleVerify('ACCEPTED')}
                  disabled={verifying}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-sm transition-colors"
                >
                  {verifying ? 'Processing...' : '✅ Accept & Mark Resolved'}
                </button>
                <button
                  onClick={() => setShowRejectForm(true)}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm shadow-sm transition-colors"
                >
                  ❌ Reject (Needs Rework)
                </button>
              </div>
            ) : (
              <div className="space-y-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <label className="block text-xs font-bold text-red-900">Reason for Rejection *</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-red-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Explain clearly why the fix is unsatisfactory (e.g. debris remains, hole still open)..."
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVerify('REJECTED')}
                    disabled={verifying}
                    className="py-2 px-4 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700"
                  >
                    {verifying ? 'Submitting...' : 'Submit Rejection'}
                  </button>
                  <button
                    onClick={() => setShowRejectForm(false)}
                    className="py-2 px-3 bg-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
