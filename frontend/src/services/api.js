// CareerConnect — central Axios instance + session helpers (STEP 5; hardened STEP 12)
// Every API call goes through `api`; every token read/write goes through the
// helpers below — one place to look when debugging auth.
import axios from 'axios';

export const TOKEN_KEY = 'careerconnect_token';
export const USER_KEY = 'careerconnect_user';

// ---- Storage-safe session layer ----
// Storage can fail in TWO ways, and we must survive both:
//  1. THROWING access — private-mode Safari, sandboxed iframes (SecurityError).
//  2. SILENT BLACK HOLE — cross-site embedded previews with strict tracking
//     protection (Safari ITP, Chrome 3P-cookie blocking): getItem returns null
//     and setItem is ignored WITHOUT any exception. That silently stripped the
//     Authorization header after a successful login → "login bounces me back".
// So every read falls back to the in-memory mirror whenever storage has no
// answer, regardless of whether it threw. Login works for the whole tab;
// after a FULL reload in a black-hole context the user simply logs in again.
const memorySession = {};

const storageGet = (key) => {
  let value = null;
  try {
    value = localStorage.getItem(key) || sessionStorage.getItem(key);
  } catch {
    value = null;
  }
  return value || memorySession[key] || null;
};

// "Remember me" decides the storage:
// - checked   → localStorage (survives browser restarts)
// - unchecked → sessionStorage (cleared when the tab/browser closes)
export const getStoredToken = () => storageGet(TOKEN_KEY);

export const getStoredUser = () => {
  try {
    const raw = storageGet(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const storeSession = (userData, jwt, remember = true) => {
  memorySession[TOKEN_KEY] = jwt;
  memorySession[USER_KEY] = JSON.stringify(userData);
  try {
    const primary = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;
    primary.setItem(TOKEN_KEY, jwt);
    primary.setItem(USER_KEY, JSON.stringify(userData));
    other.removeItem(TOKEN_KEY);
    other.removeItem(USER_KEY);
  } catch {
    // storage blocked — the memory mirror above already keeps this tab logged in
  }
};

export const clearSession = () => {
  delete memorySession[TOKEN_KEY];
  delete memorySession[USER_KEY];
  try {
    [localStorage, sessionStorage].forEach((storage) => {
      storage.removeItem(TOKEN_KEY);
      storage.removeItem(USER_KEY);
    });
  } catch {
    // nothing to clear if storage is blocked
  }
};

// Which storage the CURRENT session lives in → tells us whether "remember me"
// was on (AuthContext re-stores the session and must not flip the choice).
// Silent black-hole storage returns null without throwing, so the memory
// mirror decides last.
export const isRememberedSession = () => {
  try {
    if (localStorage.getItem(TOKEN_KEY)) return true;
  } catch {
    /* blocked */
  }
  try {
    if (sessionStorage.getItem(TOKEN_KEY)) return false;
  } catch {
    /* blocked */
  }
  return true; // memory-only session behaves like the persistent option
};

// Friendly message extractor shared by all forms:
// server message → offline/backend-down hint → generic fallback.
export const getErrorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.request) return 'Cannot reach the server. Please make sure the backend is running.';
  return fallback;
};

const api = axios.create({
  // In dev the Vite proxy forwards /api → localhost:5000 (see vite.config.js).
  // In production, set VITE_API_URL to the deployed backend URL.
  baseURL: import.meta.env?.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the JWT (if logged in) to every outgoing request
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// If any NON-auth request gets a 401 (expired/invalid token), wipe the stale
// session and bounce to /login — with ?reason=expired so the Login page can
// say WHY (a silent redirect felt like "login keeps sending me back").
// Auth endpoints are excluded so a failed login attempt just shows an error
// instead of causing a redirect loop.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isAuthCall = url.includes('/auth/');

    if (status === 401 && !isAuthCall && !window.location.pathname.startsWith('/login')) {
      clearSession();
      window.location.assign('/login?reason=expired');
    }
    return Promise.reject(error);
  }
);

// ---- Jobs (STEP 8) ----
// Builds the query string from the page's URL params; empty values and the
// sentinel 'all' are dropped so the API only receives real filters.
export async function fetchJobs(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value != null && value !== 'all') query.set(key, String(value));
  });
  const qs = query.toString();
  const { data } = await api.get(`/jobs${qs ? `?${qs}` : ''}`);
  // controller shape: data.data = { jobs: [...], pagination: { total, page, limit, pages } }
  return data.data;
}

export async function fetchCategoryCounts() {
  const { data } = await api.get('/jobs/category-counts');
  return data.data.categories; // [{ name, count }] — active jobs only
}

export async function fetchJob(id) {
  const { data } = await api.get(`/jobs/${id}`);
  return data.data.job; // postedBy is populated with name + email
}

