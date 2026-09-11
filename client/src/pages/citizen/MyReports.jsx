import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { issueService, reportService } from '../../services';
import { PriorityBadge, StatusBadge, CategoryBadge, AgingBadge, EscalatedBadge, SLAIndicator, ReportCountBadge } from '../../components/Badges';
import { PageLoading, EmptyState } from '../../components/UI';
import { timeAgo } from '../../utils';

export default function MyReports() {
  const [issues, setIssues] = useState([]);
  const [linkedReports, setLinkedReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [issRes, repRes] = await Promise.all([
          issueService.getAll({ sortBy: 'createdAt', sortOrder: 'desc', limit: 50 }),
          reportService.getMy(),
        ]);
        setIssues(issRes.data.data);
        setLinkedReports(repRes.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <PageLoading />;

  const filtered = statusFilter ? issues.filter(i => i.status === statusFilter) : issues;
  const statuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'CITIZEN_VERIFICATION', 'RESOLVED', 'REWORK_REQUIRED'];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">My Reports</h1>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setStatusFilter('')}
          className={`px-3 py-1 text-xs rounded border ${!statusFilter ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
          All
        </button>
        {statuses.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 text-xs rounded border ${statusFilter === s ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* My Issues */}
      <div className="card">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Issues I Reported ({filtered.length})</h2>
        </div>
        {filtered.length === 0 ? (
          <EmptyState title="No issues found" description="Try changing the filter or report a new issue."
            action={<Link to="/citizen/report" className="btn-primary text-sm">Report Issue</Link>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Ticket</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Category</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Priority</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Reports</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">SLA</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Reported</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((issue) => (
                  <tr key={issue._id}
                    className={`hover:bg-gray-50 cursor-pointer ${issue.isEscalated ? 'bg-red-50' : issue.isAging ? 'bg-amber-50' : ''}`}
                    onClick={() => window.location.href = `/citizen/reports/${issue._id}`}>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-blue-800">{issue.ticketId}</span>
                        {issue.isEscalated && <EscalatedBadge level={issue.escalationLevel} />}
                        {issue.isAging && !issue.isEscalated && <AgingBadge />}
                      </div>
                    </td>
                    <td className="px-4 py-3"><CategoryBadge category={issue.category} /></td>
                    <td className="px-4 py-3"><PriorityBadge priority={issue.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={issue.status} /></td>
                    <td className="px-4 py-3"><ReportCountBadge count={issue.reportCount} /></td>
                    <td className="px-4 py-3"><SLAIndicator slaDeadline={issue.slaDeadline} status={issue.status} /></td>
                    <td className="px-4 py-3 text-gray-500">{timeAgo(issue.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Linked reports */}
      {linkedReports.length > 0 && (
        <div className="card">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Linked Reports — Duplicates ({linkedReports.length})</h2>
            <p className="text-xs text-gray-500 mt-0.5">These reports were linked to existing master issues.</p>
          </div>
          <div className="divide-y divide-gray-50">
            {linkedReports.map((report) => (
              <div key={report._id} className="px-4 py-3 flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs text-gray-500">Linked to: </span>
                  <span className="font-semibold text-blue-800 text-sm">{report.issueId?.ticketId}</span>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <CategoryBadge category={report.category} />
                    {report.issueId && <PriorityBadge priority={report.issueId.priority} />}
                    {report.issueId && <StatusBadge status={report.issueId.status} />}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Similarity: {Math.round((report.similarityScore || 0) * 100)}%</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{timeAgo(report.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
