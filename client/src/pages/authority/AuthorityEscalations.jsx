import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { escalationService } from '../../services';
import { PageLoading, EmptyState } from '../../components/UI';
import { timeAgo } from '../../utils';

const LEVEL_LABELS = { 0: 'Field Officer', 1: 'Department Officer', 2: 'Municipal Authority', 3: 'Commissioner' };

export default function AuthorityEscalations() {
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await escalationService.getAll();
      setEscalations(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleProcess() {
    setProcessing(true);
    try {
      const res = await escalationService.process();
      toast.success(`SLA check complete. ${res.data.processed} issues processed.`);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setProcessing(false); }
  }

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Escalations ({escalations.length})</h1>
        <button onClick={handleProcess} disabled={processing} className="btn-primary text-sm">
          {processing ? 'Processing...' : '▶ Run SLA Check'}
        </button>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
        Escalations are triggered automatically by the SLA engine every 5 minutes. This page shows all escalation events.
      </div>

      <div className="card overflow-x-auto">
        {escalations.length === 0 ? (
          <EmptyState title="No escalations yet" description="Issues are escalated automatically when SLA deadlines are breached." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Issue','From','To','Reason','Date'].map(h => (
                  <th key={h} className="text-left px-4 py-2 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {escalations.map(esc => (
                <tr key={esc._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {esc.issueId ? (
                      <Link to={`/authority/issues/${esc.issueId._id}`} className="font-bold text-blue-800 hover:underline">
                        {esc.issueId.ticketId}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-600">{LEVEL_LABELS[esc.fromLevel] || `Level ${esc.fromLevel}`}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-red-700 font-medium">{LEVEL_LABELS[esc.toLevel] || `Level ${esc.toLevel}`}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs">{esc.reason}</td>
                  <td className="px-4 py-3 text-gray-500">{timeAgo(esc.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