// Typeahead for the search box (STEP 9). Best-effort: callers may ignore errors.
export async function fetchSuggestions(q) {
  const { data } = await api.get(`/jobs/suggestions?q=${encodeURIComponent(q)}`);
  return data.data; // { titles: [], locations: [], skills: [], categories: [] }
}

// ---- Applications (STEP 11) ----
// Multipart submit. The explicit 'multipart/form-data' header is NOT noise —
// it is required: our axios instance defaults Content-Type to
// application/json, and axios' default transformRequest JSON-stringifies a
// FormData body whenever the request carries a JSON content type (files lost,
// server gets a 400). With an explicit multipart type the FormData is passed
// through untouched, and the boundary is filled in at send time (the browser
// for XHR; axios' fetch adapter deletes the boundaryless header so fetch can
// set its own — see axios/lib/adapters/fetch.js).
export async function applyToJob(jobId, { resumeFile, coverLetter = '' }) {
  const form = new FormData();
  form.append('resume', resumeFile);
  if (coverLetter.trim()) form.append('coverLetter', coverLetter.trim());
  const { data } = await api.post(`/jobs/${jobId}/applications`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data; // { success, message, data: { application } }
}

export async function fetchMyApplications() {
  const { data } = await api.get('/applications/my');
  return data.data.applications; // each: { status, createdAt, job: {...}|null }
}

// ---- Profile (STEP 13) ----
export async function fetchMyProfile() {
  const { data } = await api.get('/users/me');
  return data.data.user;
}

export async function updateMyProfile(payload) {
  const { data } = await api.put('/users/me', payload);
  return data.data.user;
}

// ---- Recruiter dashboard (STEP 14) ----
export async function fetchRecruiterSummary() {
  const { data } = await api.get('/applications/recruiter/summary');
  return data.data; // { jobs, applications, perJob, recent }
}

// ---- Manage jobs (STEP 15) ----
// The recruiter's OWN list — any status (drafts/closed included). Supports
// the same search/sort params as /jobs, plus ?status=active|draft|closed.
export async function fetchMyJobs(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value != null && value !== 'all') query.set(key, String(value));
  });
  const qs = query.toString();
  const { data } = await api.get(`/jobs/mine${qs ? `?${qs}` : ''}`);
  return data.data; // { jobs, pagination }
}

// Partial updates are legal: PUT validates only the fields it receives, so
// { status: 'closed' } publishes/closes without resending the whole job.
export async function updateJob(id, payload) {
  const { data } = await api.put(`/jobs/${id}`, payload);
  return data.data.job;
}

// Create (STEP 16) — status in the payload decides live vs draft.
export async function createJob(payload) {
  const { data } = await api.post('/jobs', payload);
  return data.data.job;
}

// Response message states how many applications were cascade-deleted.
export async function deleteJob(id) {
  const { data } = await api.delete(`/jobs/${id}`);
  return data; // { success, message, data: { removedApplications, removedFiles } }
}

// Resume download via axios (NOT a plain <a href>): the route is
// Bearer-protected, and browser navigation can't attach headers. We fetch
// the blob and click a one-shot object URL instead.
export async function downloadApplicationResume(applicationId, filename = 'resume') {
  const res = await api.get(`/applications/${applicationId}/resume`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export default api;

// ---- Saved jobs + profile resume (STEP 18) ----
export async function fetchSavedJobs() {
  const { data } = await api.get('/users/me/saved');
  return data.data.jobs; // job docs, each + applicationStatus ('applied'…|null)
}

// One toggle endpoint: no need to know the current state — the response
// reports what it did, and every entry point (card, details, saved page)
// updates from the SAME number.
export async function toggleSavedJob(jobId) {
  const { data } = await api.put(`/users/me/saved/${jobId}`);
  return data.data; // { saved, savedCount }
}

// Multipart with the explicit header (axios + FormData rule from Step 11).
export async function uploadProfileResume(file) {
  const form = new FormData();
  form.append('resume', file);
  const { data } = await api.post('/users/me/resume', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data.user;
}

export async function downloadMyResume() {
  const res = await api.get('/users/me/resume', { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'my-resume';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function deleteMyResume() {
  const { data } = await api.delete('/users/me/resume');
  return data.message; // 'Resume removed' | 'No resume to remove' (idempotent)
}

// ---- STEP 19: recruiter applicant pipeline ----

export async function fetchJobApplications(jobId, status = '') {
  const params = status ? { status } : {};
  const { data } = await api.get(`/applications/job/${jobId}`, { params });
  return data.data; // { job, applicants, total }
}

export async function updateApplicationStatus(jobId, applicationId, status, note = '') {
  const { data } = await api.put(`/applications/job/${jobId}/${applicationId}/status`, {
    status,
    note,
  });
  return data; // { success, message, data: { application } }
}
