// CareerConnect — Register page (STEP 5: real form)
// Already-logged-in visitors bounce straight to their dashboard.
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import RegisterForm from '../components/RegisterForm';

const Register = () => {
  const { isAuthenticated, isRecruiter, loading } = useAuth();

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
                    <i className="bi bi-check-circle me-2" aria-hidden="true"></i>Free for job seekers, forever
                  </li>
                  <li className="mb-2">
                    <i className="bi bi-check-circle me-2" aria-hidden="true"></i>Real postings, live deadlines
                  </li>
                  <li>
                    <i className="bi bi-check-circle me-2" aria-hidden="true"></i>Track every application
                  </li>
                </ul>
              </div>
              <div className="col-md-7 p-4 p-lg-5">
                <h1 className="h4 fw-bold">Create your account</h1>
                <p className="text-muted mb-4">Join as a job seeker or a recruiter.</p>
                <RegisterForm />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
