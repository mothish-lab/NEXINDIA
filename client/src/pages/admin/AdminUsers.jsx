import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { adminService, departmentService } from '../../services';
import { PageLoading, EmptyState } from '../../components/UI';
import { timeAgo } from '../../utils';

const ROLE_COLORS = { CITIZEN: 'bg-gray-100 text-gray-700', AUTHORITY: 'bg-blue-100 text-blue-800', ADMIN: 'bg-purple-100 text-purple-800' };

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'AUTHORITY', department: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      adminService.getUsers({ role: roleFilter }),
      departmentService.getAll(),
    ]).then(([uRes, dRes]) => {
      setUsers(uRes.data.data);
      setDepartments(dRes.data.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [roleFilter]);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await adminService.createUser(form);
      toast.success('User created successfully');
      setShowForm(false);
      setForm({ name: '', email: '', phone: '', password: '', role: 'AUTHORITY', department: '' });
      const uRes = await adminService.getUsers({ role: roleFilter });
      setUsers(uRes.data.data);
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function toggleActive(user) {
    try {
      await adminService.updateUser(user._id, { isActive: !user.isActive });
      toast.success(`User ${user.isActive ? 'deactivated' : 'activated'}`);
      const uRes = await adminService.getUsers({ role: roleFilter });
      setUsers(uRes.data.data);
    } catch (err) { toast.error(err.message); }
  }

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-gray-900">Users ({users.length})</h1>
        <div className="flex gap-2">
          {['','CITIZEN','AUTHORITY','ADMIN'].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-1 text-xs rounded border ${roleFilter === r ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300'}`}>
              {r || 'All'}
            </button>
          ))}
          <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">+ Create User</button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="card p-4 space-y-4">
          <h2 className="font-semibold text-gray-800">Create Authority / Admin Account</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label">Full Name *</label>
              <input type="text" required className="form-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
            </div>
            <div>
              <label className="form-label">Email *</label>
              <input type="email" required className="form-input" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input type="tel" className="form-input" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} />
            </div>
            <div>
              <label className="form-label">Password *</label>
              <input type="password" required minLength={8} className="form-input" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} />
            </div>
            <div>
              <label className="form-label">Role *</label>
              <select className="form-select" value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}>
                <option value="AUTHORITY">Authority</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            {form.role === 'AUTHORITY' && (
              <div>
                <label className="form-label">Department</label>
                <select className="form-select" value={form.department} onChange={e => setForm(f => ({...f, department: e.target.value}))}>
                  <option value="">Select department...</option>
                  {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create User'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      <div className="card overflow-x-auto">
        {users.length === 0 ? <EmptyState title="No users found" /> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Name','Email','Role','Department','Active','Joined','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-2 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(user => (
                <tr key={user._id} className={!user.isActive ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${ROLE_COLORS[user.role]}`}>{user.role}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{user.department?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{timeAgo(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(user)}
                      className={`text-xs hover:underline ${user.isActive ? 'text-red-600' : 'text-green-600'}`}>
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
