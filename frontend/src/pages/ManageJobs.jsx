// CareerConnect — Manage Jobs (STEP 15)
// The recruiter's own job table: every status (draft/live/closed), per-job
// applicant counts, and the four things you actually do with a posting —
// view, publish/close, edit, delete. Data is ONE pass of GET /api/jobs/mine
// (newest first, limit 50); status tabs + search filter client-side because
// a recruiter's own list is small — re-querying the server per keystroke
// would be the wrong trade here.
// Applicant counts come from the Step 14 summary endpoint (its $group
// already computed them — no second counting query per job). Delete goes
// through a confirm modal because it CASCADES (applications + resume files).
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  fetchMyJobs,
  fetchRecruiterSummary,
  updateJob,
  deleteJob,
  getErrorMessage,
} from '../services/api';
import { formatDate, salaryRange, daysUntil } from '../utils/format';
import DashboardSidebar from '../components/DashboardSidebar';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertMessage from '../components/AlertMessage';
import Modal from '../components/Modal';

// Status → badge. 'Live' reads better than 'active' to a user.
const STATUS_BADGE = {
  active: { label: 'Live', cls: 'success' },
  draft: { label: 'Draft', cls: 'secondary' },
  closed: { label: 'Closed', cls: 'danger' },
};

// One button per row, per current status. Labels say what the click DOES.
const NEXT_STATUS = { draft: 'active', active: 'closed', closed: 'active' };
const NEXT_LABEL = { draft: 'Publish', active: 'Close job', closed: 'Reopen' };

const TABS = ['all', 'active', 'draft', 'closed'];

