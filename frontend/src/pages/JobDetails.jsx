// CareerConnect — Job details page (STEP 10; real Apply flow wired in STEP 11)
// Public page: anyone can view an active/closed job; drafts are visible only
// to the recruiter who created them (the backend returns 404, so a stranger
// learns nothing about existing drafts).
// Apply now submits a genuine multipart request (Multer → uploads/ on disk,
// Application doc in Mongo, unique index = apply-once). Save stays a Step 17
// announcement; the guest→login→back round-trip reuses Step 5's from-state.
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  fetchJob,
  fetchJobs,
  toggleSavedJob,
  fetchMyApplications,
  applyToJob,
  getErrorMessage,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertMessage from '../components/AlertMessage';
import Modal from '../components/Modal';
import JobCard from '../components/JobCard';
import { salaryRange, formatDate, daysUntil } from '../utils/format';

const MAX_RESUME_BYTES = 2 * 1024 * 1024; // mirror of the server limit
const RESUME_EXT = /\.(pdf|doc|docx)$/i;

const JobDetails = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isJobSeeker, isRecruiter, user } = useAuth();

  const [fetched, setFetched] = useState(null); // { key, job, error, status }
  const [retryTick, setRetryTick] = useState(0);
  const [similar, setSimilar] = useState([]);
  const [notice, setNotice] = useState({ kind: 'info', text: '' }); // page-level alert
  const [copied, setCopied] = useState(false);

  // Apply modal state (STEP 11)
  const [showApply, setShowApply] = useState(false);
  const [file, setFile] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [applied, setApplied] = useState(false); // real: checked against the API
  const [savedOverrides, setSavedOverrides] = useState({}); // STEP 18: keyed by job id, so navigating to another job can't inherit a stale toggle
  const fileInputRef = useRef(null);

  const loading = fetched?.key !== id;
  const job = fetched?.key === id && !fetched.error ? fetched.job : null;
  const error = fetched?.key === id ? fetched.error : '';
  const is404 = fetched?.key === id && fetched.status === 404;

  useEffect(() => {
    let cancelled = false;
    fetchJob(id)
      .then((data) => {
        if (!cancelled) setFetched({ key: id, job: data, error: '', status: 200 });
      })
      .catch((err) => {
        if (!cancelled) {
          setFetched({
            key: id,
            job: null,
            error: getErrorMessage(err, 'Could not load this job.'),
            status: err.response?.status ?? 0,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, retryTick]);

  // “Have I already applied?” — answered by the API, not localStorage, so a
  // refresh (or another tab) shows the truth.
  useEffect(() => {
    if (!isAuthenticated || !isJobSeeker) return;
    let cancelled = false;
    fetchMyApplications()
      .then((list) => {
        if (!cancelled) setApplied(list.some((a) => (a.job?._id ?? a.job) === id));
      })
      .catch(() => {}); // best-effort: Apply button is the fallback check
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isJobSeeker, id]);

  // “More jobs like this” — reuses the public list API, same category,
  // drops the current job client-side (a dedicated endpoint would be overkill).
  useEffect(() => {
    if (!job?.category) return;
    let cancelled = false;
    fetchJobs({ category: job.category, limit: 4 })
      .then((data) => {
        if (!cancelled) setSimilar(data.jobs.filter((j) => j._id !== job._id).slice(0, 3));
      })
      .catch(() => {
        if (!cancelled) setSimilar([]); // panel is optional — never blocks the page
      });
    return () => {
      cancelled = true;
    };
  }, [job]);

  if (loading) return <LoadingSpinner fullPage message="Loading job…" />;

  if (is404) {
    return (
      <div className="container py-5">
        <div className="mx-auto text-center" style={{ maxWidth: 480 }}>
          <i className="bi bi-file-earmark-x display-3 text-muted" aria-hidden="true"></i>
          <h1 className="h4 mt-3">Job not found</h1>
          <p className="text-muted">
            It may have been removed by the recruiter, or it is still a draft that only its
            author can see.
          </p>
          <Link to="/jobs" className="btn btn-primary">
            <i className="bi bi-arrow-left me-1" aria-hidden="true"></i>Browse open jobs
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5" style={{ maxWidth: 560 }}>
        <AlertMessage type="danger" message={error} />
        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={() => setRetryTick((t) => t + 1)}
        >
          <i className="bi bi-arrow-clockwise me-1" aria-hidden="true"></i>Try again
        </button>
      </div>
    );
  }

  // ----- derived UI state -----
  const daysLeft = daysUntil(job.deadline);
  const deadlinePassed = new Date(job.deadline) < new Date();
  const isClosed = job.status === 'closed';
  const isDraft = job.status === 'draft';
  const applyBlocked = isClosed || isDraft || deadlinePassed;
  // STEP 18: server truth (job.savedByViewer) unless the user toggled on THIS
  // visit — per-id overrides, so hopping between jobs can't inherit a stale flip.
  const saved = savedOverrides[id] ?? !!job?.savedByViewer;
  const isOwner = !!user && !!job.postedBy && (user._id || user.id) === job.postedBy._id;
  const experienceLabel =
    job.experience === 0
      ? 'Open to freshers'
      : `${job.experience} year${job.experience === 1 ? '' : 's'} of experience`;

  // ----- actions -----
  const handleApplyClick = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    if (isRecruiter) {
      setNotice({ kind: 'info', text: 'You are logged in as a recruiter — applications are submitted by job seeker accounts.' });
      return;
    }
    setApplyError('');
    setShowApply(true);
  };

  const closeApplyModal = () => {
    setShowApply(false);
    setApplyError('');
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    // Client-side mirror of the server rules — good UX, never the real guard.
    if (!file) {
      setApplyError('Please attach your resume (PDF, DOC or DOCX, max 2 MB).');
      return;
    }
    if (file.size > MAX_RESUME_BYTES) {
      setApplyError(`Resume is ${(file.size / 1048576).toFixed(1)} MB — the limit is 2 MB.`);
      return;
    }
    if (!RESUME_EXT.test(file.name)) {
      setApplyError('Only PDF, DOC and DOCX resumes are accepted.');
      return;
    }
    setApplying(true);
    setApplyError('');
    try {
      await applyToJob(id, { resumeFile: file, coverLetter });
      setApplied(true);
      closeApplyModal();
      setFile(null);
      setCoverLetter('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setNotice({ kind: 'success', text: 'Application submitted! Track its status in My Applications.' });
    } catch (err) {
      const status = err.response?.status;
      if (status === 409) {
        setApplied(true); // server corrected our view — reflect it immediately
        closeApplyModal();
        setNotice({ kind: 'info', text: 'You have already applied to this job — it is in My Applications.' });
        return;
      }
      setApplyError(getErrorMessage(err, 'Could not submit the application. Please try again.'));
    } finally {
      setApplying(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setNotice({ kind: 'info', text: window.location.href });
    }
  };

  const statusBadge = isDraft ? (
    <span className="badge text-bg-warning">Draft — only you can see this</span>
  ) : isClosed ? (
    <span className="badge text-bg-secondary">Closed</span>
  ) : deadlinePassed ? (
    <span className="badge text-bg-danger">Deadline passed</span>
  ) : (
    <span className="badge text-bg-success">Open</span>
  );

  return (
    <div className="container py-4 py-lg-5">
      {/* breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb small mb-0">
          <li className="breadcrumb-item">
            <Link to="/jobs">Jobs</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {job.title}
          </li>
        </ol>
      </nav>

      <div className="row g-4">
        {/* ============ MAIN COLUMN ============ */}
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                <div>
                  <h1 className="h3 mb-1">{job.title}</h1>
                  <p className="text-muted mb-2">
                    <i className="bi bi-buildings me-1" aria-hidden="true"></i>
                    {job.company}
                    <span className="mx-2">·</span>
                    <i className="bi bi-geo-alt me-1" aria-hidden="true"></i>
                    {job.location}
                  </p>
                </div>
                <div className="text-end">{statusBadge}</div>
              </div>

              <div className="d-flex flex-wrap gap-2 mt-2">
                <span className="badge rounded-pill bg-primary-subtle text-primary-emphasis border">
                  <i className="bi bi-briefcase me-1" aria-hidden="true"></i>
                  {job.jobType}
                </span>
                <span className="badge rounded-pill bg-secondary-subtle text-secondary-emphasis border">
                  <i className="bi bi-clock-history me-1" aria-hidden="true"></i>
                  {experienceLabel}
                </span>
                {job.category && (
                  <span className="badge rounded-pill bg-info-subtle text-info-emphasis border">
                    {job.category}
                  </span>
                )}
              </div>

              {/* mobile salary/deadline summary (desktop has the sidebar card) */}
              <div className="d-lg-none mt-3 p-3 rounded bg-body-tertiary border">
                <div className="fw-semibold text-primary">
                  {salaryRange(job.salaryMin, job.salaryMax)}{' '}
                  <span className="text-muted fw-normal small">/ year</span>
                </div>
                <small className="text-muted">
                  <i className="bi bi-calendar-event me-1" aria-hidden="true"></i>
                  {isClosed || deadlinePassed ? 'Deadline passed — closed' : `Apply before ${formatDate(job.deadline)}`}
                </small>
              </div>

              <AlertMessage
                type={notice.kind}
                message={notice.text}
                onClose={() => setNotice({ kind: 'info', text: '' })}
              />

              <h2 className="h6 text-uppercase text-muted cc-filter-label mt-4 mb-2">Description</h2>
              <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                {job.description}
              </p>

              {job.responsibilities?.length > 0 && (
                <>
                  <h2 className="h6 text-uppercase text-muted cc-filter-label mt-4 mb-2">
                    Responsibilities
                  </h2>
                  <ul className="mb-0">
                    {job.responsibilities.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </>
              )}

              {job.requirements?.length > 0 && (
                <>
                  <h2 className="h6 text-uppercase text-muted cc-filter-label mt-4 mb-2">
                    Requirements
                  </h2>
                  <ul className="mb-0">
                    {job.requirements.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </>
              )}

              {job.skills?.length > 0 && (
                <>
                  <h2 className="h6 text-uppercase text-muted cc-filter-label mt-4 mb-2">Skills</h2>
                  <div className="d-flex flex-wrap gap-2">
                    {job.skills.map((s) => (
                      <span key={s} className="badge rounded-pill text-bg-light border px-2 py-1">
                        {s}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="card-footer bg-white small text-muted d-flex flex-wrap gap-3">
              <span>
                <i className="bi bi-send me-1" aria-hidden="true"></i>Posted {formatDate(job.createdAt)}
              </span>
              <span>
                <i className="bi bi-calendar-check me-1" aria-hidden="true"></i>Apply before {formatDate(job.deadline)}
              </span>
              {isDraft && (
                <span className="ms-auto">
                  Previewing a draft — it is invisible to job seekers until you set it active.
                </span>
              )}
            </div>
          </div>

          {isDraft && isOwner && (
            <div className="alert alert-warning mt-3 mb-0 d-flex justify-content-between align-items-center flex-wrap gap-2">
              <span>
                <i className="bi bi-pencil-square me-1" aria-hidden="true"></i>This is your draft job.
              </span>
              <Link className="btn btn-sm btn-warning" to={`/recruiter/jobs/${job._id}/edit`}>
                Edit &amp; publish
              </Link>
            </div>
          )}
        </div>

        {/* ============ SIDEBAR ============ */}
        <div className="col-lg-4">
          <div className="position-lg-sticky" style={{ top: '1rem' }}>
            <div className="card shadow-sm mb-3">
              <div className="card-body">
                <p className="h5 fw-bold text-primary mb-0">
                  {salaryRange(job.salaryMin, job.salaryMax)}
                  <span className="d-block small text-muted fw-normal">gross per year</span>
                </p>
                <hr />
                <p
                  className={`small mb-3 ${!applyBlocked && daysLeft <= 7 ? 'text-danger fw-semibold' : 'text-muted'}`}
                >
                  <i className="bi bi-calendar-event me-1" aria-hidden="true"></i>
                  {isClosed
                    ? 'This job is closed — no new applications.'
                    : isDraft
                      ? 'Draft: deadline not live yet.'
                      : deadlinePassed
                        ? 'The deadline has passed — no new applications.'
                        : daysLeft <= 7
                          ? `Hurry — only ${daysLeft} day${daysLeft === 1 ? '' : 's'} left to apply!`
                          : `Apply before ${formatDate(job.deadline)}`}
                </p>

                {!applyBlocked && !applied && (
                  <button type="button" className="btn btn-primary w-100 mb-2" onClick={handleApplyClick}>
                    <i className="bi bi-send-fill me-1" aria-hidden="true"></i>
                    {isAuthenticated && isJobSeeker ? 'Apply Now' : 'Log in to apply'}
                  </button>
                )}
                {applied && !isRecruiter && (
                  <div className="d-grid mb-2">
                    <span className="btn btn-success disabled">
                      <i className="bi bi-check-lg me-1" aria-hidden="true"></i>Applied
                    </span>
                    <Link to="/applications" className="small text-center mt-1">
                      Track it in My Applications →
                    </Link>
                  </div>
                )}
                {isJobSeeker && (
                  <button
                    type="button"
                    className={`btn w-100 mb-2 ${saved ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={async () => {
                      try {
                        const result = await toggleSavedJob(id);
                        setSavedOverrides((o) => ({ ...o, [id]: result.saved }));
                        setNotice({
                          kind: result.saved ? 'success' : 'info',
                          text: result.saved
                            ? 'Saved — find it any time under Saved Jobs'
                            : 'Removed from your saved jobs',
                        });
                      } catch (err) {
                        setNotice({ kind: 'danger', text: getErrorMessage(err, 'Could not update the saved list.') });
                      }
                    }}
                  >
                    <i className={`bi bi-bookmark${saved ? '-fill' : ''} me-1`}></i>
                    {saved ? 'Saved — tap to remove' : 'Save for later'}
                  </button>
                )}
                <button type="button" className="btn btn-outline-primary w-100" onClick={handleShare}>
                  <i className={`bi ${copied ? 'bi-check-lg' : 'bi-share'} me-1`}></i>
                  {copied ? 'Link copied' : 'Share job'}
                </button>
                <p className="small text-muted mt-3 mb-0">
                  <i className="bi bi-shield-lock me-1" aria-hidden="true"></i>
                  Resumes are stored privately — only you and this recruiter can download them.
                </p>
              </div>
            </div>

            {/* recruiter card */}
            <div className="card shadow-sm">
              <div className="card-body d-flex gap-3">
                <div className="cc-company-avatar flex-shrink-0" aria-hidden="true">
                  {(job.postedBy?.name || job.company || '?').trim().charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="cc-filter-label fw-semibold text-muted mb-1">Posted by</p>
                  <p className="fw-semibold mb-0 text-truncate">
                    {job.postedBy?.name || 'Recruiter (account removed)'}
                  </p>
                  {job.postedBy?.email && (
                    <p className="small text-muted mb-0 text-truncate">
                      <i className="bi bi-envelope me-1" aria-hidden="true"></i>
                      <a href={`mailto:${job.postedBy.email}`} className="text-decoration-none">
                        {job.postedBy.email}
                      </a>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* similar jobs */}
      {!isDraft && similar.length > 0 && (
        <div className="mt-5">
          <h2 className="h5 mb-3">
            <i className="bi bi-collection me-1 text-primary" aria-hidden="true"></i>More {job.category} jobs
          </h2>
          <div className="row">
            {similar.map((s) => (
              <div key={s._id} className="col-md-6 col-xl-4">
                <JobCard job={s} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Apply modal (STEP 11) ---- */}
      <Modal
        show={showApply}
        onClose={closeApplyModal}
        title={`Apply — ${job.title}`}
        size="modal-lg cc-apply-dialog"
        footer={
          <>
            <div className="cc-apply-privacy">
              <i className="bi bi-shield-lock" aria-hidden="true"></i>
              <span>Only the recruiter can view your resume</span>
            </div>
            <div className="cc-apply-actions">
            <button type="button" className="btn btn-outline-secondary" onClick={closeApplyModal}>
              Cancel
            </button>
            <button type="submit" form="apply-form" className="btn btn-primary" disabled={applying}>
              {applying ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Submitting…
                </>
              ) : (
                'Submit application'
              )}
            </button>
            </div>
          </>
        }
      >
        <form id="apply-form" onSubmit={handleSubmitApplication}>
          <AlertMessage type="danger" message={applyError} onClose={() => setApplyError('')} />
          <p className="cc-apply-intro">
            Send your application to <strong>{job.company}</strong>. A resume is required; a cover letter is optional.
          </p>
          <div className="cc-apply-field">
            <label htmlFor="apply-resume" className="form-label fw-semibold">
              Resume <span className="text-danger">*</span>
            </label>
            <input
              ref={fileInputRef}
              id="apply-resume"
              type="file"
              className="form-control"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setApplyError('');
              }}
            />
            <div className="form-text">PDF, DOC or DOCX — up to 2 MB. Stored privately; only this recruiter can open it.</div>
            {file && (
              <p className="cc-apply-file mt-2 mb-0">
                <i className="bi bi-paperclip me-1" aria-hidden="true"></i>
                {file.name} <span className="text-muted">({(file.size / 1024).toFixed(0)} KB)</span>
              </p>
            )}
          </div>
          <div className="cc-apply-field mb-0">
            <label htmlFor="apply-cover" className="form-label fw-semibold">
              Cover letter <span className="text-muted fw-normal small">(optional)</span>
            </label>
            <textarea
              id="apply-cover"
              className="form-control"
              rows={4}
              maxLength={2000}
              placeholder={`Why are you a great fit for ${job.title} at ${job.company}?`}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
            />
            <div className="cc-apply-counter">{coverLetter.length} / 2000</div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default JobDetails;
