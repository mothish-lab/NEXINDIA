import { useState, useEffect } from 'react';
import { issueService } from '../../services';
import IssueMap from '../../components/IssueMap';
import { PageLoading } from '../../components/UI';

const LEGEND = [
  { color: '#6b7280', label: 'Open' },
  { color: '#2563eb', label: 'In Progress' },
  { color: '#ea580c', label: 'Aging' },
  { color: '#dc2626', label: 'Escalated' },
  { color: '#16a34a', label: 'Resolved' },
];

export default function AuthorityMap() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(p => setUserLocation([p.coords.latitude, p.coords.longitude]), () => {});
    issueService.getMap().then(r => { setIssues(r.data.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading />;

  const filtered = issues.filter(i => {
    if (filter === 'ALL') return true;
    if (filter === 'AGING') return i.isAging;
    if (filter === 'ESCALATED') return i.isEscalated;
    if (filter === 'CRITICAL') return i.priority === 'CRITICAL';
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-gray-900">Issue Map ({filtered.length} issues)</h1>
        <div className="flex gap-2 flex-wrap">
          {['ALL','AGING','ESCALATED','CRITICAL'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded border ${filter === f ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-gray-600 border-gray-300'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-4 flex-wrap">
        {LEGEND.map(l => (
          <div key={l.label} className="flex items-center gap-1.5 text-xs text-gray-600">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
            {l.label}
          </div>
        ))}
      </div>
      <IssueMap issues={filtered} userLocation={userLocation} height="550px" />
    </div>
  );
}
