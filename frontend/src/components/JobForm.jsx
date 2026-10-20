// CareerConnect — shared job form (STEP 16)
// ONE form powers Post-a-Job and Edit-Job (spec: same fields, different verb).
// The component owns the form STATE, field validation and the buttons;
// the parent page owns the network call (createJob vs updateJob) and what
// happens after. Client-side validation mirrors validateJobInput() on the
// server so users see mistakes instantly — but the server always re-checks.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  JOB_TYPES,
  CATEGORIES,
  MIN_DEADLINE,
  emptyJobForm,
  validateJobForm,
  formToPayload,
} from '../utils/jobForm';
import { salaryRange } from '../utils/format';
import AlertMessage from './AlertMessage';

// ---- small helper component: editor for a list of plain strings ----
// (responsibilities / requirements). Not exported — one default export per
// file keeps Vite fast-refresh happy and this file explainable in one pass.
const ListField = ({ id, label, placeholder, items, onChange }) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const value = draft.trim().replace(/\s+/g, ' ');
    if (!value) return;
    if (!items.some((v) => v.toLowerCase() === value.toLowerCase())) {
      onChange([...items, value]);
    }
    setDraft('');
  };
  return (
    <div>
      <label htmlFor={id} className="form-label fw-semibold small">
        {label}
      </label>
      {items.length > 0 && (
        <ul className="list-group mb-2">
          {items.map((item, i) => (
            <li key={`${i}-${item}`} className="list-group-item d-flex align-items-center py-2">
              <span className="flex-grow-1 small">{item}</span>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger py-0 px-1"
                aria-label={`Remove “${item}”`}
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              >
                <i className="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="input-group input-group-sm" style={{ maxWidth: 560 }}>
        <input
          id={id}
          className="form-control"
          placeholder={placeholder}
          value={draft}
          maxLength={300}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault(); // Enter adds a row — it must NOT submit the form
              add();
            }
          }}
        />
        <button type="button" className="btn btn-outline-primary" onClick={add}>
          <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>Add
        </button>
      </div>
      <div className="form-text">Leave empty to skip — every row sent goes to the public job page as a bullet.</div>
    </div>
  );
};

const JobForm = ({ mode = 'create', initial, currentStatus, onSubmit, serverError = '' }) => {
  const [form, setForm] = useState(initial || emptyJobForm());
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(''); // which button is in flight
  const [skillDraft, setSkillDraft] = useState('');

  const isEdit = mode === 'edit';
  const patch = (part) => setForm((f) => ({ ...f, ...part }));

  const setField = (field) => (e) => {
    patch({ [field]: e.target.value });
    if (errors[field]) setErrors((er) => ({ ...er, [field]: '' }));
  };

  const addSkill = () => {
    const raw = skillDraft.trim().replace(/\s+/g, ' ');
    if (!raw) return;
    if (!form.skills.some((s) => s.toLowerCase() === raw.toLowerCase())) {
      patch({ skills: [...form.skills, raw].slice(0, 20) });
    }
    setSkillDraft('');
  };

  const submit = async (status) => {
    const found = validateJobForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(status);
    try {
      await onSubmit({ ...formToPayload(form), status });
      // on success the parent navigates away; stay in "busy" until then
    } catch {
      setBusy(''); // parent showed the server error via the prop
    }
  };

  const err = (field) =>
    errors[field] ? <div className="text-danger small mt-1">{errors[field]}</div> : null;

  const field = (label, name, opts = {}) => (
    <div className={opts.col || 'col-md-6'}>
      <label htmlFor={`jf-${name}`} className="form-label fw-semibold small">
        {label}
        {opts.required !== false && <span className="text-danger ms-1">*</span>}
      </label>
      {opts.children}
      {err(name)}
    </div>
  );

  return (
    <form
      onSubmit={(e) => e.preventDefault()} // buttons carry their own action
      noValidate
    >
      {serverError && <AlertMessage type="danger" message={serverError} />}

      {/* ---------- basics ---------- */}
      <div className="card shadow-sm mb-3">
        <div className="card-header bg-white fw-semibold">
          <i className="bi bi-briefcase me-1 text-primary" aria-hidden="true"></i>Job details
          {isEdit && currentStatus && (
            <span
              className={`badge rounded-pill text-bg-${
                currentStatus === 'active' ? 'success' : currentStatus === 'closed' ? 'danger' : 'secondary'
              } ms-2`}
            >
              {currentStatus === 'active' ? 'Live' : currentStatus === 'closed' ? 'Closed' : 'Draft'}
            </span>
          )}
        </div>
        <div className="card-body row g-3">
          {field('Job title', 'title', {
            col: 'col-md-7',
            children: (
              <input
                id="jf-title"
                className={`form-control${errors.title ? ' is-invalid' : ''}`}
                placeholder="e.g. Frontend Developer (React)"
                value={form.title}
                maxLength={150}
                onChange={setField('title')}
              />
            ),
          })}
          {field('Company', 'company', {
            col: 'col-md-5',
            children: (
              <input
                id="jf-company"
                className={`form-control${errors.company ? ' is-invalid' : ''}`}
                value={form.company}
                maxLength={150}
                onChange={setField('company')}
              />
            ),
          })}
          {field('Location', 'location', {
            col: 'col-md-5',
            children: (
              <input
                id="jf-location"
                className={`form-control${errors.location ? ' is-invalid' : ''}`}
                placeholder="e.g. Chandigarh / Remote"
                value={form.location}
                maxLength={100}
                onChange={setField('location')}
              />
            ),
          })}
          {field('Job type', 'jobType', {
            col: 'col-md-3',
            required: false,
            children: (
              <select id="jf-jobType" className="form-select" value={form.jobType} onChange={setField('jobType')}>
                {JOB_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            ),
          })}
          {field('Category', 'category', {
            col: 'col-md-4',
            required: false,
            children: (
              <select id="jf-category" className="form-select" value={form.category} onChange={setField('category')}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            ),
          })}
          {field('Experience required (years)', 'experience', {
            col: 'col-md-4',
            required: false,
            children: (
              <input
                id="jf-experience"
                type="number"
                min="0"
                max="60"
                className="form-control"
                value={form.experience}
                onChange={setField('experience')}
              />
            ),
          })}
          {field('Application deadline', 'deadline', {
            col: 'col-md-4',
            children: (
              <input
                id="jf-deadline"
                type="date"
                className="form-control"
                min={MIN_DEADLINE}
                value={form.deadline}
                onChange={setField('deadline')}
              />
            ),
          })}
        </div>
      </div>

      {/* ---------- salary ---------- */}
      <div className="card shadow-sm mb-3">
        <div className="card-header bg-white fw-semibold">
          <i className="bi bi-currency-rupee me-1 text-primary" aria-hidden="true"></i>Salary (per year, ₹)
        </div>
        <div className="card-body row g-3">
          {field('Minimum', 'salaryMin', {
            col: 'col-md-3',
            required: false,
            children: (
              <input
                id="jf-salaryMin"
                type="number"
                min="0"
                step="1000"
                className="form-control"
                placeholder="e.g. 600000"
                value={form.salaryMin}
                onChange={setField('salaryMin')}
              />
            ),
          })}
          {field('Maximum', 'salaryMax', {
            col: 'col-md-3',
            required: false,
            children: (
              <input
                id="jf-salaryMax"
                type="number"
                min="0"
                step="1000"
                className="form-control"
                placeholder="e.g. 1200000"
                value={form.salaryMax}
                onChange={setField('salaryMax')}
              />
            ),
          })}
          <div className="col-md-6 d-flex align-items-end">
            <p className="text-muted small mb-2">
              Seekers will see: <span className="fw-semibold text-dark">{salaryRange(form.salaryMin, form.salaryMax)}</span>
              <span className="d-block" style={{ fontSize: '0.75rem' }}>
                Both blank = “Not disclosed”. Numbers are stored as entered (₹/year).
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* ---------- description ---------- */}
      <div className="card shadow-sm mb-3">
        <div className="card-header bg-white fw-semibold">
          <i className="bi bi-card-text me-1 text-primary" aria-hidden="true"></i>Description
          <span className="text-muted fw-normal small ms-2">{form.description.length}/10000</span>
        </div>
        <div className="card-body">
          <textarea
            id="jf-description"
            className={`form-control${errors.description ? ' is-invalid' : ''}`}
            rows="7"
            maxLength={10000}
            placeholder="What the role involves, the team, the tech stack, growth…"
            value={form.description}
            onChange={setField('description')}
          ></textarea>
          {err('description')}
        </div>
      </div>

      {/* ---------- lists ---------- */}
      <div className="card shadow-sm mb-3">
        <div className="card-body row g-4">
          <div className="col-lg-6">
            <ListField
              id="jf-resp"
              label="Key responsibilities"
              placeholder="e.g. Build and maintain REST APIs"
              items={form.responsibilities}
              onChange={(items) => patch({ responsibilities: items })}
            />
          </div>
          <div className="col-lg-6">
            <ListField
              id="jf-req"
              label="Requirements"
              placeholder="e.g. B.Tech or equivalent experience"
              items={form.requirements}
              onChange={(items) => patch({ requirements: items })}
            />
          </div>
        </div>
      </div>

      {/* ---------- skills ---------- */}
      <div className="card shadow-sm mb-3">
        <div className="card-header bg-white fw-semibold">
          <i className="bi bi-lightning-charge me-1 text-primary" aria-hidden="true"></i>Skills
        </div>
        <div className="card-body">
          {form.skills.length > 0 && (
            <div className="d-flex flex-wrap gap-2 mb-2">
              {form.skills.map((s) => (
                <span key={s} className="badge text-bg-primary rounded-pill py-2 px-3">
                  {s}
                  <button
                    type="button"
                    className="btn-close btn-close-white btn-close-sm ms-2"
                    style={{ fontSize: '0.6em' }}
                    aria-label={`Remove ${s}`}
                    onClick={() => patch({ skills: form.skills.filter((x) => x !== s) })}
                  ></button>
                </span>
              ))}
            </div>
          )}
          <div className="input-group" style={{ maxWidth: 420 }}>
            <input
              className="form-control"
              placeholder="Type a skill, press Enter"
              value={skillDraft}
              maxLength={40}
              disabled={form.skills.length >= 20}
              onChange={(e) => setSkillDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addSkill();
                }
              }}
            />
            <button type="button" className="btn btn-outline-primary" onClick={addSkill} disabled={form.skills.length >= 20}>
              Add
            </button>
          </div>
          <div className="form-text">
            Skills power the job board filters and (later) the skill-match score. Max 20, duplicates ignored.
          </div>
        </div>
      </div>

      {/* ---------- actions ---------- */}
      <div className="d-flex flex-wrap gap-2 align-items-center">
        <Link to="/recruiter/jobs" className="btn btn-outline-secondary">
          Cancel
        </Link>
        {!isEdit && (
          <button type="button" className="btn btn-outline-success" disabled={!!busy} onClick={() => submit('draft')}>
            {busy === 'draft' ? (
              <span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
            ) : (
              <i className="bi bi-file-earmark me-1" aria-hidden="true"></i>
            )}
            Save as draft
          </button>
        )}
        {isEdit && currentStatus === 'draft' && (
          <button type="button" className="btn btn-outline-success" disabled={!!busy} onClick={() => submit('active')}>
            {busy === 'active' ? (
              <span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
            ) : (
              <i className="bi bi-send me-1" aria-hidden="true"></i>
            )}
            Publish now
          </button>
        )}
        <button type="button" className="btn btn-primary ms-auto" disabled={!!busy} onClick={() => submit(isEdit ? currentStatus || 'active' : 'active')}>
          {busy === (isEdit ? currentStatus || 'active' : 'active') ? (
            <span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
          ) : (
            <i className="bi bi-check2-circle me-1" aria-hidden="true"></i>
          )}
          {isEdit ? 'Save changes' : 'Publish job'}
        </button>
      </div>
      <p className="text-muted small mt-3 mb-0">
        <i className="bi bi-shield-check me-1" aria-hidden="true"></i>
        Publishing puts the job on the public board immediately. Drafts are visible only to you until published.
      </p>
    </form>
  );
};

export default JobForm;
