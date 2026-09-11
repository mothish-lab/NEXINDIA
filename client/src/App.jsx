import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Public pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';

// Layouts
import CitizenLayout from './layouts/CitizenLayout';
import AuthorityLayout from './layouts/AuthorityLayout';
import AdminLayout from './layouts/AdminLayout';

// Citizen pages
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import ReportIssue from './pages/citizen/ReportIssue';
import MyReports from './pages/citizen/MyReports';
import IssueDetail from './pages/citizen/IssueDetail';
import CitizenMap from './pages/citizen/CitizenMap';

// Authority pages
import AuthorityDashboard from './pages/authority/AuthorityDashboard';
import AuthorityIssues from './pages/authority/AuthorityIssues';
import AuthorityIssueDetail from './pages/authority/AuthorityIssueDetail';
import AuthorityMap from './pages/authority/AuthorityMap';
import AuthorityEscalations from './pages/authority/AuthorityEscalations';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminIssues from './pages/admin/AdminIssues';
import AdminDepartments from './pages/admin/AdminDepartments';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAnalytics from './pages/admin/AdminAnalytics';

import { LoadingSpinner } from './components/UI';

/** Route guard component */
function RequireAuth({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard
    if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'AUTHORITY') return <Navigate to="/authority/dashboard" replace />;
    return <Navigate to="/citizen/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Citizen */}
      <Route
        path="/citizen/*"
        element={
          <RequireAuth allowedRoles={['CITIZEN']}>
            <CitizenLayout>
              <Routes>
                <Route path="dashboard" element={<CitizenDashboard />} />
                <Route path="report" element={<ReportIssue />} />
                <Route path="reports" element={<MyReports />} />
                <Route path="reports/:id" element={<IssueDetail />} />
                <Route path="map" element={<CitizenMap />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </CitizenLayout>
          </RequireAuth>
        }
      />

      {/* Authority */}
      <Route
        path="/authority/*"
        element={
          <RequireAuth allowedRoles={['AUTHORITY', 'ADMIN']}>
            <AuthorityLayout>
              <Routes>
                <Route path="dashboard" element={<AuthorityDashboard />} />
                <Route path="issues" element={<AuthorityIssues />} />
                <Route path="issues/:id" element={<AuthorityIssueDetail />} />
                <Route path="map" element={<AuthorityMap />} />
                <Route path="escalations" element={<AuthorityEscalations />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </AuthorityLayout>
          </RequireAuth>
        }
      />

      {/* Admin */}
      <Route
        path="/admin/*"
        element={
          <RequireAuth allowedRoles={['ADMIN']}>
            <AdminLayout>
              <Routes>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="issues" element={<AdminIssues />} />
                <Route path="departments" element={<AdminDepartments />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </AdminLayout>
          </RequireAuth>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontSize: '14px' },
            success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
            error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
