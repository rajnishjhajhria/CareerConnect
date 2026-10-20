// CareerConnect — responsive, auth-aware navbar (STEP 4, spec §37)
// Shows different links for guests, job seekers, and recruiters.
import { useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
  const { isAuthenticated, isJobSeeker, isRecruiter, user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-close the mobile menu on every navigation (Bootstrap won't do it alone)
  useEffect(() => {
    const menu = document.getElementById('mainNavbar');
    if (menu?.classList.contains('show')) {
      menu.classList.remove('show');
      document.querySelector('.navbar-toggler')?.setAttribute('aria-expanded', 'false');
    }
  }, [location.pathname]);

  const linkClass = ({ isActive }) => `nav-link${isActive ? ' active fw-semibold' : ''}`;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const homePath = isJobSeeker ? '/dashboard' : isRecruiter ? '/recruiter/dashboard' : '/';

  return (
    <nav className="navbar navbar-expand-lg navbar-dark cc-nav">
      <div className="container">
        <Link className="navbar-brand fw-bold" to={homePath}>
          <span className="cc-brand-chip me-2">
            <i className="bi bi-briefcase-fill" aria-hidden="true"></i>
          </span>
          CareerConnect
        </Link>

        <button
          className="btn cc-theme-toggle ms-auto me-2"
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <i className={`bi ${isDark ? 'bi-sun-fill' : 'bi-moon-stars-fill'}`} aria-hidden="true"></i>
          <span className="d-none d-xl-inline ms-1">{isDark ? 'Light' : 'Dark'}</span>
        </button>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNavbar"
          aria-controls="mainNavbar"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="mainNavbar">
          {/* Left links depend on who is logged in */}
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            {!isAuthenticated && (
              <>
                <li className="nav-item">
                  <NavLink className={linkClass} to="/">
                    Home
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className={linkClass} to="/jobs">
                    Find Jobs
                  </NavLink>
                </li>
              </>
            )}
            {isJobSeeker && (
              <>
                <li className="nav-item">
                  <NavLink className={linkClass} to="/dashboard">
                    Dashboard
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className={linkClass} to="/jobs">
                    Find Jobs
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className={linkClass} to="/applications">
                    Applications
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className={linkClass} to="/saved-jobs">
                    Saved Jobs
                  </NavLink>
                </li>
              </>
            )}
            {isRecruiter && (
              <>
                <li className="nav-item">
                  <NavLink className={linkClass} to="/recruiter/dashboard">
                    Dashboard
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className={linkClass} to="/recruiter/jobs">
                    My Jobs
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className={linkClass} to="/recruiter/jobs/create">
                    Post a Job
                  </NavLink>
                </li>
              </>
            )}
          </ul>

          {/* Right side: auth buttons or user menu */}
          <div className="d-flex align-items-center gap-2">
            {!isAuthenticated && (
              <>
                <Link className="btn btn-outline-primary" to="/login">
                  Login
                </Link>
                <Link className="btn btn-primary" to="/register">
                  Register
                </Link>
              </>
            )}
            {isAuthenticated && (
              <div className="dropdown">
                <button
                  className="btn btn-outline-primary dropdown-toggle"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="bi bi-person-circle me-1" aria-hidden="true"></i>
                  {user?.name?.split(' ')[0] || 'Account'}
                </button>
                <ul className="dropdown-menu dropdown-menu-end">
                  <li>
                    <span className="dropdown-item-text text-muted small">
                      {user?.email}
                      <br />
                      <span className="badge bg-primary mt-1">{user?.role}</span>
                    </span>
                  </li>
                  <li>
                    <hr className="dropdown-divider" />
                  </li>
                  {isJobSeeker && (
                    <li>
                      <Link className="dropdown-item" to="/profile">
                        <i className="bi bi-person me-2" aria-hidden="true"></i>My Profile
                      </Link>
                    </li>
                  )}
                  <li>
                    <button className="dropdown-item text-danger" onClick={handleLogout}>
                      <i className="bi bi-box-arrow-right me-2" aria-hidden="true"></i>Logout
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
