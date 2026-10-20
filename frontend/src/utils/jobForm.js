// CareerConnect — shared job-form logic (STEP 16)
// Kept out of the component so Create and Edit can reuse the exact same
// rules, and so the rules are readable in one place for the viva.
// These mirror validateJobInput() in backend/controllers/jobController.js —
// the client check is only UX speed; the server is the final authority.

export const JOB_TYPES = ['Full Time', 'Part Time', 'Internship', 'Contract', 'Remote'];

// Same list as the public JobFilters sidebar — form and filters must match,
// otherwise a recruiter could pick a category nobody can filter by.
export const CATEGORIES = [
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

export const emptyJobForm = () => ({
  title: '',
  company: '',
  location: '',
  jobType: 'Full Time',
  category: 'Technology',
  experience: 0,
  salaryMin: '',
  salaryMax: '',
  deadline: '',
  description: '',
  responsibilities: [],
  requirements: [],
  skills: [],
});

// A stored job -> form shape (dates arrive ISO; the date input wants YYYY-MM-DD)
export const jobToForm = (job) => ({
  ...emptyJobForm(),
  title: job.title || '',
  company: job.company || '',
  location: job.location || '',
  jobType: job.jobType || 'Full Time',
  category: job.category || 'Technology',
  experience: job.experience ?? 0,
  salaryMin: job.salaryMin || '',
  salaryMax: job.salaryMax || '',
  deadline: job.deadline ? String(job.deadline).slice(0, 10) : '',
  description: job.description || '',
  responsibilities: job.responsibilities || [],
  requirements: job.requirements || [],
  skills: job.skills || [],
});

// Today as YYYY-MM-DD (local) — used for the date input's min and the check
const todayISO = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const MIN_DEADLINE = todayISO();

// Returns { field: message } — empty object means the form is ready to send.
export const validateJobForm = (form) => {
  const errors = {};
  const need = (field, label) => {
    if (!String(form[field] ?? '').trim()) errors[field] = `${label} is required`;
  };

  need('title', 'Job title');
  if (form.title.trim().length > 150) errors.title = 'Title cannot exceed 150 characters';
  need('company', 'Company name');
  need('location', 'Location');
  need('category', 'Category');
  need('deadline', 'Application deadline');
  if (form.deadline && form.deadline < MIN_DEADLINE) {
    errors.deadline = 'Deadline must be today or later';
  }

  const min = form.salaryMin === '' ? null : Number(form.salaryMin);
  const max = form.salaryMax === '' ? null : Number(form.salaryMax);
  if (min !== null && (Number.isNaN(min) || min < 0)) {
    errors.salaryMin = 'Minimum salary must be a number ≥ 0';
  }
  if (max !== null && (Number.isNaN(max) || max < 0)) {
    errors.salaryMax = 'Maximum salary must be a number ≥ 0';
  }
  if (min !== null && max !== null && max < min) {
    errors.salaryMax = 'Maximum salary cannot be less than minimum';
  }
  const exp = Number(form.experience);
  if (Number.isNaN(exp) || exp < 0) errors.experience = 'Experience must be 0 or more';

  need('description', 'Description');

  return errors;
};

// Form -> API payload: trim strings, send numbers (not "" or "abc"), drop
// blank list rows (the server's toStringArray filters them too — no orphans).
export const formToPayload = (form) => {
  const num = (v) => (v === '' || v === null || Number.isNaN(Number(v)) ? 0 : Number(v));
  const list = (arr) => arr.map((s) => String(s).trim()).filter(Boolean);
  return {
    title: form.title.trim(),
    company: form.company.trim(),
    location: form.location.trim(),
    jobType: form.jobType,
    category: form.category,
    experience: num(form.experience),
    salaryMin: num(form.salaryMin),
    salaryMax: num(form.salaryMax),
    deadline: form.deadline,
    description: form.description.trim(),
    responsibilities: list(form.responsibilities),
    requirements: list(form.requirements),
    skills: list(form.skills),
  };
};
