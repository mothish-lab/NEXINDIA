import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { issueService, demoService } from '../../services';
import { PriorityBadge, StatusBadge, CategoryBadge, AgingBadge, EscalatedBadge } from '../../components/Badges';
import { PageLoading, StatsCard } from '../../components/UI';
import { timeAgo } from '../../utils';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoResult, setDemoResult] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [sRes, iRes] = await Promise.all([
          issueService.getStats(),
          issueService.getAll({ sortBy: 'priorityScore', sortOrder: 'desc', limit: 10 }),
        ]);
        setStats(sRes.data.stats);
        setIssues(iRes.data.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  async function handleFastForward(hours) {
    setDemoLoading(true);
    setDemoResult(null);
    try {
      const res = await demoService.fastForward(hours);
      setDemoResult(res.data);
      toast.success(`Simulated ${hours}h: ${res.data.escalationsProcessed} escalations triggered`);
      // Reload stats
      const sRes = await issueService.getStats();
      setStats(sRes.data.stats);
    } catch (err) { toast.error(err.message); }
    finally { setDemoLoading(false); }
  }

  if (loading) return <PageLoading />;
  const s = stats || {};

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatsCard title="Total Issues" value={s.total} color="blue" icon="📋" />
        <StatsCard title="Open" value={s.open} color="gray" icon="🔵" />
        <StatsCard title="Critical" value={s.critical} color="red" icon="🔴" />
        <StatsCard title="Aging" value={s.aging} color="yellow" icon="⏳" />
        <StatsCard title="Escalated" value={s.escalated} color="red" icon="🚨" />
        <StatsCard title="Resolved" value={s.resolved} color="green" icon="✅" />
      </div>

      {/* DEMO CONTROLS */}
      <div className="card border-2 border-amber-300">
        <div className="p-4 bg-amber-50 border-b border-amber-200">
          <h2 className="font-bold text-amber-900 text-lg">🎯 SIH Demo Controls</h2>
          <p className="text-sm text-amber-700 mt-1">
            Simulate time passing for live demonstration. Adjusts SLA deadlines to trigger aging and escalation.
          </p>
        </div>
        <div className="p-4">
          <p className="text-xs text-gray-500 mb-3 font-medium">FAST FORWARD SIMULATED TIME:</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {[1, 6, 12, 24, 48].map(h => (
              <button
                key={h}
                onClick={() => handleFastForward(h)}
                disabled={demoLoading}
                className="px-4 py-2 bg-amber-500 text-white text-sm rounded font-medium hover:bg-amber-600 disabled:opacity-50"
              >
                {demoLoading ? '...' : `+${h}h`}
              </button>
            ))}
          </div>
          {demoResult && (
            <div className="bg-white border border-amber-200 rounded p-3 text-sm space-y-1">
              <p>✅ <span className="font-medium">{demoResult.issuesAffected}</span> issues' SLA adjusted</p>
              <p>🚨 <span className="font-medium">{demoResult.escalationsProcessed}</span> issues escalated/updated</p>
              <p className="text-xs text-amber-600 mt-1">{demoResult.warning}</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/admin/issues', label: '📋 All Issues' },
          { to: '/admin/departments', label: '🏢 Departments' },
          { to: '/admin/users', label: '👥 Users' },
          { to: '/admin/analytics', label: '📈 Analytics' },
        ].map(nav => (
          <Link key={nav.to} to={nav.to}
            className="card p-4 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            {nav.label}
          </Link>
        ))}
      </div>

      {/* Recent issues */}
      <div className="card">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-semibold text-gray-800">Top Priority Issues</h2>
          <Link to="/admin/issues" className="text-sm text-blue-700 hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Ticket','Category','Priority','Status','Reports','Aging/Esc'].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {issues.map(issue => (
                <tr key={issue._id} className={`${issue.isEscalated ? 'bg-red-50' : issue.isAging ? 'bg-amber-50' : ''}`}>
                  <td className="px-3 py-2 font-bold text-blue-800">{issue.ticketId}</td>
                  <td className="px-3 py-2"><CategoryBadge category={issue.category} /></td>
                  <td className="px-3 py-2"><PriorityBadge priority={issue.priority} /></td>
                  <td className="px-3 py-2"><StatusBadge status={issue.status} /></td>
                  <td className="px-3 py-2 text-purple-700 font-medium">{issue.reportCount > 1 ? `👥 ${issue.reportCount}` : '1'}</td>
                  <td className="px-3 py-2">
                    {issue.isEscalated ? <EscalatedBadge level={issue.escalationLevel} /> :
                     issue.isAging ? <AgingBadge /> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
