// CareerConnect — Recruiter dashboard (STEP 14)
// One endpoint does the work: GET /api/applications/recruiter/summary returns
// job counts, a per-job application FUNNEL (one $group aggregation — not a
// query per job) and the most recent applicants across all of the recruiter's
// jobs. Resume buttons stream through axios because the download route is
// Bearer-protected — a plain <a href> could not authenticate.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchRecruiterSummary,
  downloadApplicationResume,
  getErrorMessage,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { STATUS_PILL } from '../utils/applicationStatuses';
import { formatDate, daysUntil } from '../utils/format';
import DashboardSidebar from '../components/DashboardSidebar';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertMessage from '../components/AlertMessage';

const FUNNEL = ['applied', 'reviewed', 'shortlisted', 'hired', 'rejected'];

const RecruiterDashboard = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [notice, setNotice] = useState({ kind: 'info', text: '' });

  useEffect(() => {
    let cancelled = false;
    fetchRecruiterSummary()
      .then((data) => {
        if (!cancelled) {
          setSummary(data);
          setLoaded(true);
          setError('');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getErrorMessage(err, 'Could not load your dashboard.'));
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  const handleDownload = async (row) => {
    try {
      await downloadApplicationResume(
        row.applicationId,
        `${row.applicant?.name || 'applicant'}-resume`
      );
      setNotice({ kind: 'success', text: `Saved ${row.applicant?.name || 'the applicant'}’s resume ✓` });
    } catch (err) {
      // error body is a Blob (responseType) — extract the server message if present
      let message = 'Could not download the resume.';
      const blob = err.response?.data;
      if (blob && typeof blob.text === 'function') {
        try {
          message = JSON.parse(await blob.text()).message || message;
        } catch {
          /* non-JSON error body — keep default */
        }
      }
      setNotice({ kind: 'danger', text: message });
    }
  };

  if (!loaded) return <LoadingSpinner fullPage message="Loading your dashboard…" />;

  if (error) {
    return (
      <div className="container py-5" style={{ maxWidth: 560 }}>
        <AlertMessage type="danger" message={error} />
        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={() => setReloadTick((t) => t + 1)}
        >
          <i className="bi bi-arrow-clockwise me-1" aria-hidden="true"></i>Try again
        </button>
      </div>
    );
  }

  const firstName = (user?.name || 'there').split(' ')[0];
  const jobs = summary.jobs;
  const apps = summary.applications;
  const inReview = apps.applied + apps.reviewed;

  return (
    <div className="container py-4 py-lg-5">
      <div className="row g-4">
        <div className="col-lg-3">
          <DashboardSidebar />
        </div>

        <div className="col-lg-9">
          <div className="d-flex justify-content-between align-items-end flex-wrap gap-2 mb-4">
            <div>
              <h1 className="h4 mb-1">Welcome back, {firstName} 👋</h1>
              <p className="text-muted mb-0 small">Your hiring pipeline at a glance</p>
            </div>
            <div className="d-flex gap-2">
              <Link to="/recruiter/jobs/create" className="btn btn-primary btn-sm">
                <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>Post a job
              </Link>
              <Link to="/recruiter/jobs" className="btn btn-outline-primary btn-sm">
                <i className="bi bi-briefcase me-1" aria-hidden="true"></i>Manage jobs
              </Link>
            </div>
          </div>

          {/* stat row */}
          <div className="row g-3 mb-4">
            <div className="col-sm-6 col-xl-3">
              <StatCard
                icon="briefcase"
                label="Active jobs"
                value={jobs.active}
                tone="primary"
                sub={`${jobs.draft} draft · ${jobs.closed} closed`}
              />
            </div>
            <div className="col-sm-6 col-xl-3">
              <StatCard
                icon="inbox"
                label="Applications"
                value={apps.total}
                tone="info"
                sub={`+${apps.newThisWeek} this week`}
              />
            </div>
            <div className="col-sm-6 col-xl-3">
              <StatCard icon="hourglass-split" label="Awaiting review" value={inReview} tone="secondary" />
            </div>
            <div className="col-sm-6 col-xl-3">
              <StatCard
                icon="star"
                label="Shortlisted"
                value={apps.shortlisted}
                tone="warning"
                sub={apps.hired > 0 ? `+${apps.hired} hired` : undefined}
              />
            </div>
          </div>

          <AlertMessage
            type={notice.kind}
            message={notice.text}
            onClose={() => setNotice({ kind: 'info', text: '' })}
          />

          <div className="row g-3">
            {/* per-job funnel */}
            <div className="col-xl-6">
              <div className="card shadow-sm h-100">
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                  <span className="fw-semibold">
                    <i className="bi bi-funnel me-1 text-primary" aria-hidden="true"></i>Applications per job
                  </span>
                  <Link to="/recruiter/jobs" className="small text-decoration-none">
                    Manage →
                  </Link>
                </div>
                <div className="card-body p-0">
                  {summary.perJob.length === 0 ? (
                    <div className="text-center py-5 px-3">
                      <i className="bi bi-emoji-smile display-5 text-muted" aria-hidden="true"></i>
                      <p className="text-muted mt-2 mb-3">You haven’t posted a job yet.</p>
                      <Link to="/recruiter/jobs/create" className="btn btn-sm btn-primary">
                        Post your first job
                      </Link>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0 cc-recruiter-funnel-table">
                        <thead className="table-light">
                          <tr>
                            <th>Job</th>
                            <th className="d-none">Deadline</th>
                            <th className="text-center text-nowrap">Apps</th>
                            <th>Pipeline</th>
                            <th className="text-end">Review</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.perJob.map((job) => (
                            <tr key={job._id}>
                              <td className="min-w-0">
                                <p className="fw-semibold mb-0 text-break">
                                  <Link to={`/jobs/${job._id}`} className="text-decoration-none cc-job-title">
                                    {job.title}
                                  </Link>
                                </p>
                                <span
                                  className={`badge ${
                                    job.status === 'active'
                                      ? 'text-bg-success'
                                      : job.status === 'draft'
                                        ? 'text-bg-warning'
                                        : 'text-bg-secondary'
                                  }`}
                                >
                                  {job.status}
                                </span>
                              </td>
                              <td className="d-none">
                                {job.status === 'draft' ? (
                                  <span className="text-muted">—</span>
                                ) : (
                                  <span className={job.closingSoon ? 'text-danger fw-semibold' : 'text-muted'}>
                                    {job.closingSoon
                                      ? `⏳ ${daysUntil(job.deadline)}d left`
                                      : formatDate(job.deadline)}
                                  </span>
                                )}
                              </td>
                              <td className="text-center fw-semibold">{job.counts.total}</td>
                              <td>
                                <div className="d-flex flex-wrap gap-1 cc-funnel-counts">
                                  {FUNNEL.map((s) => (
                                    <span
                                      key={s}
                                      title={`${job.counts[s]} ${s}`}
                                      className={`badge rounded-pill ${
                                        job.counts[s] > 0 ? STATUS_PILL[s] : 'text-bg-light border text-muted'
                                      }`}
                                    >
                                      {job.counts[s]}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="text-end">
                                <Link
                                  to={`/recruiter/jobs/${job._id}/applicants`}
                                  className="btn btn-sm btn-outline-primary"
                                >
                                  Review
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* recent applicants */}
            <div className="col-xl-6">
              <div className="card shadow-sm h-100">
                <div className="card-header bg-white fw-semibold">
                  <i className="bi bi-person-check me-1 text-primary" aria-hidden="true"></i>Recent applicants
                </div>
                <div className="card-body p-0">
                  {summary.recent.length === 0 ? (
                    <div className="text-center py-5 px-3">
                      <i className="bi bi-person-dash display-5 text-muted" aria-hidden="true"></i>
                      <p className="text-muted mt-2 mb-0 small">
                        No applications yet. Share your job links — applicants show up here the
                        moment they apply.
                      </p>
                    </div>
                  ) : (
                    <ul className="list-group list-group-flush">
                      {summary.recent.map((row) => (
                        <li key={row.applicationId} className="list-group-item d-flex flex-wrap align-items-center gap-2 py-3">
                          <span
                            className="cc-company-avatar flex-shrink-0"
                            style={{ width: 36, height: 36, fontSize: '1rem' }}
                            aria-hidden="true"
                          >
                            {(row.applicant?.name || '?').trim().charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0 flex-grow-1">
                            <p className="mb-0 fw-semibold text-truncate small">
                              {row.applicant?.name || (
                                <span className="text-muted fst-italic">Deleted account</span>
                              )}
                            </p>
                            {row.applicant?.email && (
                              <a
                                href={`mailto:${row.applicant.email}`}
                                className="small text-muted text-truncate d-block"
                                title={`Email ${row.applicant.email}`}
                              >
                                {row.applicant.email}
                              </a>
                            )}
                            <p className="small text-muted mb-0 text-truncate">
                              {row.job?.title || 'Job removed'} · {formatDate(row.createdAt)}
                            </p>
                          </div>
                          <div className="ms-auto d-flex align-items-center gap-2">
                            <span
                              className={`badge rounded-pill flex-shrink-0 ${
                                STATUS_PILL[row.status] || 'text-bg-secondary'
                              }`}
                            >
                              {row.status}
                            </span>
                            {row.job?._id && (
                              <Link
                                to={`/recruiter/jobs/${row.job._id}/applicants`}
                                className="btn btn-sm btn-outline-primary flex-shrink-0"
                                title="Review applicants and update status"
                              >
                                Review
                              </Link>
                            )}
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary flex-shrink-0"
                              title="Download resume"
                              aria-label={`Download resume of ${row.applicant?.name || 'applicant'}`}
                              onClick={() => handleDownload(row)}
                            >
                              <i className="bi bi-download" aria-hidden="true"></i>
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecruiterDashboard;
