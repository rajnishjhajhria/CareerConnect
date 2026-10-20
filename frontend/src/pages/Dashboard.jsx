// CareerConnect — Job seeker dashboard (STEP 12)
// Everything on this page is computed client-side from THREE real APIs —
// no "dashboard endpoint" is needed (yet):
//   • GET /api/auth/me           → user + profile (via AuthContext)
//   • GET /api/applications/my   → all stats + the recent table
//   • GET /api/jobs?skills=…     → “picked for you” (falls back to newest)
// That keeps the backend small and makes every number traceable to a curl.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMyApplications, fetchJobs, getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { computeProfileCompletion } from '../utils/profile';
import { formatDate } from '../utils/format';
import DashboardSidebar from '../components/DashboardSidebar';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertMessage from '../components/AlertMessage';
import JobCard from '../components/JobCard';
import { STATUS_PILL } from '../utils/applicationStatuses';

const Dashboard = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  // Recommendation query = the seeker's own skills (max 5), newest fallback.
  const skillsCsv = useMemo(() => (user?.skills || []).slice(0, 5).join(','), [user?.skills]);

  useEffect(() => {
    let cancelled = false;
    const jobsPromise = fetchJobs(
      skillsCsv ? { skills: skillsCsv, limit: 3 } : { limit: 3 }
    );
    Promise.allSettled([fetchMyApplications(), jobsPromise]).then(([appsRes, jobsRes]) => {
      if (cancelled) return;
      if (appsRes.status === 'fulfilled') {
        setApplications(appsRes.value);
        setJobs(jobsRes.status === 'fulfilled' ? jobsRes.value.jobs : []); // optional panel
        setLoaded(true);
        setError('');
      } else {
        setError(getErrorMessage(appsRes.reason, 'Could not load your dashboard.'));
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [reloadTick, skillsCsv]);

  const stats = useMemo(() => {
    const s = { total: applications.length, pending: 0, shortlisted: 0, hired: 0, rejected: 0 };
    applications.forEach((a) => {
      if (a.status === 'applied' || a.status === 'reviewed') s.pending += 1;
      if (a.status === 'shortlisted') s.shortlisted += 1;
      if (a.status === 'hired') s.hired += 1;
      if (a.status === 'rejected') s.rejected += 1;
    });
    return s;
  }, [applications]);

  const profile = useMemo(() => computeProfileCompletion(user), [user]);

  if (!loaded) return <LoadingSpinner fullPage message="Loading your dashboard…" />;

  if (error) {
    return (
      <div className="container py-5" style={{ maxWidth: 560 }}>
        <AlertMessage type="danger" message={error} />
        <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setReloadTick((t) => t + 1)}>
          <i className="bi bi-arrow-clockwise me-1" aria-hidden="true"></i>Try again
        </button>
      </div>
    );
  }

  const firstName = (user?.name || 'there').split(' ')[0];
  const recent = applications.slice(0, 5);

  return (
    <div className="container py-4 py-lg-5">
      <div className="row g-4">
        <div className="col-lg-3">
          <DashboardSidebar />
        </div>

        <div className="col-lg-9">
          {/* greeting */}
          <div className="d-flex justify-content-between align-items-end flex-wrap gap-2 mb-4">
            <div>
              <h1 className="h4 mb-1">Hi {firstName} 👋</h1>
              <p className="text-muted mb-0 small">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                {user?.professionalTitle ? ` · ${user.professionalTitle}` : ''}
              </p>
            </div>
            <Link to="/jobs" className="btn btn-primary btn-sm">
              <i className="bi bi-search me-1" aria-hidden="true"></i>Find jobs
            </Link>
          </div>

          {/* stat row */}
          <div className="row g-3 mb-4">
            <div className="col-sm-6 col-xl-3">
              <StatCard icon="card-checklist" label="Total applications" value={stats.total} tone="primary" />
            </div>
            <div className="col-sm-6 col-xl-3">
              <StatCard icon="hourglass-split" label="In review" value={stats.pending} tone="info" />
            </div>
            <div className="col-sm-6 col-xl-3">
              <StatCard
                icon="star"
                label="Shortlisted"
                value={stats.shortlisted}
                tone="warning"
                sub={stats.hired > 0 ? `+${stats.hired} hired` : undefined}
              />
            </div>
            <div className="col-sm-6 col-xl-3">
              <StatCard icon="person-badge" label="Profile complete" value={`${profile.pct}%`} tone={profile.pct >= 80 ? 'success' : 'secondary'} />
            </div>
          </div>

          <div className="row g-3">
            {/* recent applications */}
            <div className="col-xl-7">
              <div className="card shadow-sm h-100">
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                  <span className="fw-semibold">
                    <i className="bi bi-clock-history me-1 text-primary" aria-hidden="true"></i>Recent applications
                  </span>
                  <Link to="/applications" className="small text-decoration-none">
                    View all →
                  </Link>
                </div>
                <div className="card-body p-0">
                  {recent.length === 0 ? (
                    <div className="text-center py-5 px-3">
                      <i className="bi bi-inbox display-5 text-muted" aria-hidden="true"></i>
                      <p className="text-muted mt-2 mb-3">You haven’t applied to anything yet.</p>
                      <Link to="/jobs" className="btn btn-sm btn-primary">Browse open jobs</Link>
                    </div>
                  ) : (
                    <ul className="list-group list-group-flush">
                      {recent.map((a) => (
                        <li key={a._id} className="list-group-item d-flex justify-content-between align-items-center gap-2 py-3">
                          <div className="min-w-0">
                            <p className="mb-0 fw-semibold text-truncate">
                              {a.job ? (
                                <Link to={`/jobs/${a.job._id}`} className="text-decoration-none cc-job-title">
                                  {a.job.title}
                                </Link>
                              ) : (
                                <span className="text-muted fst-italic">Job removed</span>
                              )}
                            </p>
                            <p className="small text-muted mb-0 text-truncate">
                              {a.job?.company || '—'} · Applied {formatDate(a.createdAt)}
                            </p>
                          </div>
                          <span className={`badge rounded-pill flex-shrink-0 ${STATUS_PILL[a.status] || 'text-bg-secondary'}`}>
                            {a.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* profile completeness nudge */}
            <div className="col-xl-5">
              <div className="card shadow-sm h-100">
                <div className="card-header bg-white fw-semibold">
                  <i className="bi bi-person-gear me-1 text-primary" aria-hidden="true"></i>Profile strength
                </div>
                <div className="card-body">
                  <div
                    className="progress mb-2"
                    role="progressbar"
                    aria-valuenow={profile.pct}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-label="Profile completeness"
                  >
                    <div
                      className={`progress-bar ${profile.pct >= 80 ? 'bg-success' : 'bg-primary'}`}
                      style={{ width: `${profile.pct}%` }}
                    >
                      {profile.pct}%
                    </div>
                  </div>
                  {profile.missingItems.length > 0 ? (
                    <>
                      <p className="small text-muted mb-2">Recruiters filter on these — finish to get picked for more roles:</p>
                      <ul className="list-unstyled small mb-3">
                        {profile.missingItems.slice(0, 4).map((m) => (
                          <li key={m.key} className="mb-1">
                            <i className="bi bi-circle text-primary me-2" aria-hidden="true"></i>
                            {m.missing}
                          </li>
                        ))}
                      </ul>
                      <Link to="/profile" className="btn btn-outline-primary btn-sm w-100">
                        Complete profile
                      </Link>
                    </>
                  ) : (
                    <p className="text-success small mb-0">
                      <i className="bi bi-check-circle me-1" aria-hidden="true"></i>Your profile is fully complete — nice work!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* recommendations */}
          <div className="mt-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h5 mb-0">
                <i className="bi bi-stars me-1 text-primary" aria-hidden="true"></i>
                {skillsCsv ? 'Picked for your skills' : 'Latest openings'}
              </h2>
              <Link to="/jobs" className="small text-decoration-none">
                See all jobs →
              </Link>
            </div>
            {jobs.length === 0 ? (
              <div className="card shadow-sm">
                <div className="card-body text-center py-4">
                  <p className="text-muted mb-2">No matches for {skillsCsv ? `your skills (${skillsCsv}) yet.` : 'you right now.'}</p>
                  {skillsCsv ? (
                    <Link to="/jobs" className="btn btn-sm btn-outline-primary">Browse all jobs instead</Link>
                  ) : (
                    <Link to="/profile" className="btn btn-sm btn-outline-primary">Add skills to unlock matches</Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="row">
                {jobs.map((j) => (
                  <div key={j._id} className="col-md-6 col-xl-4">
                    <JobCard job={j} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
