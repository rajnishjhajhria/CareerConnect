// CareerConnect — route guard: login + role required (STEP 4)
// Usage: <Route path="/recruiter/jobs" element={
//          <RoleRoute allowedRoles={['recruiter']}><ManageJobs /></RoleRoute>} />
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const RoleRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner fullPage message="Checking your session…" />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Logged in but wrong role → bounce to their own dashboard (not a dead end)
  if (!allowedRoles.includes(user?.role)) {
    const fallback = user?.role === 'recruiter' ? '/recruiter/dashboard' : '/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return children;
};

export default RoleRoute;
