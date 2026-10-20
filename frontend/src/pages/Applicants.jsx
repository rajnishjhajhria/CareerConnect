// CareerConnect — Applicants (STEP 19, spec §20)
// The recruiter's pipeline for ONE job: every applicant with their skills,
// cover letter, and resume (through the permission-checked download route —
// the same door the seeker uses), plus a status update with an optional note
// that the applicant sees instantly on their own Applications page.
// Everything reads live from Mongo; the status <select> PUTs the change and
// merges only that row back in — no full reload flicker on a big list.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  fetchJobApplications,
  updateApplicationStatus,
  downloadApplicationResume,
  getErrorMessage,
} from '../services/api';
import { APPLICATION_STATUSES, STATUS_PILL } from '../utils/applicationStatuses';
import { formatDate } from '../utils/format';
import DashboardSidebar from '../components/DashboardSidebar';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertMessage from '../components/AlertMessage';
import Modal from '../components/Modal';

const FILTERS = [
  { key: '', label: 'All' },
  ...APPLICATION_STATUSES.map((s) => ({ key: s, label: s[0].toUpperCase() + s.slice(1) })),
];

const Applicants = () => {
  const { jobId } = useParams();

  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // The status modal doubles as the note prompt: pick a status, optionally
  // explain why. Closing without saving is always safe (no draft leaks to the row).
  const [editing, setEditing] = useState(null); // { application, status, note }
  const [saving, setSaving] = useState(false);

  // "Read" popovers for cover letters — content is small, so it is already in
  // the list response; the modal just displays it (no extra round trip).
  const [viewing, setViewing] = useState(null); // { title, text }
  const [candidate, setCandidate] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchJobApplications(jobId, filter);
        if (cancelled) return;
        setJob(data.job);
        setApplicants(data.applicants);
        setError('');
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load applicants.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId, filter]);

  const openStatusModal = (application) =>
    setEditing({
      application,
      status: application.status,
      note: application.statusNote || '',
    });

  const saveStatus = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await updateApplicationStatus(
        jobId,
        editing.application._id,
        editing.status,
        editing.note
      );
      // merge just the changed row (status/note/reviewedAt are all that move)
      setApplicants((rows) =>
        rows.map((r) =>
          r._id === editing.application._id
            ? { ...r, ...res.data.application, applicant: { ...r.applicant, ...res.data.application.applicant } }
            : r
        )
      );
      setNotice(res.message);
      setEditing(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not update the status.'));
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const handleResume = async (application) => {
    try {
      await downloadApplicationResume(
        application._id,
        application.resume?.originalName || 'applicant-resume'
      );
    } catch {
      setError('Resume file is missing on this server.');
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!job) {
    return (
      <div className="container py-5" style={{ maxWidth: 560 }}>
        <AlertMessage type="danger" message={error || 'Job not found.'} />
        <Link to="/recruiter/jobs" className="btn btn-outline-primary btn-sm">
          ← Back to My Jobs
        </Link>
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
          <div className="mb-1">
            <Link to="/recruiter/jobs" className="small text-decoration-none">
              ← Back to My Jobs
            </Link>
          </div>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1">
            <h4 className="mb-0">Applicants — {job.title}</h4>
            <span className="badge text-bg-secondary rounded-pill">{applicants.length} shown</span>
          </div>
          <p className="text-muted small mb-3">
            Status changes are visible to the applicant immediately on their Applications page.
          </p>

          <AlertMessage type="danger" message={error} onClose={() => setError('')} />
          <AlertMessage type="success" message={notice} onClose={() => setNotice('')} />

          <div className="d-flex flex-wrap gap-1 mb-3 cc-pill-row">
            {FILTERS.map((f) => (
              <button
                key={f.key || 'all'}
                type="button"
                className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {applicants.length === 0 ? (
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center py-5">
                <i className="bi bi-people fs-1 text-secondary d-block mb-2" aria-hidden="true" />
                <p className="mb-1">No applicants{filter ? ` in “${filter}”` : ''} yet.</p>
                <p className="small text-muted mb-0">
                  {job.status === 'active'
                    ? 'New applications will appear here in real time.'
                    : 'This job is not collecting applications right now.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="card border-0 shadow-sm">
              <div className="d-md-none p-2 d-grid gap-2">
                {applicants.map((a) => (
                  <article key={a._id} className="border rounded-3 p-3 bg-body">
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div className="min-w-0">
                        <h5 className="h6 mb-1">{a.applicant?.name || 'Deleted user'}</h5>
                        <a className="small text-muted text-break" href={`mailto:${a.applicant?.email || ''}`}>
                          {a.applicant?.email || 'Email unavailable'}
                        </a>
                        {(a.applicant?.phone || a.applicant?.location) && (
                          <p className="small text-muted mb-0 mt-1">
                            {[a.applicant?.phone, a.applicant?.location].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      <span className={`badge rounded-pill ${STATUS_PILL[a.status]}`}>{a.status}</span>
                    </div>
                    {(a.applicant?.skills || []).length > 0 && (
                      <div className="d-flex flex-wrap gap-1 mt-3" aria-label="Applicant skills">
                        {(a.applicant?.skills || []).slice(0, 4).map((skill) => (
                          <span key={skill} className="badge text-bg-light border">{skill}</span>
                        ))}
                        {(a.applicant?.skills || []).length > 4 && (
                          <span className="badge text-bg-light border">+{a.applicant.skills.length - 4}</span>
                        )}
                      </div>
                    )}
                    <div className="small text-muted mt-3">Applied {formatDate(a.createdAt)}</div>
                    {a.statusNote && <p className="small text-muted fst-italic mb-0 mt-2">“{a.statusNote}”</p>}
                    <div className="row g-2 mt-1">
                      <div className="col-6">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary w-100"
                          onClick={() => setCandidate(a.applicant)}
                          disabled={!a.applicant}
                        >
                          <i className="bi bi-person-vcard me-1" aria-hidden="true" />Profile
                        </button>
                      </div>
                      <div className="col-6">
                        <button type="button" className="btn btn-sm btn-outline-secondary w-100" onClick={() => handleResume(a)}>
                          <i className="bi bi-download me-1" aria-hidden="true" />Resume
                        </button>
                      </div>
                      <div className="col-6">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary w-100"
                          onClick={() => setViewing({ title: 'Cover letter', text: a.coverLetter || '(none provided)' })}
                        >
                          <i className="bi bi-envelope me-1" aria-hidden="true" />Cover letter
                        </button>
                      </div>
                      <div className="col-6">
                        <button type="button" className="btn btn-sm btn-outline-primary w-100" onClick={() => openStatusModal(a)}>
                          Update status
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <div className="table-responsive d-none d-md-block">
                <table className="table align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Applicant</th>
                      <th>Skills</th>
                      <th>Applied</th>
                      <th>Status</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applicants.map((a) => (
                      <tr key={a._id}>
                        <td>
                          <div className="fw-semibold">{a.applicant?.name || 'Deleted user'}</div>
                          <div className="small text-muted">{a.applicant?.email}</div>
                          {(a.applicant?.phone || a.applicant?.location) && (
                            <div className="small text-muted">
                              {[a.applicant?.phone, a.applicant?.location].filter(Boolean).join(' · ')}
                            </div>
                          )}
                        </td>
                        <td style={{ maxWidth: 220 }}>
                          {(a.applicant?.skills || []).slice(0, 3).map((s) => (
                            <span key={s} className="badge text-bg-light border me-1 mb-1">
                              {s}
                            </span>
                          ))}
                          {(a.applicant?.skills || []).length > 3 && (
                            <span className="badge text-bg-light border">
                              +{a.applicant.skills.length - 3}
                            </span>
                          )}
                        </td>
                        <td className="small text-muted text-nowrap">{formatDate(a.createdAt)}</td>
                        <td>
                          <span className={`badge rounded-pill ${STATUS_PILL[a.status]}`}>
                            {a.status}
                          </span>
                          {a.statusNote && (
                            <div
                              className="small text-muted fst-italic mt-1"
                              style={{ maxWidth: 200 }}
                            >
                              “{a.statusNote}”
                            </div>
                          )}
                        </td>
                        <td className="text-end text-nowrap">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary me-1"
                            onClick={() => setCandidate(a.applicant)}
                            disabled={!a.applicant}
                            title="View applicant profile"
                          >
                            <i className="bi bi-person-vcard me-1" aria-hidden="true" />
                            Profile
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary me-1"
                            onClick={() => handleResume(a)}
                            title="Download their resume"
                          >
                            <i className="bi bi-download me-1" aria-hidden="true" />
                            Resume
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary me-1"
                            onClick={() =>
                              a.coverLetter
                                ? setViewing({ title: 'Cover letter', text: a.coverLetter })
                                : setViewing({ title: 'Cover letter', text: '(none provided)' })
                            }
                            title="Read their cover letter"
                          >
                            <i className="bi bi-envelope me-1" aria-hidden="true" />
                            Letter
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => openStatusModal(a)}
                          >
                            Update status
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status update modal */}
      <Modal
        show={!!editing}
        onClose={() => setEditing(null)}
        size="cc-status-dialog"
        title={editing ? `Update status — ${editing.application.applicant?.name || 'Applicant'}` : ''}
        footer={
          <>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setEditing(null)}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={saveStatus} disabled={saving}>
              {saving ? 'Saving…' : 'Save change'}
            </button>
          </>
        }
      >
        {editing && (
          <>
            <p className="cc-status-hint">
              Update this applicant’s stage. Your note will be visible to them in My Applications.
            </p>
            <div className="mb-3">
              <label className="form-label" htmlFor="ap-status">
                Pipeline status
              </label>
              <select
                id="ap-status"
                className="form-select"
                value={editing.status}
                onChange={(e) => setEditing((m) => ({ ...m, status: e.target.value }))}
              >
                {APPLICATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-1">
              <label className="form-label" htmlFor="ap-note">
                Review note for the applicant <span className="text-muted small">(optional)</span>
              </label>
              <textarea
                id="ap-note"
                className="form-control"
                rows={3}
                maxLength={500}
                placeholder="e.g. Strong React portfolio — moving to interview round."
                value={editing.note}
                onChange={(e) => setEditing((m) => ({ ...m, note: e.target.value }))}
              />
              <div className="form-text text-end">{editing.note.length}/500</div>
            </div>
          </>
        )}
      </Modal>

      {/* Applicant profile: safe, recruiter-relevant fields only. */}
      <Modal
        show={!!candidate}
        onClose={() => setCandidate(null)}
        title={candidate?.name || 'Applicant profile'}
        footer={
          <button type="button" className="btn btn-outline-secondary" onClick={() => setCandidate(null)}>
            Close
          </button>
        }
      >
        {candidate && (
          <div className="d-grid gap-3">
            {(candidate.professionalTitle || candidate.location) && (
              <div>
                {candidate.professionalTitle && <div className="fw-semibold">{candidate.professionalTitle}</div>}
                {candidate.location && <div className="small text-muted"><i className="bi bi-geo-alt me-1" aria-hidden="true" />{candidate.location}</div>}
              </div>
            )}
            <div className="d-flex flex-wrap gap-3 small">
              {candidate.email && <a href={`mailto:${candidate.email}`}><i className="bi bi-envelope me-1" aria-hidden="true" />{candidate.email}</a>}
              {candidate.phone && <a href={`tel:${candidate.phone}`}><i className="bi bi-telephone me-1" aria-hidden="true" />{candidate.phone}</a>}
            </div>
            {candidate.about && (
              <section>
                <h6 className="cc-filter-label text-muted mb-1">About</h6>
                <p className="mb-0 text-break" style={{ whiteSpace: 'pre-wrap' }}>{candidate.about}</p>
              </section>
            )}
            {!!candidate.skills?.length && (
              <section>
                <h6 className="cc-filter-label text-muted mb-1">Skills</h6>
                <div className="d-flex flex-wrap gap-1">
                  {candidate.skills.map((skill) => <span key={skill} className="badge text-bg-light border">{skill}</span>)}
                </div>
              </section>
            )}
            {(candidate.education?.degree || candidate.education?.university) && (
              <section>
                <h6 className="cc-filter-label text-muted mb-1">Education</h6>
                <div className="fw-semibold">{candidate.education.degree || 'Education'}</div>
                <div className="small text-muted">
                  {[candidate.education.university, candidate.education.graduationYear, candidate.education.cgpa && `CGPA ${candidate.education.cgpa}`].filter(Boolean).join(' · ')}
                </div>
              </section>
            )}
            {(candidate.experience?.years > 0 || candidate.experience?.currentCompany) && (
              <section>
                <h6 className="cc-filter-label text-muted mb-1">Experience</h6>
                <div>
                  {candidate.experience.years > 0 && `${candidate.experience.years} year${candidate.experience.years === 1 ? '' : 's'}`}
                  {candidate.experience.years > 0 && candidate.experience.currentCompany && ' · '}
                  {candidate.experience.currentCompany && `Currently at ${candidate.experience.currentCompany}`}
                </div>
              </section>
            )}
          </div>
        )}
      </Modal>

      {/* Cover letter modal */}
      <Modal
        show={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.title || ''}
        footer={
          <button type="button" className="btn btn-outline-secondary" onClick={() => setViewing(null)}>
            Close
          </button>
        }
      >
        {viewing && <p className="text-break mb-0" style={{ whiteSpace: 'pre-wrap' }}>{viewing.text}</p>}
      </Modal>
    </div>
  );
};

export default Applicants;
