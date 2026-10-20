// CareerConnect — registration form (STEP 5, spec §6)
// Name, email, phone, password + confirm, and role cards — wired to
// POST /api/auth/register through AuthContext (auto-login on success).
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/api';
import AlertMessage from './AlertMessage';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLES = [
  { value: 'jobseeker', icon: 'person', title: 'Job Seeker', text: 'Find and apply to jobs' },
  { value: 'recruiter', icon: 'briefcase', title: 'Recruiter', text: 'Post jobs and hire talent' },
];

const RegisterForm = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [role, setRole] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const pickRole = (value) => {
    setRole(value);
    setErrors((prev) => ({ ...prev, role: '' }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Full name is required';
    if (!form.email.trim()) next.email = 'Email is required';
    else if (!EMAIL_REGEX.test(form.email.trim())) next.email = 'Enter a valid email address';

    const digits = form.phone.replace(/\D/g, '');
    if (!form.phone.trim()) next.phone = 'Phone number is required';
    else if (digits.length < 10 || digits.length > 15)
      next.phone = 'Enter a valid phone number (10–15 digits)';

    if (!form.password) next.password = 'Password is required';
    else if (form.password.length < 6) next.password = 'Password must be at least 6 characters';
    if (!form.confirmPassword) next.confirmPassword = 'Please confirm your password';
    else if (form.confirmPassword !== form.password) next.confirmPassword = 'Passwords do not match';

    if (!role) next.role = 'Please choose an account type';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const user = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role,
      });
      navigate(user.role === 'recruiter' ? '/recruiter/dashboard' : '/dashboard', {
        replace: true,
      });
    } catch (err) {
      setServerError(getErrorMessage(err));
      // Point duplicate-email errors at the email field as well
      if (err.response?.status === 409) {
        setErrors((prev) => ({ ...prev, email: 'This email is already registered. Try logging in.' }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <AlertMessage type="danger" message={serverError} onClose={() => setServerError('')} />

      {/* Role cards */}
      <div className="mb-3">
        <label className="form-label d-block">
          I am joining as <span className="text-danger">*</span>
        </label>
        <div className="row g-2">
          {ROLES.map((r) => (
            <div className="col-6" key={r.value}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => pickRole(r.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') pickRole(r.value);
                }}
                className={`card role-card text-center h-100 ${
                  role === r.value ? 'border-primary selected' : ''
                }`}
              >
                <div className="card-body py-3">
                  <i className={`bi bi-${r.icon} fs-3 text-primary`}></i>
                  <div className="fw-bold mt-1">{r.title}</div>
                  <small className="text-muted">{r.text}</small>
                </div>
              </div>
            </div>
          ))}
        </div>
        {errors.role && <div className="text-danger small mt-1">{errors.role}</div>}
      </div>

      <div className="mb-3">
        <label htmlFor="reg-name" className="form-label">
          Full name
        </label>
        <input
          id="reg-name"
          type="text"
          autoComplete="name"
          placeholder="Aarav Kapoor"
          className={`form-control ${errors.name ? 'is-invalid' : ''}`}
          value={form.name}
          onChange={set('name')}
        />
        {errors.name && <div className="invalid-feedback">{errors.name}</div>}
      </div>

      <div className="row">
        <div className="col-md-6 mb-3">
          <label htmlFor="reg-email" className="form-label">
            Email address
          </label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={`form-control ${errors.email ? 'is-invalid' : ''}`}
            value={form.email}
            onChange={set('email')}
          />
          {errors.email && <div className="invalid-feedback">{errors.email}</div>}
        </div>
        <div className="col-md-6 mb-3">
          <label htmlFor="reg-phone" className="form-label">
            Phone
          </label>
          <input
            id="reg-phone"
            type="tel"
            autoComplete="tel"
            placeholder="98765 43210"
            className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
            value={form.phone}
            onChange={set('phone')}
          />
          {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
        </div>
      </div>

      <div className="row">
        <div className="col-md-6 mb-3">
          <label htmlFor="reg-password" className="form-label">
            Password
          </label>
          <div className="input-group has-validation">
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Min. 6 characters"
              className={`form-control ${errors.password ? 'is-invalid' : ''}`}
              value={form.password}
              onChange={set('password')}
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
            >
              <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
            </button>
            {errors.password && <div className="invalid-feedback">{errors.password}</div>}
          </div>
        </div>
        <div className="col-md-6 mb-3">
          <label htmlFor="reg-confirm" className="form-label">
            Confirm password
          </label>
          <input
            id="reg-confirm"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Repeat password"
            className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
            value={form.confirmPassword}
            onChange={set('confirmPassword')}
          />
          {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword}</div>}
        </div>
      </div>

      <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
        {submitting ? (
          <>
            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
            Creating account…
          </>
        ) : (
          'Create Account'
        )}
      </button>

      <p className="text-center text-muted mt-3 mb-0">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </form>
  );
};

export default RegisterForm;