const ManageJobs = () => {
  const location = useLocation();
  const [jobs, setJobs] = useState([]);
  const [counts, setCounts] = useState({}); // jobId -> total applications
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  // CreateJob/EditJob navigate here with state.notice — show it once on mount.
  const [notice, setNotice] = useState(() =>
    location.state?.notice ? { kind: 'success', text: location.state.notice } : { kind: 'info', text: '' }
  );
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(''); // row-level in-flight lock
  const [confirm, setConfirm] = useState(null); // job picked for delete
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Summary is best-effort here — if it fails the table still renders,
    // just with '—' counts.
    Promise.all([
      fetchMyJobs({ limit: 50 }),
      fetchRecruiterSummary().catch(() => null),
    ])
      .then(([mine, summary]) => {
        if (cancelled) return;
        setJobs(mine.jobs);
        const map = {};
        (summary?.perJob || []).forEach((j) => {
          map[j._id] = j.counts.total;
        });
        setCounts(map);
        setLoaded(true);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getErrorMessage(err, 'Could not load your jobs.'));
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  const visible = jobs.filter((job) => {
    if (tab !== 'all' && job.status !== tab) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [job.title, job.location, job.category].some((v) =>
      String(v || '').toLowerCase().includes(q)
    );
  });

  const handleToggle = async (job) => {
    const status = NEXT_STATUS[job.status];
    setBusyId(job._id);
    try {
      const updated = await updateJob(job._id, { status });
      // Patch the row in place — no refetch round-trip for one field.
      setJobs((prev) => prev.map((j) => (j._id === job._id ? updated : j)));
      setNotice({
        kind: 'success',
        text:
          status === 'active'
            ? `“${job.title}” is live on the job board ✓`
            : `“${job.title}” is closed — no new applications ✓`,
      });
    } catch (err) {
      setNotice({ kind: 'danger', text: getErrorMessage(err, 'Could not update the job.') });
    } finally {
      setBusyId('');
    }
  };

  const confirmDelete = async () => {
    if (!confirm) return;
    setDeleting(true);
    try {
      const res = await deleteJob(confirm._id);
      setConfirm(null);
      // Full refetch: the job count AND applicant totals (via summary) moved.
      setReloadTick((t) => t + 1);
      setLoaded(false);
      setNotice({ kind: 'success', text: res.message || 'Job deleted ✓' });
    } catch (err) {
      setNotice({ kind: 'danger', text: getErrorMessage(err, 'Could not delete the job.') });
    } finally {
      setDeleting(false);
    }
  };

  if (!loaded) return <LoadingSpinner fullPage message="Loading your jobs…" />;

  if (error) {
    return (
      <div className="container py-5" style={{ maxWidth: 560 }}>
        <AlertMessage type="danger" message={error} />
        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={() => {
            setLoaded(false);
            setReloadTick((t) => t + 1);
          }}
        >
          <i className="bi bi-arrow-clockwise me-1" aria-hidden="true"></i>Try again
        </button>
      </div>
    );
  }

  return (
    <div className="container py-4 py-lg-5">
      <div className="row g-4">
        <div className="col-lg-3">
          <DashboardSidebar />
        </div>

        <div className="col-lg-9">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1">
            <h4 className="mb-0">Manage Jobs</h4>
            <Link to="/recruiter/jobs/create" className="btn btn-primary btn-sm">
              <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>Post a Job
            </Link>
          </div>
          <p className="text-muted small mb-3">
            {jobs.length} job{jobs.length === 1 ? '' : 's'} total — drafts stay invisible to
            seekers until you publish them.
          </p>

          {notice.text && (
            <AlertMessage type={notice.kind} message={notice.text} onClose={() => setNotice({ kind: 'info', text: '' })} />
          )}

          {/* Filter row: status tabs + name search (both client-side) */}
          <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
            <div className="btn-group btn-group-sm" role="group" aria-label="Filter by status">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`btn btn-outline-primary${tab === t ? ' active' : ''}`}
                  onClick={() => setTab(t)}
                >
                  {t === 'all' ? 'All' : STATUS_BADGE[t].label}
                  <span className="ms-1 badge text-bg-light">{t === 'all' ? jobs.length : jobs.filter((j) => j.status === t).length}</span>
                </button>
              ))}
            </div>
            <div className="ms-auto" style={{ minWidth: 220 }}>
              <input
                type="search"
                className="form-control form-control-sm"
                placeholder="Search my jobs…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search within my jobs"
              />
            </div>
          </div>

          {jobs.length === 0 ? (
            <div className="text-center bg-white border rounded-4 py-5 px-3">
              <i className="bi bi-briefcase fs-1 text-muted d-block mb-2" aria-hidden="true"></i>
              <h6>No jobs yet</h6>
              <p className="text-muted small mb-3">Post your first opening and seekers will find it on the job board instantly.</p>
              <Link to="/recruiter/jobs/create" className="btn btn-primary btn-sm">
                <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>Post a Job
              </Link>
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center bg-white border rounded-4 py-5 px-3">
              <i className="bi bi-funnel fs-1 text-muted d-block mb-2" aria-hidden="true"></i>
              <h6>No jobs match this filter</h6>
              <button type="button" className="btn btn-outline-secondary btn-sm mt-1" onClick={() => { setTab('all'); setQuery(''); }}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className="card shadow-sm">
              <div className="d-md-none p-2 d-grid gap-2">
                {visible.map((job) => {
                  const badge = STATUS_BADGE[job.status] || STATUS_BADGE.draft;
                  const count = counts[job._id];
                  const soon = job.status === 'active' && daysUntil(job.deadline) <= 7;
                  return (
                    <article key={job._id} className="border rounded-3 p-3 bg-body">
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <div className="min-w-0">
                          <Link to={`/jobs/${job._id}`} className="fw-semibold text-decoration-none d-block">
                            {job.title}
                          </Link>
                          <p className="text-muted small mb-0 mt-1">
                            <i className="bi bi-geo-alt me-1" aria-hidden="true"></i>{job.location}
                            <span className="mx-1">·</span>{job.category}
                          </p>
                        </div>
                        <span className={`badge rounded-pill text-bg-${badge.cls}`}>{badge.label}</span>
                      </div>
                      <div className="d-grid gap-1 small text-muted mt-3">
                        <span>{salaryRange(job.salaryMin, job.salaryMax)}</span>
                        <span>Deadline: {formatDate(job.deadline)}{soon ? ` · closing in ${daysUntil(job.deadline)}d` : ''}</span>
                        <Link to={`/recruiter/jobs/${job._id}/applicants`} className="text-decoration-none">
                          {count == null ? '—' : count} applicant{count === 1 ? '' : 's'}
                        </Link>
                      </div>
                      <div className="d-flex gap-2 mt-3">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary flex-fill"
                          disabled={busyId === job._id}
                          onClick={() => handleToggle(job)}
                        >
                          <i className={`bi bi-${job.status === 'active' ? 'lock' : 'send-check'} me-1`} aria-hidden="true"></i>
                          {NEXT_LABEL[job.status]}
                        </button>
                        <Link to={`/recruiter/jobs/${job._id}/edit`} className="btn btn-sm btn-outline-secondary flex-fill">
                          <i className="bi bi-pencil me-1" aria-hidden="true"></i>Edit
                        </Link>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          disabled={busyId === job._id}
                          onClick={() => setConfirm(job)}
                          aria-label={`Delete ${job.title}`}
                        >
                          <i className="bi bi-trash" aria-hidden="true"></i>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className="table-responsive d-none d-md-block">
                <table className="table align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Job</th>
                      <th>Status</th>
                      <th className="text-center">Applicants</th>
                      <th>Salary</th>
                      <th>Deadline</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((job) => {
                      const badge = STATUS_BADGE[job.status] || STATUS_BADGE.draft;
                      const count = counts[job._id];
                      const soon = job.status === 'active' && daysUntil(job.deadline) <= 7;
                      return (
                        <tr key={job._id}>
                          <td className="text-nowrap">
                            <Link to={`/jobs/${job._id}`} className="fw-semibold text-decoration-none">
                              {job.title}
                            </Link>
                            <p className="text-muted small mb-0">
                              <i className="bi bi-geo-alt me-1" aria-hidden="true"></i>{job.location}
                              <span className="mx-1">·</span>
                              {job.category}
                            </p>
                          </td>
                          <td>
                            <span className={`badge rounded-pill text-bg-${badge.cls}`}>{badge.label}</span>
                          </td>
                          <td className="text-center">
                            <Link
                              to={`/recruiter/jobs/${job._id}/applicants`}
                              className={`btn btn-sm py-0 px-2 fw-semibold text-decoration-none ${count > 0 ? 'btn-primary' : 'btn-outline-secondary'}`}
                            >
                              {count == null ? '—' : count}
                            </Link>
                          </td>
                          <td className="text-nowrap small">{salaryRange(job.salaryMin, job.salaryMax)}</td>
                          <td className="text-nowrap small">
                            {formatDate(job.deadline)}
                            {soon && <p className="text-danger mb-0" style={{ fontSize: '0.72rem' }}>closing in {daysUntil(job.deadline)}d</p>}
                          </td>
                          <td className="text-end text-nowrap">
                            <div className="btn-group btn-group-sm" role="group" aria-label={`Actions for ${job.title}`}>
                              <button
                                type="button"
                                className="btn btn-outline-primary"
                                title={NEXT_LABEL[job.status]}
                                disabled={busyId === job._id}
                                onClick={() => handleToggle(job)}
                              >
                                <i className={`bi bi-${job.status === 'active' ? 'lock' : 'send-check'}`}></i>
                              </button>
                              <Link to={`/recruiter/jobs/${job._id}/edit`} className="btn btn-outline-secondary" title="Edit job">
                                <i className="bi bi-pencil" aria-hidden="true"></i>
                              </Link>
                              <button
                                type="button"
                                className="btn btn-outline-danger"
                                title="Delete job"
                                disabled={busyId === job._id}
                                onClick={() => setConfirm(job)}
                              >
                                <i className="bi bi-trash" aria-hidden="true"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="text-muted mt-3 mb-0" style={{ fontSize: '0.78rem' }}>
            <i className="bi bi-info-circle me-1" aria-hidden="true"></i>
            Editing and posting use the full form (Step 16). Deleting a job also removes its
            applications and resume files — the count badge shows what is at stake first.
          </p>
        </div>
      </div>

      {/* Delete confirmation — states the cascade cost before anything happens */}
      <Modal
        show={!!confirm}
        onClose={() => !deleting && setConfirm(null)}
        title="Delete this job?"
        footer={
          <>
            <button type="button" className="btn btn-outline-secondary btn-sm" disabled={deleting} onClick={() => setConfirm(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger btn-sm" disabled={deleting} onClick={confirmDelete}>
              {deleting ? <span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span> : <i className="bi bi-trash me-1" aria-hidden="true"></i>}
              Delete permanently
            </button>
          </>
        }
      >
        {confirm && (
          <>
            <p className="mb-2">
              <span className="fw-semibold">{confirm.title}</span>{' '}
              <span className={`badge rounded-pill text-bg-${(STATUS_BADGE[confirm.status] || {}).cls || 'secondary'}`}>
                {(STATUS_BADGE[confirm.status] || { label: confirm.status }).label}
              </span>
            </p>
            <div className="alert alert-warning py-2 small mb-0" role="alert">
              <i className="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>
              {counts[confirm._id] > 0 ? (
                <>This deletes the job <strong>and its {counts[confirm._id]} application{counts[confirm._id] > 1 ? 's' : ''}</strong> (resumes included). Seekers will lose it from “My Applications”.</>
              ) : (
                <>No applications on this job — deleting it just removes the posting.</>
              )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default ManageJobs;
