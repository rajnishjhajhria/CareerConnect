// CareerConnect — login form (STEP 5, spec §6)
// Validation + show/hide password + remember-me + forgot-password modal,
// wired to POST /api/auth/login through AuthContext.
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/api';
import AlertMessage from './AlertMessage';
import Modal from './Modal';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LoginForm = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: '' })); // clear error as the user types
  };

  const validate = () => {
    const next = {};
    if (!form.email.trim()) next.email = 'Email is required';
    else if (!EMAIL_REGEX.test(form.email.trim())) next.email = 'Enter a valid email address';
    if (!form.password) next.password = 'Password is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const user = await login(form.email.trim(), form.password, remember);
      // Return them to the page the guard saved (if any), else their dashboard
      const from = location.state?.from;
      const safeFrom =
        typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : null;
      navigate(safeFrom || (user.role === 'recruiter' ? '/recruiter/dashboard' : '/dashboard'), {
        replace: true,
      });
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const openForgot = () => {
    setResetEmail(form.email);
    setResetSent(false);
    setShowForgot(true);
  };

  return (
    <>
      <form onSubmit={handleSubmit} noValidate>
        <AlertMessage type="danger" message={serverError} onClose={() => setServerError('')} />

        <div className="mb-3">
          <label htmlFor="login-email" className="form-label">
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={`form-control ${errors.email ? 'is-invalid' : ''}`}
            value={form.email}
            onChange={set('email')}
          />
          {errors.email && <div className="invalid-feedback">{errors.email}</div>}
        </div>

        <div className="mb-3">
          <label htmlFor="login-password" className="form-label">
            Password
          </label>
          {/* has-validation keeps Bootstrap's error style working inside an input-group */}
          <div className="input-group has-validation">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Your password"
              className={`form-control ${errors.password ? 'is-invalid' : ''}`}
              value={form.password}
              onChange={set('password')}
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
            </button>
            {errors.password && <div className="invalid-feedback">{errors.password}</div>}
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="form-check">
            <input
              id="remember-me"
              type="checkbox"
              className="form-check-input"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <label htmlFor="remember-me" className="form-check-label">
              Remember me
            </label>
          </div>
          <button type="button" className="btn btn-link p-0 text-decoration-none" onClick={openForgot}>
            Forgot password?
          </button>
        </div>

        <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
          {submitting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
              Logging in…
            </>
          ) : (
            'Login'
          )}
        </button>

        <p className="text-center text-muted mt-3 mb-0">
          New to CareerConnect? <Link to="/register">Create an account</Link>
        </p>
      </form>

      {/* Forgot-password dialog */}
      <Modal show={showForgot} onClose={() => setShowForgot(false)} title="Forgot password?">
        {!resetSent ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setResetSent(true);
            }}
          >
            <p className="text-muted small">
              Enter your account email and we&apos;ll send you a reset link.
            </p>
            <div className="mb-3">
              <label htmlFor="reset-email" className="form-label">
                Email address
              </label>
              <input
                id="reset-email"
                type="email"
                required
                className="form-control"
                placeholder="you@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowForgot(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Send reset link
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="alert alert-info mb-0">
              Email delivery isn&apos;t configured in this demo build, so no link was actually
              sent. In production, a reset link would be emailed to{' '}
              <strong>{resetEmail || 'your address'}</strong>.
            </div>
            <div className="d-flex justify-content-end mt-3">
              <button className="btn btn-primary" onClick={() => setShowForgot(false)}>
                Done
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
};

export default LoginForm;
