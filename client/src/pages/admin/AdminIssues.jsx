import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { issueService } from '../../services';
import { PriorityBadge, StatusBadge, CategoryBadge, AgingBadge, EscalatedBadge, SLAIndicator } from '../../components/Badges';
import { PageLoading, EmptyState, ConfirmDialog } from '../../components/UI';
import { CATEGORY_OPTIONS, timeAgo } from '../../utils';

export default function AdminIssues() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', category: '', priority: '', isAging: '', isEscalated: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteId, setDeleteId] = useState(null);
  const LIMIT = 20;

  useEffect(() => { load(); }, [filters, page]);

  async function load() {
    setLoading(true);
    try {
      const params = { ...filters, page, limit: LIMIT, sortBy: 'priorityScore', sortOrder: 'desc' };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const res = await issueService.getAll(params);
      setIssues(res.data.data);
      setTotal(res.data.pagination.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleDelete() {
    try {
      await issueService.delete(deleteId);
      toast.success('Issue deleted');
      setDeleteId(null);
      load();
    } catch (err) { toast.error(err.message); }
  }

  function setFilter(key, val) { setFilters(f => ({ ...f, [key]: val })); setPage(1); }
  const pages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">All Issues ({total})</h1>

      <div className="card p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <select className="form-select text-sm" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
            <option value="">All Statuses</option>
            {['OPEN','ASSIGNED','IN_PROGRESS','CITIZEN_VERIFICATION','RESOLVED','REWORK_REQUIRED','CLOSED'].map(s => (
              <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
            ))}
          </select>
          <select className="form-select text-sm" value={filters.category} onChange={e => setFilter('category', e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className="form-select text-sm" value={filters.priority} onChange={e => setFilter('priority', e.target.value)}>
            <option value="">All Priorities</option>
            {['CRITICAL','HIGH','MEDIUM','LOW'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={() => setFilter('isAging', filters.isAging ? '' : 'true')}
              className={`flex-1 text-xs px-2 py-1.5 rounded border ${filters.isAging ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-300'}`}>
              ⏳ Aging
            </button>
            <button onClick={() => setFilter('isEscalated', filters.isEscalated ? '' : 'true')}
              className={`flex-1 text-xs px-2 py-1.5 rounded border ${filters.isEscalated ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-300'}`}>
              🚨 Escalated
            </button>
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        {loading ? <div className="py-12 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-700" /></div>
        : issues.length === 0 ? <EmptyState title="No issues found" description="Try changing filters." />
        : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Ticket','Category','Priority','Status','Reports','SLA','Reported','Actions'].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {issues.map(issue => (
                <tr key={issue._id} className={`${issue.isEscalated ? 'bg-red-50' : issue.isAging ? 'bg-amber-50' : ''}`}>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-blue-800">{issue.ticketId}</span>
                      {issue.isEscalated && <EscalatedBadge level={issue.escalationLevel} />}
                      {issue.isAging && !issue.isEscalated && <AgingBadge />}
                    </div>
                  </td>
                  <td className="px-3 py-2"><CategoryBadge category={issue.category} /></td>
                  <td className="px-3 py-2"><PriorityBadge priority={issue.priority} /></td>
                  <td className="px-3 py-2"><StatusBadge status={issue.status} /></td>
                  <td className="px-3 py-2 text-purple-700">{issue.reportCount > 1 ? `👥 ${issue.reportCount}` : '1'}</td>
                  <td className="px-3 py-2"><SLAIndicator slaDeadline={issue.slaDeadline} status={issue.status} /></td>
                  <td className="px-3 py-2 text-gray-500">{timeAgo(issue.createdAt)}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => setDeleteId(issue._id)}
                      className="text-xs text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p-1)} className="btn-secondary text-sm px-3 py-1">← Prev</button>
          <span className="text-sm text-gray-600">{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p+1)} className="btn-secondary text-sm px-3 py-1">Next →</button>
        </div>
      )}

      <ConfirmDialog open={!!deleteId} title="Delete Issue" message="Are you sure you want to delete this issue? This cannot be undone."
        danger onConfirm={handleDelete} onCancel={() => setDeleteId(null)} confirmLabel="Delete" />
    </div>
  );
}
