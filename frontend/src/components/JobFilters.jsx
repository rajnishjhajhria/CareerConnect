// CareerConnect — JobFilters sidebar (STEP 8, spec §19/§20)
// All filter values live in the URL (?jobType=…&category=…), so this component
// just reads `params` and asks the page to update them via onChange(patch).
// Selects/pills apply instantly; salary & skills need Apply (avoids a request
// per keystroke).
const JOB_TYPES = ['Full Time', 'Part Time', 'Internship', 'Contract', 'Remote'];

const CATEGORIES = [
  'Technology',
  'Data Science',
  'Business',
  'Finance',
  'Marketing',
  'Design',
  'HR',
  'Operations',
  'Sales',
  'Engineering',
  'Healthcare',
  'Education',
];

// experience=N on the API = "needs at most N years" → phrase it as what the
// job seeker has, not what the job wants.
const EXPERIENCE_OPTIONS = [
  { value: '', label: 'Any experience' },
  { value: '0', label: 'Fresher (0 yr)' },
  { value: '1', label: '1 year' },
  { value: '2', label: '2 years' },
  { value: '3', label: '3 years' },
  { value: '5', label: '5 years' },
  { value: '8', label: '8+ years' },
];

const JobFilters = ({ params, onChange, onClearAll, activeCount }) => {
  return (
    <div className="card cc-filter-card">
      <div className="card-header bg-white d-flex justify-content-between align-items-center">
        <span className="fw-semibold">
          <i className="bi bi-funnel me-1 text-primary" aria-hidden="true"></i>Filters
        </span>
        {activeCount > 0 && (
          <button type="button" className="btn btn-sm btn-link text-decoration-none p-0" onClick={onClearAll}>
            Clear all ({activeCount})
          </button>
        )}
      </div>
      <div className="card-body">
        {/* Job type — pill buttons, single select */}
        <div className="mb-4">
          <p className="cc-filter-label fw-semibold text-muted mb-2">Job type</p>
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className={`btn btn-sm rounded-pill ${params.jobType ? 'btn-outline-primary' : 'btn-primary'}`}
              onClick={() => onChange({ jobType: '' })}
            >
              All
            </button>
            {JOB_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={`btn btn-sm rounded-pill ${
                  params.jobType === type ? 'btn-primary' : 'btn-outline-primary'
                }`}
                onClick={() => onChange({ jobType: params.jobType === type ? '' : type })}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div className="mb-4">
          <label className="cc-filter-label fw-semibold text-muted d-block mb-1" htmlFor="filter-category">
            Category
          </label>
          <select
            id="filter-category"
            className="form-select form-select-sm"
            value={params.category || ''}
            onChange={(e) => onChange({ category: e.target.value })}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Experience */}
        <div className="mb-4">
          <label className="cc-filter-label fw-semibold text-muted d-block mb-1" htmlFor="filter-experience">
            My experience
          </label>
          <select
            id="filter-experience"
            className="form-select form-select-sm"
            value={params.experience ?? ''}
            onChange={(e) => onChange({ experience: e.target.value })}
          >
            {EXPERIENCE_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Salary — two-step (need Apply) */}
        <SalaryFilter params={params} onChange={onChange} />

        {/* Skills — comma separated, need Apply */}
        <SkillsFilter params={params} onChange={onChange} />
      </div>
    </div>
  );
};

/* Two small sub-components: local input state that commits on Apply. */

function SalaryFilter({ params, onChange }) {
  return (
    <form
      className="mb-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        onChange({
          salaryMin: form.get('salaryMin') || '',
          salaryMax: form.get('salaryMax') || '',
        });
      }}
    >
      <p className="cc-filter-label fw-semibold text-muted mb-2">Salary (₹ / year)</p>
      <div className="input-group input-group-sm">
        <input
          type="number"
          name="salaryMin"
          className="form-control"
          placeholder="Min"
          min="0"
          step="10000"
          defaultValue={params.salaryMin || ''}
          key={`smin-${params.salaryMin || ''}`}
        />
        <span className="input-group-text">–</span>
        <input
          type="number"
          name="salaryMax"
          className="form-control"
          placeholder="Max"
          min="0"
          step="10000"
          defaultValue={params.salaryMax || ''}
          key={`smax-${params.salaryMax || ''}`}
        />
        <button className="btn btn-outline-primary" type="submit">
          Apply
        </button>
      </div>
    </form>
  );
}

function SkillsFilter({ params, onChange }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const value = new FormData(e.currentTarget).get('skills');
        onChange({ skills: value || '' });
      }}
    >
      <p className="cc-filter-label fw-semibold text-muted mb-2">Skills (any of)</p>
      <div className="input-group input-group-sm">
        <input
          type="text"
          name="skills"
          className="form-control"
          placeholder="React, SQL…"
          defaultValue={params.skills || ''}
          key={`skills-${params.skills || ''}`}
        />
        <button className="btn btn-outline-primary" type="submit">
          Apply
        </button>
      </div>
      <div className="form-text">Jobs matching <em>any</em> listed skill are shown.</div>
    </form>
  );
}

export default JobFilters;
