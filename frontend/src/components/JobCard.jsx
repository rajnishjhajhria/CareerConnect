// CareerConnect — JobCard (STEP 8, spec §20; save toggle STEP 18)
// One job, one card. Money/date formatting lives in utils/format.js so the
// detail page (Step 10) and Manage Jobs (Step 15) reuse the exact look.
// The bookmark button renders only when the page passes onToggleSave — so
// Home (no auth context needed) stays a plain card and the Jobs page doesn't.
import { Link } from 'react-router-dom';
import { salaryRange, formatDate, daysUntil } from '../utils/format';

const JobCard = ({ job, saved = false, busy = false, onToggleSave }) => {
  const daysLeft = daysUntil(job.deadline);
  const shownSkills = (job.skills || []).slice(0, 4);
  const extraSkills = (job.skills || []).length - shownSkills.length;

  return (
    <article className="card cc-job-card mb-3">
      <div className="card-body">
        <div className="d-flex gap-3">
          {/* Company initial avatar — keeps cards uniform without image uploads */}
          <div className="cc-company-avatar flex-shrink-0" aria-hidden="true">
            {(job.company || '?').trim().charAt(0).toUpperCase()}
          </div>

          <div className="flex-grow-1 min-w-0">
            <div className="cc-job-card-heading d-flex justify-content-between align-items-start gap-2">
              <div className="cc-job-card-title-block min-w-0">
                <h3 className="h6 mb-1 text-truncate">
                  <Link to={`/jobs/${job._id}`} className="text-decoration-none cc-job-title">
                    {job.title}
                  </Link>
                </h3>
                <p className="text-muted small mb-2">
                  <i className="bi bi-buildings me-1" aria-hidden="true"></i>
                  {job.company}
                  <span className="mx-2">·</span>
                  <i className="bi bi-geo-alt me-1" aria-hidden="true"></i>
                  {job.location}
                </p>
              </div>
              <div className="cc-job-card-salary text-end d-none d-sm-block">
                <p className="fw-semibold mb-0 text-primary">{salaryRange(job.salaryMin, job.salaryMax)}</p>
                <p className="small text-muted mb-0">per year</p>
              </div>
            </div>

            <p className="small text-body-secondary cc-line-clamp-2 mb-2">{job.description}</p>

            <div className="d-flex flex-wrap gap-2 mb-2">
              <span className="badge rounded-pill bg-primary-subtle text-primary-emphasis border">{job.jobType}</span>
              <span className="badge rounded-pill bg-secondary-subtle text-secondary-emphasis border">
                {job.experience === 0 ? 'Fresher friendly' : `${job.experience}+ yrs`}
              </span>
              {job.category && (
                <span className="badge rounded-pill bg-info-subtle text-info-emphasis border">{job.category}</span>
              )}

              {shownSkills.map((skill) => (
                <span key={skill} className="badge rounded-pill text-bg-light border">
                  {skill}
                </span>
              ))}
              {extraSkills > 0 && (
                <span className="badge rounded-pill text-bg-light border">+{extraSkills}</span>
              )}
            </div>

            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-1 border-top">
              <small className={daysLeft <= 7 ? 'text-danger fw-semibold' : 'text-muted'}>
                <i className="bi bi-calendar-event me-1" aria-hidden="true"></i>
                {daysLeft <= 7 ? `Closing in ${daysLeft} day${daysLeft === 1 ? '' : 's'}` : `Apply before ${formatDate(job.deadline)}`}
              </small>
              <span className="d-sm-none small fw-semibold text-primary">
                {salaryRange(job.salaryMin, job.salaryMax)}
              </span>
              <div className="d-flex align-items-center gap-2">
                {onToggleSave && (
                  <button
                    type="button"
                    className={`btn btn-sm ${saved ? 'btn-primary' : 'btn-outline-secondary'}`}
                    disabled={busy}
                    aria-pressed={saved}
                    title={saved ? 'Remove from saved jobs' : 'Save for later'}
                    onClick={(e) => {
                      e.preventDefault();
                      onToggleSave(job);
                    }}
                  >
                    <i className={`bi bi-bookmark${saved ? '-fill' : ''} me-1`}></i>
                    <span className="d-none d-md-inline">{saved ? 'Saved' : 'Save'}</span>
                  </button>
                )}
                <Link to={`/jobs/${job._id}`} className="btn btn-sm btn-outline-primary">
                  View details <i className="bi bi-arrow-right" aria-hidden="true"></i>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default JobCard;
