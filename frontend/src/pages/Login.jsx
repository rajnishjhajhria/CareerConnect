// CareerConnect — Login page (STEP 5: real form)
// Already-logged-in visitors bounce straight to their dashboard.
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clearSession } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import LoginForm from '../components/LoginForm';

const Login = () => {
  const { isAuthenticated, isRecruiter, loading, logout } = useAuth();
  // ?reason=expired is set by the api.js 401 interceptor — explain it loudly
  // so a forced sign-in never looks like "login keeps sending me back".
  const [params, setParams] = useSearchParams();
  const expired = params.get('reason') === 'expired';
  const navigate = useNavigate();

  const handleReset = () => {
    logout(); // wipe in-memory state (user/token) too, not just storage
    clearSession();
    setParams({}, { replace: true }); // drop ?reason so the banner disappears
    navigate('/login', { replace: true });
  };

  if (loading) return <LoadingSpinner fullPage message="Checking your session…" />;
  if (isAuthenticated) {
    return <Navigate to={isRecruiter ? '/recruiter/dashboard' : '/dashboard'} replace />;
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div className="card shadow-sm overflow-hidden">
            <div className="row g-0">
              <div className="col-md-5 d-none d-md-flex auth-side-panel text-white p-4 flex-column justify-content-center">
                <h2 className="h4 fw-bold">
                  <i className="bi bi-briefcase-fill me-2" aria-hidden="true"></i>
                  CareerConnect
                </h2>
                <p className="opacity-75">Find opportunities. Build your career.</p>
                <ul className="list-unstyled mt-3">
                  <li className="mb-2">
                    <i className="bi bi-check-circle me-2" aria-hidden="true"></i>One-click job applications
                  </li>
                  <li className="mb-2">
                    <i className="bi bi-check-circle me-2" aria-hidden="true"></i>Live application tracking
                  </li>
                  <li>
                    <i className="bi bi-check-circle me-2" aria-hidden="true"></i>Search, filters &amp; typeahead
                  </li>
                </ul>
              </div>
              <div className="col-md-7 p-4 p-lg-5">
                <h1 className="h4 fw-bold">Welcome back</h1>
                <p className="text-muted mb-4">Log in to continue to your dashboard.</p>
                {expired && (
                  <div className="alert alert-warning">
                    <p className="mb-1">
                      <i className="bi bi-hourglass-split me-1" aria-hidden="true"></i>
                      Your previous session expired (or the server restarted) — please log in again.
                    </p>
                    {/* Escape hatch for any corrupted stored session (stale token,
                        blocked storage, partitioned preview tab). */}
                    <button type="button" className="btn btn-sm btn-outline-dark" onClick={handleReset}>
                      <i className="bi bi-eraser me-1" aria-hidden="true"></i>Reset stored session &amp; retry
                    </button>
                  </div>
                )}
                <LoginForm />
                <div className="alert alert-info small mt-3 mb-0">
                  <i className="bi bi-info-circle me-1" aria-hidden="true"></i>
                  <strong>Demo logins:</strong>{' '}
                  job seeker <code>aarav@careerconnect.com</code> / <code>Demo@123</code>
                  {'  ·  '}recruiter <code>priya@careerconnect.com</code> / <code>Demo@123</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
