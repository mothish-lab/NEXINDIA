import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { departmentService } from '../../services';
import { PageLoading, EmptyState } from '../../components/UI';
import { CATEGORY_OPTIONS } from '../../utils';

const CATEGORY_LIST = ['POTHOLE','GARBAGE','STREETLIGHT','WATER_LEAK','WATER_LOGGING','ROAD_DAMAGE','DRAINAGE','OTHER'];

function DeptForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { name: '', slaHours: 24, authorityLevel: 'WARD', categories: [] });
  const [saving, setSaving] = useState(false);

  function toggleCat(cat) {
    setForm(f => ({
      ...f,
      categories: f.categories.includes(cat) ? f.categories.filter(c => c !== cat) : [...f.categories, cat]
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.slaHours) { toast.error('Name and SLA hours required'); return; }
    setSaving(true);
    try { await onSave(form); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-50 rounded-lg border">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="form-label">Department Name *</label>
          <input type="text" required className="form-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
        </div>
        <div>
          <label className="form-label">SLA Hours *</label>
          <input type="number" required min="1" max="168" className="form-input" value={form.slaHours}
            onChange={e => setForm(f => ({...f, slaHours: parseInt(e.target.value)}))} />
        </div>
        <div>
          <label className="form-label">Authority Level</label>
          <select className="form-select" value={form.authorityLevel} onChange={e => setForm(f => ({...f, authorityLevel: e.target.value}))}>
            <option value="WARD">Ward</option>
            <option value="ZONE">Zone</option>
            <option value="MUNICIPAL">Municipal</option>
          </select>
        </div>
      </div>
      <div>
        <label className="form-label">Responsible Categories</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {CATEGORY_LIST.map(cat => (
            <button key={cat} type="button" onClick={() => toggleCat(cat)}
              className={`px-2 py-1 text-xs rounded border ${form.categories.includes(cat) ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
              {cat.replace('_',' ')}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Department'}</button>
        {onCancel && <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>}
      </div>
    </form>
  );
}

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => { load(); }, []);
  async function load() {
    try { const r = await departmentService.getAll(); setDepartments(r.data.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleCreate(data) {
    try {
      await departmentService.create(data);
      toast.success('Department created');
      setShowForm(false);
      load();
    } catch (err) { toast.error(err.message); }
  }

  async function handleUpdate(id, data) {
    try {
      await departmentService.update(id, data);
      toast.success('Department updated');
      setEditingId(null);
      load();
    } catch (err) { toast.error(err.message); }
  }

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Departments ({departments.length})</h1>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); }} className="btn-primary text-sm">
          {showForm ? 'Cancel' : '+ New Department'}
        </button>
      </div>

      {showForm && (
        <DeptForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      <div className="card">
        {departments.length === 0 ? (
          <EmptyState title="No departments yet" description="Create departments to assign issues." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Name','Authority Level','SLA Hours','Categories','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-2 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {departments.map(dept => (
                <>
                  <tr key={dept._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{dept.name}</td>
                    <td className="px-4 py-3 text-gray-600">{dept.authorityLevel}</td>
                    <td className="px-4 py-3 font-semibold">{dept.slaHours}h</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {dept.categories?.map(c => (
                          <span key={c} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{c.replace('_',' ')}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setEditingId(editingId === dept._id ? null : dept._id)}
                        className="text-xs text-blue-700 hover:underline">
                        {editingId === dept._id ? 'Cancel' : 'Edit'}
                      </button>
                    </td>
                  </tr>
                  {editingId === dept._id && (
                    <tr><td colSpan={5} className="px-4 py-2">
                      <DeptForm initial={dept} onSave={(data) => handleUpdate(dept._id, data)} onCancel={() => setEditingId(null)} />
                    </td></tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
