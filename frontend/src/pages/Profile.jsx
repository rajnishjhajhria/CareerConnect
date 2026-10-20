// CareerConnect — Profile page (STEP 13)
// One form over PUT /api/users/me. The client-side checks mirror the server's
// rules for instant feedback, but the server (controller + Mongoose schema)
// stays the single authority — "never trust the form" in practice.
// The completeness meter is LIVE: it recomputes from the form as you type,
// using the exact function the dashboard shows (utils/profile.js).
import { useEffect, useRef, useState } from 'react';
import { fetchMyProfile, updateMyProfile, uploadProfileResume, downloadMyResume, deleteMyResume, getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { computeProfileCompletion } from '../utils/profile';
import DashboardSidebar from '../components/DashboardSidebar';
import AlertMessage from '../components/AlertMessage';

// mirror of server rules (client-side convenience only)
const PHONE_REGEX = /^[+()\-\s0-9]{8,15}$/;
const YEAR_MAX = new Date().getFullYear() + 8;

const toForm = (u = {}) => ({
  name: u.name || '',
  phone: u.phone || '',
  location: u.location || '',
  professionalTitle: u.professionalTitle || '',
  about: u.about || '',
  skills: u.skills || [],
  education: {
    degree: u.education?.degree || '',
    university: u.education?.university || '',
    graduationYear: u.education?.graduationYear ?? '',
    cgpa: u.education?.cgpa || '',
  },
  experience: {
    years: u.experience?.years ?? 0,
    currentCompany: u.experience?.currentCompany || '',
  },
  resume: u.resume || {}, // managed by its own endpoints (STEP 18), never through the PUT
});

const Profile = () => {
  const { user, refreshUser } = useAuth();

  const [form, setForm] = useState(() => toForm(user));
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false); // so the async re-sync below can respect typing
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ kind: 'info', text: '' });
  const [saving, setSaving] = useState(false);
  const [skillDraft, setSkillDraft] = useState('');
  const skillInputRef = useRef(null);

  // ---- resume card (STEP 18) ----
  // Upload/replace/download/remove run on their own endpoints (multipart!),
  // NOT through the profile PUT — different concern, different request shape.
  // On success the local form.resume + context user are refreshed, so the
  // completeness meter ticks live.
  const resumeInputRef = useRef(null);
  const [resumeBusy, setResumeBusy] = useState(false);

  const applyUserToForm = (freshUser) =>
    setForm((f) => ({ ...f, resume: freshUser.resume || {} }));

  const handleResumePick = (e) => {
    const picked = e.target.files?.[0];
    e.target.value = ''; // same file twice must fire change again
    if (picked) handleResumeUpload(picked);
  };

  async function handleResumeUpload(file) {
    setResumeBusy(true);
    try {
      const updated = await uploadProfileResume(file);
      applyUserToForm(updated);
      await refreshUser();
      setStatus({ kind: 'success', text: `Resume “${updated.resume?.fileName}” uploaded ✓` });
    } catch (err) {
      setStatus({ kind: 'danger', text: getErrorMessage(err, 'Upload failed.') });
    } finally {
      setResumeBusy(false);
    }
  }

  const handleResumeDownload = async () => {
    setResumeBusy(true);
    try {
      await downloadMyResume();
    } catch (err) {
      setStatus({ kind: 'danger', text: getErrorMessage(err, 'Could not download the resume.') });
    } finally {
      setResumeBusy(false);
    }
  };

  const handleResumeRemove = async () => {
    setResumeBusy(true);
    try {
      await deleteMyResume();
      const updated = await fetchMyProfile(); // re-read so the form matches the DB exactly
      applyUserToForm(updated);
      await refreshUser();
      setStatus({ kind: 'success', text: 'Resume removed' });
    } catch (err) {
      setStatus({ kind: 'danger', text: getErrorMessage(err, 'Could not remove the resume.') });
    } finally {
      setResumeBusy(false);
    }
  };

  // Context state may be a cached snapshot → re-sync from the API once on
  // mount (skipped if the user already started typing).
  useEffect(() => {
    let cancelled = false;
    fetchMyProfile()
      .then((fresh) => {
        if (!cancelled && !dirtyRef.current) setForm(toForm(fresh));
      })
      .catch(() => {}); // context snapshot is already shown — not fatal
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = (updates) => {
    setForm((f) => ({ ...f, ...updates }));
    if (!dirtyRef.current) {
      dirtyRef.current = true;
      setDirty(true);
    }
  };

  const set = (field) => (e) => {
    patch({ [field]: e.target.value });
    setErrors((er) => ({ ...er, [field]: '' }));
    if (status.text) setStatus({ kind: 'info', text: '' });
  };

  const setNested = (group, field) => (e) => {
    patch({ [group]: { ...form[group], [field]: e.target.value } });
    setErrors((er) => ({ ...er, [`${group}.${field}`]: '' }));
  };

  // ---- skills editor ----
  const addSkill = () => {
    const raw = skillDraft.trim().replace(/\s+/g, ' ');
    if (!raw) return;
    if (form.skills.some((s) => s.toLowerCase() === raw.toLowerCase())) {
      setSkillDraft('');
      return; // silent dedup, same rule the server applies
    }
    patch({ skills: [...form.skills, raw].slice(0, 20) });
    setSkillDraft('');
    skillInputRef.current?.focus();
  };

  const removeSkill = (skill) => patch({ skills: form.skills.filter((s) => s !== skill) });

  // ---- validation (server re-checks everything) ----
  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Name is required';
    if (!PHONE_REGEX.test(form.phone.trim())) next.phone = '8–15 digits (+, -, spaces allowed)';
    if (form.education.graduationYear !== '') {
      const y = Number(form.education.graduationYear);
      if (!Number.isInteger(y) || y < 1960 || y > YEAR_MAX) {
        next['education.graduationYear'] = `Whole number between 1960 and ${YEAR_MAX}`;
      }
    }
    const yrs = Number(form.experience.years);
    if (!Number.isFinite(yrs) || yrs < 0 || yrs > 60) next['experience.years'] = 'Between 0 and 60';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setStatus({ kind: 'info', text: '' });
    try {
      await updateMyProfile({
        name: form.name.trim(),
        phone: form.phone.trim(),
        location: form.location.trim(),
        professionalTitle: form.professionalTitle.trim(),
        about: form.about.trim(),
        skills: form.skills,
        education: {
          ...form.education,
          graduationYear: form.education.graduationYear === '' ? null : Number(form.education.graduationYear),
        },
        experience: { years: Number(form.experience.years) || 0, currentCompany: form.experience.currentCompany.trim() },
      });
      const fresh = await refreshUser(); // context + storage stay truthful
      setForm(toForm(fresh));
      dirtyRef.current = false;
      setDirty(false);
      setStatus({ kind: 'success', text: 'Profile saved ✓' });
    } catch (err) {
      setStatus({ kind: 'danger', text: getErrorMessage(err, 'Could not save your profile.') });
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setForm(toForm(user));
    dirtyRef.current = false;
    setDirty(false);
    setErrors({});
    setStatus({ kind: 'info', text: '' });
  };

  // live completeness — same function the dashboard uses
  const completion = computeProfileCompletion(form);

  return (
    <div className="container py-4 py-lg-5">
      <div className="row g-4">
        <div className="col-lg-3">
          <DashboardSidebar />
          <div className="card shadow-sm mt-3">
            <div className="card-body">
              <p className="cc-filter-label fw-semibold text-muted mb-2">Profile strength</p>
              <div className="progress" role="progressbar" aria-valuenow={completion.pct} aria-valuemin="0" aria-valuemax="100" style={{ height: 10 }}>
                <div className={`progress-bar ${completion.pct >= 80 ? 'bg-success' : 'bg-primary'}`} style={{ width: `${completion.pct}%` }}></div>
              </div>
              <p className="small text-muted mb-0 mt-2">{completion.pct}% complete</p>
            </div>
          </div>
        </div>

        <div className="col-lg-9">
          <div className="d-flex justify-content-between align-items-end flex-wrap gap-2 mb-3">
            <div>
              <h1 className="h4 mb-1">My profile</h1>
              <p className="text-muted small mb-0">Recruiters see this alongside every application you send.</p>
            </div>
            <div className="d-flex gap-2">
              {dirty && (
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={discard} disabled={saving}>
                  Discard
                </button>
              )}
              <button type="submit" form="profile-form" className="btn btn-primary btn-sm" disabled={!dirty || saving}>
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Saving…
                  </>
                ) : (
                  'Save changes'
                )}
              </button>
            </div>
          </div>

          <AlertMessage type={status.kind} message={status.text} onClose={() => setStatus({ kind: 'info', text: '' })} />

          <form id="profile-form" onSubmit={handleSubmit} noValidate>
            {/* ---- Personal ---- */}
            <div className="card shadow-sm mb-3">
              <div className="card-header bg-white fw-semibold">
                <i className="bi bi-person me-1 text-primary" aria-hidden="true"></i>Personal details
              </div>
              <div className="card-body row g-3">
                <div className="col-md-6">
                  <label className="form-label" htmlFor="pf-name">Full name *</label>
                  <input id="pf-name" className={`form-control${errors.name ? ' is-invalid' : ''}`} value={form.name} onChange={set('name')} maxLength={100} />
                  <div className="invalid-feedback">{errors.name}</div>
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="pf-email">Email <span className="text-muted small">(login ID — not editable)</span></label>
                  <input id="pf-email" className="form-control" value={user?.email || ''} disabled />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="pf-phone">Phone *</label>
                  <input id="pf-phone" className={`form-control${errors.phone ? ' is-invalid' : ''}`} value={form.phone} onChange={set('phone')} />
                  <div className="invalid-feedback">{errors.phone}</div>
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="pf-location">Location</label>
                  <input id="pf-location" className="form-control" placeholder="e.g. Chandigarh" value={form.location} onChange={set('location')} maxLength={80} />
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="pf-title">Professional title</label>
                  <input id="pf-title" className="form-control" placeholder="e.g. Frontend Developer (React)" value={form.professionalTitle} onChange={set('professionalTitle')} maxLength={100} />
                </div>
              </div>
            </div>

            {/* ---- About ---- */}
            <div className="card shadow-sm mb-3">
              <div className="card-header bg-white fw-semibold">
                <i className="bi bi-chat-left-text me-1 text-primary" aria-hidden="true"></i>About me
              </div>
              <div className="card-body">
                <textarea className="form-control" rows={5} maxLength={2000} placeholder="A short paragraph works best — what you build, what you want next." value={form.about} onChange={set('about')}></textarea>
                <div className="form-text text-end">{form.about.length}/2000</div>
              </div>
            </div>

            {/* ---- Skills ---- */}
            <div className="card shadow-sm mb-3">
              <div className="card-header bg-white fw-semibold">
                <i className="bi bi-lightning-charge me-1 text-primary" aria-hidden="true"></i>Skills
                <span className="text-muted fw-normal small ms-1">(used for “picked for you”)</span>
              </div>
              <div className="card-body">
                {form.skills.length > 0 && (
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    {form.skills.map((s) => (
                      <span key={s} className="badge rounded-pill text-bg-primary-subtle border d-inline-flex align-items-center" style={{ fontSize: '0.85rem', padding: '0.4em 0.7em' }}>
                        {s}
                        <button type="button" className="btn-close btn-close-sm ms-2" style={{ fontSize: '0.6em' }} aria-label={`Remove ${s}`} onClick={() => removeSkill(s)}></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="input-group" style={{ maxWidth: 420 }}>
                  <input
                    ref={skillInputRef}
                    className="form-control"
                    placeholder="Type a skill, press Enter"
                    value={skillDraft}
                    onChange={(e) => setSkillDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault(); // Enter adds — never submits the form
                        addSkill();
                      }
                      if (e.key === ',' ) { e.preventDefault(); addSkill(); }
                    }}
                    maxLength={40}
                    disabled={form.skills.length >= 20}
                  />
                  <button type="button" className="btn btn-outline-primary" onClick={addSkill} disabled={form.skills.length >= 20}>
                    Add
                  </button>
                </div>
                <div className="form-text">Duplicates are ignored automatically · max 20 skills.</div>
              </div>
            </div>

            {/* ---- Education ---- */}
            <div className="card shadow-sm mb-3">
              <div className="card-header bg-white fw-semibold">
                <i className="bi bi-mortarboard me-1 text-primary" aria-hidden="true"></i>Education
              </div>
              <div className="card-body row g-3">
                <div className="col-md-6">
                  <label className="form-label" htmlFor="ed-degree">Degree</label>
                  <input id="ed-degree" className="form-control" placeholder="e.g. B.Tech CSE" value={form.education.degree} onChange={setNested('education', 'degree')} maxLength={100} />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="ed-uni">University / College</label>
                  <input id="ed-uni" className="form-control" value={form.education.university} onChange={setNested('education', 'university')} maxLength={120} />
                </div>
                <div className="col-md-3">
                  <label className="form-label" htmlFor="ed-year">Graduation year</label>
                  <input id="ed-year" type="number" className={`form-control${errors['education.graduationYear'] ? ' is-invalid' : ''}`} min="1960" max={YEAR_MAX} placeholder="2026" value={form.education.graduationYear} onChange={setNested('education', 'graduationYear')} />
                  <div className="invalid-feedback">{errors['education.graduationYear']}</div>
                </div>
                <div className="col-md-3">
                  <label className="form-label" htmlFor="ed-cgpa">CGPA / %</label>
                  <input id="ed-cgpa" className="form-control" placeholder="8.6" value={form.education.cgpa} onChange={setNested('education', 'cgpa')} maxLength={8} />
                </div>
              </div>
            </div>

            {/* ---- Experience ---- */}
            <div className="card shadow-sm mb-3">
              <div className="card-header bg-white fw-semibold">
                <i className="bi bi-briefcase me-1 text-primary" aria-hidden="true"></i>Experience
              </div>
              <div className="card-body row g-3">
                <div className="col-md-3">
                  <label className="form-label" htmlFor="ex-years">Years (0 = fresher)</label>
                  <input id="ex-years" type="number" className={`form-control${errors['experience.years'] ? ' is-invalid' : ''}`} min="0" max="60" value={form.experience.years} onChange={setNested('experience', 'years')} />
                  <div className="invalid-feedback">{errors['experience.years']}</div>
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="ex-company">Current company</label>
                  <input id="ex-company" className="form-control" placeholder="Freelance, company, or empty" value={form.experience.currentCompany} onChange={setNested('experience', 'currentCompany')} maxLength={100} />
                </div>
                <div className="col-md-3 d-flex align-items-end">
                  <p className="small text-muted mb-0">
                    <i className="bi bi-file-earmark-person me-1" aria-hidden="true"></i>
                    {form.resume?.fileName ? 'Resume on file — manage below' : 'No resume yet — card below'}
                  </p>
                </div>
              </div>
            </div>

            {/* ---- Resume (STEP 18) — its own upload endpoint, not the profile PUT ---- */}
            <div className="card shadow-sm mb-3">
              <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <span className="fw-semibold">
                  <i className="bi bi-file-earmark-arrow-up me-1 text-primary" aria-hidden="true"></i>My Resume
                </span>
                {resumeBusy && (
                  <span className="spinner-border spinner-border-sm" role="status" aria-label="Working"></span>
                )}
              </div>
              <div className="card-body">
                {form.resume?.fileName ? (
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <div className="min-w-0">
                      <p className="mb-0 fw-semibold text-truncate">
                        <i className="bi bi-file-earmark-person me-1 text-primary" aria-hidden="true"></i>
                        {form.resume.fileName}
                      </p>
                      <p className="small text-muted mb-0">
                        on the server
                        {form.resume.uploadedAt
                          ? ` since ${new Date(form.resume.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                          : ''}{' '}
                        · PDF/DOC/DOCX, 2 MB max
                      </p>
                    </div>
                    <div className="cc-profile-resume-actions d-flex gap-2">
                      <button type="button" className="btn btn-outline-primary btn-sm" disabled={resumeBusy} onClick={() => resumeInputRef.current?.click()}>
                        <i className="bi bi-arrow-repeat me-1" aria-hidden="true"></i>Replace
                      </button>
                      <button type="button" className="btn btn-outline-secondary btn-sm" disabled={resumeBusy} onClick={handleResumeDownload}>
                        <i className="bi bi-download me-1" aria-hidden="true"></i>Download
                      </button>
                      <button type="button" className="btn btn-outline-danger btn-sm" disabled={resumeBusy} onClick={handleResumeRemove}>
                        <i className="bi bi-trash me-1" aria-hidden="true"></i>Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <p className="text-muted small mb-0">
                      Keep one master resume on your profile — the completeness meter counts it,
                      and you can still attach a tailored one per application.
                    </p>
                    <button type="button" className="btn btn-primary btn-sm" disabled={resumeBusy} onClick={() => resumeInputRef.current?.click()}>
                      <i className="bi bi-upload me-1" aria-hidden="true"></i>Upload resume
                    </button>
                  </div>
                )}
                <input
                  ref={resumeInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="d-none"
                  onChange={handleResumePick}
                  aria-label="Choose resume file"
                />
                <div className="form-text mt-2">
                  <i className="bi bi-shield-lock me-1" aria-hidden="true"></i>
                  Stored outside the web root — only you can download it, through an
                  authenticated route. Replacing removes the old file from disk.
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
