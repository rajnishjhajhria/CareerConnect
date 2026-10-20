// CareerConnect — My Applications (STEP 17)
// The seeker's tracker: everything they applied to, with the live status from
// Mongo (never a cached snapshot), a progress timeline per application
// (ApplicationTimeline), the cover letter they wrote, and their uploaded
// resume pulled back down through the same permission-checked route the
// recruiter uses. Filter tabs + counts are computed client-side from the
// single list request — the server also supports ?status= for when lists grow.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchMyApplications,
  downloadApplicationResume,
  getErrorMessage,
} from '../services/api';
import { APPLICATION_STATUSES, STATUS_PILL } from '../utils/applicationStatuses';
import { formatDate } from '../utils/format';
import ApplicationTimeline from '../components/ApplicationTimeline';
import DashboardSidebar from '../components/DashboardSidebar';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertMessage from '../components/AlertMessage';

const LABEL = {
  applied: 'Applied',
  reviewed: 'Under review',
  shortlisted: 'Shortlisted',
  hired: 'Hired',
  rejected: 'Rejected',
};

const Applications = () => {
  const [apps, setApps] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [tab, setTab] = useState('all');
  const [openLetter, setOpenLetter] = useState({}); // appId -> cover letter shown
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState({ kind: 'info', text: '' });

  useEffect(() => {
    let cancelled = false;
    fetchMyApplications()
      .then((list) => {
        if (!cancelled) {
          setApps(list);
          setLoaded(true);
          setError('');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getErrorMessage(err, 'Could not load your applications.'));
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  const counts = useMemo(() => {
    const m = { total: apps.length };
    apps.forEach((a) => {
      m[a.status] = (m[a.status] || 0) + 1;
    });
    return m;
  }, [apps]);

  const visible = tab === 'all' ? apps : apps.filter((a) => a.status === tab);

  const handleDownload = async (a) => {
    setBusyId(a._id);
    try {
      await downloadApplicationResume(a._id, a.resume?.originalName || 'my-resume');
      setNotice({ kind: 'success', text: 'Your resume saved to this device ✓' });
    } catch (err) {
      // error body is a Blob (responseType: 'blob') — parse it for the message
      let message = 'Could not download your resume.';
      const blob = err.response?.data;
      if (blob && typeof blob.text === 'function') {
        try {
          message = JSON.parse(await blob.text()).message || message;
        } catch {
          /* non-JSON body — keep default */
        }
      }
      setNotice({ kind: 'danger', text: message });
    } finally {
      setBusyId('');
    }
  };

  if (!loaded) return <LoadingSpinner fullPage message="Loading your applications…" />;

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
          <h4 className="mb-1">My Applications</h4>
          <p className="text-muted small mb-3">
            {counts.total} application{counts.total === 1 ? '' : 's'} —{' '}
            {counts.applied || 0} awaiting review
            {counts.reviewed ? ` · ${counts.reviewed} under review` : ''}
            {counts.shortlisted ? ` · ${counts.shortlisted} shortlisted` : ''}
            {counts.hired ? ` · ${counts.hired} hired 🎉` : ''}
          </p>

          {notice.text && (
            <AlertMessage
              type={notice.kind}
              message={notice.text}
              onClose={() => setNotice({ kind: 'info', text: '' })}
            />
          )}

          {counts.total === 0 ? (
            <div className="text-center bg-white border rounded-4 py-5 px-3">
              <i className="bi bi-kanban fs-1 text-muted d-block mb-2" aria-hidden="true"></i>
              <h6>No applications yet</h6>
              <p className="text-muted small mb-3">
                When you apply to a job, it shows up here with its live status.
              </p>
              <Link to="/jobs" className="btn btn-primary btn-sm">
                Browse jobs
              </Link>
            </div>
          ) : (
            <>
              <div className="btn-group btn-group-sm mb-3 flex-wrap" role="group" aria-label="Filter by status">
                {['all', ...APPLICATION_STATUSES].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`btn btn-outline-primary${tab === t ? ' active' : ''}`}
                    onClick={() => setTab(t)}
                  >
                    {t === 'all' ? 'All' : LABEL[t]}
                    <span className="ms-1 badge text-bg-light">{t === 'all' ? counts.total : counts[t] || 0}</span>
                  </button>
                ))}
              </div>

              {visible.length === 0 ? (
                <div className="text-center bg-white border rounded-4 py-5 px-3">
                  <i className="bi bi-funnel fs-1 text-muted d-block mb-2" aria-hidden="true"></i>
                  <h6>Nothing here with status “{LABEL[tab]}” yet</h6>
                  <button type="button" className="btn btn-outline-secondary btn-sm mt-1" onClick={() => setTab('all')}>
                    Show all
                  </button>
                </div>
              ) : (
                visible.map((a) => (
                  <div key={a._id} className="card shadow-sm mb-3">
                    <div className="card-body">
                      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                        <div className="min-w-0">
                          {a.job ? (
                            <h6 className="mb-1">
                              <Link to={`/jobs/${a.job._id}`} className="text-decoration-none">
                                {a.job.title}
                              </Link>
                            </h6>
                          ) : (
                            <h6 className="mb-1 text-muted">
                              <i className="bi bi-exclamation-circle me-1" aria-hidden="true"></i>
                              This job was removed by the recruiter
                            </h6>
                          )}
                          <p className="text-muted small mb-0">
                            {a.job ? (
                              <>
                                <i className="bi bi-building me-1" aria-hidden="true"></i>
                                {a.job.company}
                                <span className="mx-1">·</span>
                                <i className="bi bi-geo-alt me-1" aria-hidden="true"></i>
                                {a.job.location}
                                <span className="mx-1">·</span>
                                {a.job.jobType}
                              </>
                            ) : (
                              <>Applied {formatDate(a.createdAt)} — your application record is kept for your history</>
                            )}
                          </p>
                          {a.job?.status === 'closed' && (
                            <span className="badge text-bg-secondary mt-2" style={{ fontSize: '0.68rem' }}>
                              Job closed for new applicants later — your application still counts
                            </span>
                          )}
                        </div>
                        <span className={`badge rounded-pill ${STATUS_PILL[a.status] || 'text-bg-secondary'}`}>
                          {LABEL[a.status] || a.status}
                        </span>
                      </div>

                      <hr className="my-3" />

                      <ApplicationTimeline
                        status={a.status}
                        createdAt={a.createdAt}
                        reviewedAt={a.reviewedAt}
                        statusNote={a.statusNote}
                      />

                      <div className="d-flex flex-wrap gap-2 mt-3">
                        {a.coverLetter && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setOpenLetter((m) => ({ ...m, [a._id]: !m[a._id] }))}
                          >
                            <i className={`bi bi-chevron-${openLetter[a._id] ? 'up' : 'down'} me-1`}></i>
                            {openLetter[a._id] ? 'Hide cover letter' : 'Show cover letter'}
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          disabled={busyId === a._id}
                          onClick={() => handleDownload(a)}
                        >
                          {busyId === a._id ? (
                            <span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
                          ) : (
                            <i className="bi bi-download me-1" aria-hidden="true"></i>
                          )}
                          My resume
                        </button>
                        {a.job && (
                          <Link to={`/jobs/${a.job._id}`} className="btn btn-sm btn-outline-primary">
                            <i className="bi bi-box-arrow-up-right me-1" aria-hidden="true"></i>View job
                          </Link>
                        )}
                      </div>

                      {openLetter[a._id] && a.coverLetter && (
                        <div
                          className="small bg-light border rounded p-3 mt-2"
                          style={{ whiteSpace: 'pre-wrap' }}
                        >
                          {a.coverLetter}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          <p className="text-muted mt-2 mb-0" style={{ fontSize: '0.78rem' }}>
            <i className="bi bi-info-circle me-1" aria-hidden="true"></i>
            Statuses are updated by the recruiter (Step 19). Download “My resume” any time — it is
            served back from the server, not cached in the browser.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Applications;
