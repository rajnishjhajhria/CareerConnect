// CareerConnect — route guard: login required (STEP 4)
// Usage: <Route path="/x" element={<ProtectedRoute><X /></ProtectedRoute>} />
// For role-specific pages, use <RoleRoute> instead (it also checks login).
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Wait for the session check before deciding (avoids login-page flashes)
  if (loading) return <LoadingSpinner fullPage message="Checking your session…" />;

  // Remember where the user wanted to go, so login can send them back there
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
};

export default ProtectedRoute;
