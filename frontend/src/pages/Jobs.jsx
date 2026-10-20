// CareerConnect — Job listings page (STEP 8, spec §19)
// Two design rules make this page small and correct:
// 1) The URL query string is the single source of truth for every filter,
//    sort and page value (?search=react&jobType=Remote&page=2) — results are
//    shareable, bookmarkable, and browser-back works for free.
// 2) No `loading` flag to keep in sync: each response records the queryKey it
//    answers, and "stale" (current key has no answer yet) simply means
//    "render the skeleton". Child components never fetch — they call
//    updateParams() and the one effect below refetches.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchJobs, fetchSavedJobs, toggleSavedJob, getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import SearchBar from '../components/SearchBar';
import JobFilters from '../components/JobFilters';
import JobList from '../components/JobList';
import Pagination from '../components/Pagination';

const SORT_OPTIONS = [
  { value: '', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'salary_high', label: 'Salary: high → low' },
  { value: 'salary_low', label: 'Salary: low → high' },
  { value: 'deadline', label: 'Closing soonest' },
];

// Params shown as removable chips under the search bar.
const CHIP_LABELS = {
  search: 'Search',
  location: 'Location',
  jobType: 'Job type',
  category: 'Category',
  experience: 'Experience',
  salaryMin: 'Min salary',
  salaryMax: 'Max salary',
  skills: 'Skills',
};

