// CareerConnect — dashboard sidebar (STEP 12; reused by the recruiter
// dashboard in STEP 15). Role decides which link set renders; NavLink gives
// the active state for free. Links to pages that are still placeholders work —
// they just land on the "coming in Step X" notice until that step lands.
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SEEKER_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'speedometer2', end: true },
  { to: '/profile', label: 'My Profile', icon: 'person-circle' },
  { to: '/applications', label: 'My Applications', icon: 'card-checklist' },
  { to: '/saved-jobs', label: 'Saved Jobs', icon: 'bookmark' },
];

// (Company-profile edit intentionally not linked until the recruiter form exists.)
const RECRUITER_LINKS = [
  { to: '/recruiter/dashboard', label: 'Dashboard', icon: 'speedometer2', end: true },
  { to: '/recruiter/jobs', label: 'Manage Jobs', icon: 'briefcase' },
  { to: '/recruiter/jobs/create', label: 'Post a Job', icon: 'plus-circle' },
  { to: '/profile', label: 'Company Profile', icon: 'building' },
];

const DashboardSidebar = () => {
  const { isRecruiter, user } = useAuth();
  const links = isRecruiter ? RECRUITER_LINKS : SEEKER_LINKS;

  return (
    <div className="card shadow-sm">
      <div className="card-body d-flex align-items-center gap-2 border-bottom py-2">
        <span className="cc-company-avatar" style={{ width: 36, height: 36, fontSize: '1rem' }} aria-hidden="true">
          {(user?.name || '?').trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="fw-semibold mb-0 text-truncate small">{user?.name}</p>
          <p className="text-muted mb-0" style={{ fontSize: '0.72rem' }}>
            {isRecruiter ? 'Recruiter' : 'Job Seeker'}
          </p>
        </div>
      </div>
      <div className="card-body p-2">
        <nav className="nav flex-column" aria-label="Dashboard sections">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => `cc-dash-link${isActive ? ' active' : ''}`}
            >
              <i className={`bi bi-${l.icon} me-2`}></i>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default DashboardSidebar;
