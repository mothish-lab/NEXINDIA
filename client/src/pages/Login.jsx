import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_CREDS = [
  { label: 'Admin', email: 'admin@civic.local', password: 'Admin@123456' },
  { label: 'Authority', email: 'officer@civic.local', password: 'Officer@123456' },
  { label: 'Citizen 1', email: 'citizen1@civic.local', password: 'Citizen@123456' },
  { label: 'Citizen 2', email: 'citizen2@civic.local', password: 'Citizen@123456' },
  { label: 'Citizen 3', email: 'citizen3@civic.local', password: 'Citizen@123456' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      if (user.role === 'ADMIN') navigate('/admin/dashboard');
      else if (user.role === 'AUTHORITY') navigate('/authority/dashboard');
      else navigate('/citizen/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function fillCreds(email, password) {
    setForm({ email, password });
    setError('');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-4xl">🏛️</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">NexIndia</h1>
          <p className="text-gray-500 text-sm">Civic Issue Reporting Platform</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sign In</h2>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                required
                className="form-input"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="form-label mb-0">Password</label>
                <Link to="/forgot-password" className="text-xs text-blue-700 hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <input
                type="password"
                required
                className="form-input mt-1"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-700 hover:underline">Register</Link>
          </p>
        </div>

        {/* Demo credentials */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-amber-900 mb-3">🔑 Demo Credentials (SIH Demo)</h3>
          <div className="space-y-1.5">
            {DEMO_CREDS.map((c) => (
              <button
                key={c.email}
                onClick={() => fillCreds(c.email, c.password)}
                className="w-full text-left px-3 py-1.5 bg-white border border-amber-100 rounded text-xs hover:bg-amber-50 flex justify-between items-center"
              >
                <span className="font-medium text-amber-800">{c.label}</span>
                <span className="text-gray-500">{c.email}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-amber-700 mt-2">Click any credential to fill the form, then Sign In.</p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          <Link to="/" className="hover:underline">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
