import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { issueService } from '../../services';
import { PriorityBadge, StatusBadge, CategoryBadge, AgingBadge, EscalatedBadge, SLAIndicator, ReportCountBadge } from '../../components/Badges';
import { PageLoading, StatsCard, EmptyState } from '../../components/UI';
import { timeAgo } from '../../utils';

export default function CitizenDashboard() {
  const [stats, setStats] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, issuesRes] = await Promise.all([
          issueService.getStats(),
          issueService.getAll({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
        ]);
        setStats(statsRes.data.stats);
        setIssues(issuesRes.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <PageLoading />;

  const s = stats || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">My Dashboard</h1>
        <Link to="/citizen/report" className="btn-primary text-sm">+ Report Issue</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatsCard title="Total Reports" value={s.total} color="blue" icon="📋" />
        <StatsCard title="Open" value={s.open} color="gray" icon="🔵" />
        <StatsCard title="In Progress" value={(s.inProgress || 0) + (s.assigned || 0)} color="purple" icon="🔄" />
        <StatsCard title="Resolved" value={s.resolved} color="green" icon="✅" />
        <StatsCard title="Needs Verification" value={s.citizenVerification} color="orange" icon="⚠️" />
      </div>

      {/* Verification alert */}
      {s.citizenVerification > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-orange-800 font-medium text-sm">
            ⚠️ You have {s.citizenVerification} issue(s) awaiting your verification.{' '}
            <Link to="/citizen/reports" className="underline">Review now →</Link>
          </p>
        </div>
      )}

      {/* Recent reports */}
      <div className="card">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Recent Reports</h2>
          <Link to="/citizen/reports" className="text-sm text-blue-700 hover:underline">View all →</Link>
        </div>
        {issues.length === 0 ? (
          <EmptyState
            title="No issues reported yet"
            description="Start by reporting a civic issue in your area."
            action={<Link to="/citizen/report" className="btn-primary text-sm">Report Your First Issue</Link>}
          />
        ) : (
          <div className="divide-y divide-gray-50">
            {issues.map((issue) => (
              <Link
                key={issue._id}
                to={`/citizen/reports/${issue._id}`}
                className={`block px-4 py-3 hover:bg-gray-50 transition-colors ${
                  issue.isEscalated ? 'border-l-4 border-red-400' :
                  issue.isAging ? 'border-l-4 border-amber-400' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-blue-800">{issue.ticketId}</span>
                      <CategoryBadge category={issue.category} />
                      {issue.isEscalated && <EscalatedBadge level={issue.escalationLevel} />}
                      {issue.isAging && !issue.isEscalated && <AgingBadge />}
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5 truncate">{issue.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <PriorityBadge priority={issue.priority} />
                      <StatusBadge status={issue.status} />
                      <ReportCountBadge count={issue.reportCount} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <SLAIndicator slaDeadline={issue.slaDeadline} status={issue.status} />
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(issue.createdAt)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
