import { useState, useEffect } from 'react';
import { adminService } from '../../services';
import { PageLoading } from '../../components/UI';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#f97316', '#6b7280'];

export default function AdminAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getAnalytics().then(r => setAnalytics(r.data.analytics)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading />;
  if (!analytics) return <div className="text-gray-500 text-center py-12">No analytics data available.</div>;

  const a = analytics;
  const categoryData = a.categoryBreakdown?.map(c => ({ name: c._id?.replace('_', ' '), count: c.count })) || [];
  const deptData = a.departmentBreakdown?.map(d => ({ name: d.name || 'Unknown', count: d.count })) || [];
  const statusData = a.statusBreakdown?.map(s => ({ name: s._id?.replace(/_/g, ' '), count: s.count })) || [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Analytics</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 uppercase font-medium">Total Issues</p>
          <p className="text-3xl font-bold text-blue-700">{a.totalIssues}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 uppercase font-medium">Total Users</p>
          <p className="text-3xl font-bold text-gray-700">{a.totalUsers}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 uppercase font-medium">Escalations</p>
          <p className="text-3xl font-bold text-red-700">{a.escalationCount}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 uppercase font-medium">Avg Resolution</p>
          <p className="text-3xl font-bold text-green-700">{a.avgResolutionHours ? `${a.avgResolutionHours}h` : '—'}</p>
        </div>
      </div>

      {/* Category bar chart */}
      {categoryData.length > 0 && (
        <div className="card p-4">
          <h2 className="font-semibold text-gray-800 mb-4">Issues by Category</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={categoryData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Department bar chart */}
      {deptData.length > 0 && (
        <div className="card p-4">
          <h2 className="font-semibold text-gray-800 mb-4">Issues by Department</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={deptData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Status breakdown */}
      {statusData.length > 0 && (
        <div className="card p-4">
          <h2 className="font-semibold text-gray-800 mb-3">Status Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Count</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {statusData.sort((a,b) => b.count - a.count).map(s => (
                  <tr key={s.name}>
                    <td className="px-4 py-2">{s.name}</td>
                    <td className="px-4 py-2 font-semibold">{s.count}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-blue-200 rounded-full h-1.5 flex-1 max-w-24">
                          <div className="bg-blue-700 h-1.5 rounded-full"
                            style={{ width: `${Math.round((s.count / a.totalIssues) * 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{Math.round((s.count / a.totalIssues) * 100)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
