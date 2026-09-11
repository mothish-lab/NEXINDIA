import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';

export default function CitizenLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { to: '/citizen/dashboard', label: '🏠 Dashboard' },
    { to: '/citizen/report', label: '➕ Report Issue' },
    { to: '/citizen/reports', label: '📋 My Reports' },
    { to: '/citizen/map', label: '🗺️ Map' },
  ];

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-800 text-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏛️</span>
            <div>
              <h1 className="font-bold text-lg leading-tight">NexIndia</h1>
              <p className="text-blue-200 text-xs">Citizen Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="text-sm text-blue-100">
              <span className="hidden sm:inline">Welcome, </span>
              <span className="font-medium">{user?.name?.split(' ')[0]}</span>
            </div>
            <button onClick={handleLogout} className="text-sm text-blue-200 hover:text-white">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  location.pathname === link.to
                    ? 'border-blue-700 text-blue-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