const Jobs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams]);
  const { isJobSeeker } = useAuth();

  const [reloadTick, setReloadTick] = useState(0); // "Try again" bumps this
  // Every distinct query gets a unique key; the response carries it back.
  const queryKey = `${searchParams.toString()}|${reloadTick}`;
  const [fetched, setFetched] = useState(null); // { key, data, error }

  // ---- saved-jobs bookmark (STEP 18) ----
  // ids fetched once for the session (not per query-params change), then the
  // SET itself is the state of truth after each toggle — same endpoint the
  // Saved page refetches on mount, so pages can't disagree after navigation.
  const [savedIds, setSavedIds] = useState(() => new Set());
  const [busySave, setBusySave] = useState('');

  useEffect(() => {
    if (!isJobSeeker) return;
    let cancelled = false;
    fetchSavedJobs()
      .then((list) => {
        if (!cancelled) setSavedIds(new Set(list.map((j) => j._id)));
      })
      .catch(() => {}); // bookmark state is decoration — the list must still load
    return () => {
      cancelled = true;
    };
  }, [isJobSeeker]);

  const handleToggleSave = async (job) => {
    setBusySave(job._id);
    try {
      const result = await toggleSavedJob(job._id);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (result.saved) next.add(job._id);
        else next.delete(job._id);
        return next;
      });
    } catch {
      // the button just keeps its previous (server-true) state
    } finally {
      setBusySave('');
    }
  };

  const isFresh = fetched?.key === queryKey; // our current query already answered
  const loading = !isFresh;
  const result = isFresh ? fetched.data : null;
  const error = isFresh ? fetched.error : '';

  // The ONLY fetch effect on this page: any URL-param change refetches.
  useEffect(() => {
    let cancelled = false;
    fetchJobs(params)
      .then((data) => {
        if (!cancelled) setFetched({ key: queryKey, data, error: '' });
      })
      .catch((err) => {
        if (!cancelled) {
          setFetched({ key: queryKey, data: null, error: getErrorMessage(err, 'Could not load jobs. Is the backend running?') });
        }
      });
    return () => {
      cancelled = true; // ignore responses to an older query
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- params is derived from queryKey's URL part
  }, [queryKey]);

  const updateParams = (patch) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === '' || value == null) next.delete(key);
      else next.set(key, String(value));
    });
    if (!('page' in patch)) next.delete('page'); // any filter change → back to page 1
    setSearchParams(next);
  };

  const clearAll = () => {
    const next = new URLSearchParams();
    if (params.sort) next.set('sort', params.sort); // sort is a view setting, not a filter
    setSearchParams(next);
  };

  const pagination = result?.pagination;

  // STEP 20: jump back to the top of the results when the page changes
  // (first render deliberately does nothing — no scroll-jacking on arrival).
  const seenPage = useRef(null);
  useEffect(() => {
    const page = pagination?.page;
    if (page == null) return;
    if (seenPage.current !== null && seenPage.current !== page) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    seenPage.current = page;
  }, [pagination?.page]);
  const total = pagination?.total ?? 0;
  const from = total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const to = pagination ? Math.min(pagination.page * pagination.limit, total) : 0;
  const activeChips = Object.keys(CHIP_LABELS).filter((key) => params[key]);

  return (
    <div className="container py-4 py-lg-5">
      {/* Search header */}
      <div className="mb-4">
        <h1 className="h4 mb-3">
          Find your next role
          <span className="text-muted fw-normal ms-2 small">
            {loading ? 'searching…' : `${total} job${total === 1 ? '' : 's'} open`}
          </span>
        </h1>
        {/* STEP 9: no key-based remount any more — SearchBar adopts external
            URL changes itself (back button, chip ×) and pushes live edits. */}
        <SearchBar
          initialTerm={params.search || ''}
          initialLocation={params.location || ''}
          onSearch={updateParams}
        />
      </div>

      <div className="row g-4">
        {/* Filters: sticky sidebar on desktop, collapsible on mobile */}
        <div className="col-12 col-lg-4 col-xl-3">
          <button
            type="button"
            className="btn btn-outline-primary w-100 d-lg-none mb-2"
            data-bs-toggle="collapse"
            data-bs-target="#filtersCollapse"
            aria-expanded="false"
            aria-controls="filtersCollapse"
          >
            <i className="bi bi-funnel me-1" aria-hidden="true"></i>
            Filters{activeChips.length ? ` (${activeChips.length})` : ''}
          </button>
          <div className="collapse d-lg-block" id="filtersCollapse">
            <div className="cc-filter-sticky">
              <JobFilters
                params={params}
                onChange={updateParams}
                onClearAll={clearAll}
                activeCount={activeChips.length}
              />
            </div>
          </div>
        </div>

        {/* Results column */}
        <div className="col-12 col-lg-8 col-xl-9">
          {/* Toolbar: result range + sort */}
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <p className="text-muted small mb-0" aria-live="polite">
              {total > 0 ? `Showing ${from}–${to} of ${total}` : ''}
            </p>
            <div className="d-flex align-items-center gap-2">
              <label htmlFor="sort-select" className="small text-muted mb-0">
                Sort
              </label>
              <select
                id="sort-select"
                className="form-select form-select-sm w-auto"
                value={params.sort || ''}
                onChange={(e) => updateParams({ sort: e.target.value })}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Removable filter chips */}
          {activeChips.length > 0 && (
            <div className="d-flex flex-wrap gap-2 mb-3">
              {activeChips.map((key) => (
                <button
                  key={key}
                  type="button"
                  className="btn btn-sm btn-outline-primary rounded-pill"
                  onClick={() => updateParams({ [key]: '' })}
                  title={`Remove ${CHIP_LABELS[key]} filter`}
                >
                  <span className="text-muted">{CHIP_LABELS[key]}:</span>{' '}
                  <span className="fw-semibold">{params[key]}</span>
                  <i className="bi bi-x-lg ms-1 small" aria-hidden="true"></i>
                </button>
              ))}
              <button type="button" className="btn btn-sm btn-link text-danger" onClick={clearAll}>
                Clear all
              </button>
            </div>
          )}

          <JobList
            jobs={result?.jobs || []}
            loading={loading}
            error={error}
            onRetry={() => setReloadTick((t) => t + 1)}
            onClearFilters={clearAll}
            hasFilters={activeChips.length > 0}
            onToggleSave={isJobSeeker ? handleToggleSave : undefined}
            isSaved={isJobSeeker ? (jobId) => savedIds.has(jobId) : undefined}
            busyId={busySave}
          />

          {pagination && (
            <Pagination
              page={pagination.page}
              pages={pagination.pages}
              onChange={(n) => updateParams({ page: n <= 1 ? '' : String(n) })}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Jobs;
