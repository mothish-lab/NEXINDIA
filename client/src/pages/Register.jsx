import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      navigate('/citizen/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl">🏛️</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">NexIndia</h1>
          <p className="text-gray-500 text-sm">Create your citizen account</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Citizen Registration</h2>
          <p className="text-xs text-gray-500 mb-4">Only citizen accounts can self-register. Authority accounts are created by admin.</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Full Name *</label>
              <input type="text" required className="form-input" placeholder="Your full name"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Email *</label>
              <input type="email" required className="form-input" placeholder="you@example.com"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Phone (optional)</label>
              <input type="tel" className="form-input" placeholder="+91 9876543210"
                value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Password *</label>
              <input type="password" required className="form-input" placeholder="Min 8 characters"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Confirm Password *</label>
              <input type="password" required className="form-input" placeholder="Repeat password"
                value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-700 hover:underline">Sign in</Link>
          </p>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">
          <Link to="/" className="hover:underline">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
