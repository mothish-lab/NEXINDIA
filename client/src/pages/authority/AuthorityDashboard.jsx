import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { issueService } from '../../services';
import { PriorityBadge, StatusBadge, CategoryBadge, AgingBadge, EscalatedBadge, SLAIndicator, ReportCountBadge } from '../../components/Badges';
import { PageLoading, StatsCard } from '../../components/UI';
import { timeAgo } from '../../utils';

export default function AuthorityDashboard() {
  const [stats, setStats] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, issuesRes] = await Promise.all([
          issueService.getStats(),
          issueService.getAll({ sortBy: 'priorityScore', sortOrder: 'desc', limit: 20 }),
        ]);
        setStats(statsRes.data.stats);
        setIssues(issuesRes.data.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <PageLoading />;
  const s = stats || {};

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Authority Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatsCard title="Total" value={s.total} color="blue" icon="📋" />
        <StatsCard title="Open" value={s.open} color="gray" icon="🔵" />
        <StatsCard title="In Progress" value={(s.inProgress || 0) + (s.assigned || 0)} color="purple" icon="🔄" />
        <StatsCard title="Aging" value={s.aging} color="yellow" icon="⏳" />
        <StatsCard title="Escalated" value={s.escalated} color="red" icon="🚨" />
        <StatsCard title="Resolved" value={s.resolved} color="green" icon="✅" />
      </div>

      {/* Priority Queue */}
      <div className="card">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-800">Priority Queue</h2>
            <p className="text-xs text-gray-500 mt-0.5">Sorted by priority score (highest first)</p>
          </div>
          <Link to="/authority/issues" className="text-sm text-blue-700 hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Ticket</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Category</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Location</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Priority</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Reports</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Department</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">SLA</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {issues.map((issue) => (
                <tr key={issue._id}
                  className={`${issue.isEscalated ? 'bg-red-50' : issue.isAging ? 'bg-amber-50' : 'hover:bg-gray-50'}`}>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-blue-800">{issue.ticketId}</span>
                      {issue.isEscalated && <EscalatedBadge level={issue.escalationLevel} />}
                      {issue.isAging && !issue.isEscalated && <AgingBadge />}
                    </div>
                  </td>
                  <td className="px-4 py-3"><CategoryBadge category={issue.category} /></td>
                  <td className="px-4 py-3 text-gray-600 max-w-32 truncate">{issue.locationText || `${issue.latitude?.toFixed(3)}, ${issue.longitude?.toFixed(3)}`}</td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={issue.priority} />
                    <div className="text-xs text-gray-500 mt-0.5">{issue.priorityScore}/100</div>
                  </td>
                  <td className="px-4 py-3"><ReportCountBadge count={issue.reportCount} /></td>
                  <td className="px-4 py-3 text-gray-600">{issue.department?.name || <span className="text-orange-500">Unassigned</span>}</td>
                  <td className="px-4 py-3"><SLAIndicator slaDeadline={issue.slaDeadline} status={issue.status} /></td>
                  <td className="px-4 py-3"><StatusBadge status={issue.status} /></td>
                  <td className="px-4 py-3">
                    <Link to={`/authority/issues/${issue._id}`} className="text-blue-700 text-xs hover:underline font-medium">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {issues.length === 0 && (
            <div className="py-10 text-center text-gray-400 text-sm">No issues found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
