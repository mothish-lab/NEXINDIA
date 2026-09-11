import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { to: '/admin/dashboard', label: '📊 Dashboard' },
    { to: '/admin/issues', label: '📋 All Issues' },
    { to: '/admin/departments', label: '🏢 Departments' },
    { to: '/admin/users', label: '👥 Users' },
    { to: '/admin/analytics', label: '📈 Analytics' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏛️</span>
            <div>
              <h1 className="font-bold text-lg leading-tight">NexIndia</h1>
              <p className="text-gray-400 text-xs">Admin Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden sm:inline">{user?.name}</span>
            <button onClick={() => { logout(); navigate('/login'); }} className="text-sm text-gray-400 hover:text-white">
              Logout
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  location.pathname === link.to
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
