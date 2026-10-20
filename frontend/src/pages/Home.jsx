// CareerConnect — landing page (STEP 4; live data in STEP 20)
// Nothing here is a made-up number anymore: category tiles and the featured
// strip read from GET /api/jobs/category-counts and GET /api/jobs (active
// jobs only). If the API is down the sections degrade to honest empty states —
// a landing page must never spin forever or show fake data.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchCategoryCounts, fetchJobs } from '../services/api';
import JobCard from '../components/JobCard';
import LoadingSpinner from '../components/LoadingSpinner';

// Static icon choices per category name; unknown categories get a briefcase.
const CATEGORY_ICONS = {
  Technology: 'cpu',
  'Data Science': 'bar-chart',
  Design: 'palette',
  Marketing: 'megaphone',
  Finance: 'cash-coin',
  'Human Resources': 'people',
  Sales: 'graph-up-arrow',
  Engineering: 'gear',
};

const Home = () => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const [categories, setCategories] = useState(null); // null = loading, [] = none yet
  const [featured, setFeatured] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cats, jobsRes] = await Promise.all([
          fetchCategoryCounts(),
          fetchJobs({ limit: 3, sort: 'newest' }),
        ]);
        if (cancelled) return;
        setCategories(cats);
        setFeatured(jobsRes.jobs.slice(0, 3));
      } catch {
        if (!cancelled) {
          setCategories([]);
          setFeatured([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(query.trim() ? `/jobs?search=${encodeURIComponent(query.trim())}` : '/jobs');
  };

  return (
    <>
      {/* Hero */}
      <section className="hero-section text-white">
        <div className="container py-5">
          <div className="row align-items-center py-4">
            <div className="col-lg-7">
              <h1 className="display-5 fw-bold">Find Your Next Opportunity</h1>
              <p className="lead opacity-75">
                Discover jobs that match your skills, experience, and career goals.
              </p>
              <form onSubmit={handleSearch} className="cc-hero-search d-flex gap-2 mt-4" role="search">
                <label className="visually-hidden" htmlFor="hero-search">
                  Search jobs
                </label>
                <input
                  id="hero-search"
                  type="search"
                  className="form-control form-control-lg"
                  placeholder="Search by job title, skill, or company"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button type="submit" className="btn btn-light btn-lg px-4">
                  <i className="bi bi-search me-1" aria-hidden="true"></i>
                  Search jobs
                </button>
              </form>
              <div className="cc-hero-actions d-flex gap-2 mt-3">
                <Link className="btn btn-outline-light" to="/jobs">
                  Browse all jobs
                </Link>
                <Link className="btn btn-warning" to="/register">
                  Create Account
                </Link>
              </div>
              {/* Live pulse of the board — numbers computed from the same
                  aggregation the category tiles use, never typed in. */}
              {categories !== null && categories.length > 0 && (
                <div className="d-flex flex-wrap gap-2 mt-4">
                  <span className="cc-hero-chip">
                    <i className="bi bi-briefcase-fill" aria-hidden="true"></i>
                    {categories.reduce((sum, c) => sum + c.count, 0)} open roles
                  </span>
                  <span className="cc-hero-chip">
                    <i className="bi bi-grid-3x3-gap-fill" aria-hidden="true"></i>
                    {categories.length} {categories.length === 1 ? 'category' : 'categories'} hiring
                  </span>
                </div>
              )}
            </div>
            <div className="col-lg-5 d-none d-lg-block text-center">
              <i className="bi bi-briefcase display-1 opacity-50" aria-hidden="true"></i>
            </div>
          </div>
        </div>
      </section>

      {/* Categories — live counts of open roles per category */}
      <section className="container py-5">
        <h2 className="h4 fw-bold text-center">Browse by category</h2>
        <p className="text-muted text-center mb-4">
          Counts reflect the jobs open on the board right now
        </p>
        {categories === null ? (
          <LoadingSpinner />
        ) : categories.length === 0 ? (
          <p className="text-center text-muted mb-0">
            No open roles yet — new postings appear here the moment recruiters publish them.
          </p>
        ) : (
          <div className="row g-3">
            {categories.slice(0, 8).map((cat) => (
              <div className="col-6 col-md-3" key={cat.name}>
                <Link
                  className="card category-card h-100 text-decoration-none"
                  to={`/jobs?category=${encodeURIComponent(cat.name)}`}
                >
                  <div className="card-body text-center">
                    <i
                      className={`bi bi-${CATEGORY_ICONS[cat.name] || 'briefcase'} fs-2 text-primary`}
                      aria-hidden="true"
                    ></i>
                    <h3 className="h6 fw-bold mt-2 mb-1">{cat.name}</h3>
                    <small className="text-muted">
                      {cat.count} open {cat.count === 1 ? 'role' : 'roles'}
                    </small>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Featured — newest live postings, same JobCard as the search page */}
      <section className="bg-white border-top border-bottom">
        <div className="container py-5">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h4 fw-bold mb-0">Latest jobs</h2>
            <Link className="btn btn-sm btn-outline-primary" to="/jobs">
              View all <i className="bi bi-arrow-right ms-1" aria-hidden="true"></i>
            </Link>
          </div>
          {featured === null ? (
            <LoadingSpinner />
          ) : featured.length === 0 ? (
            <p className="text-muted text-center py-3 mb-0">
              The board is empty right now — check back soon.
            </p>
          ) : (
            <div className="row g-3">
              {featured.map((job) => (
                <div className="col-lg-4" key={job._id}>
                  <JobCard job={job} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="container py-5">
        <h2 className="h4 fw-bold text-center mb-4">How CareerConnect works</h2>
        <div className="row g-3 text-center">
          {[
            { icon: 'person-plus', title: '1. Create your account', text: 'Sign up as a job seeker or recruiter in under a minute.' },
            { icon: 'file-earmark-text', title: '2. Build your profile', text: 'Add skills, experience, and upload your resume.' },
            { icon: 'send-check', title: '3. Apply & track', text: 'Apply in one click and follow every application live.' },
          ].map((s) => (
            <div className="col-md-4" key={s.title}>
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <i className={`bi bi-${s.icon} fs-1 text-primary`} aria-hidden="true"></i>
                  <h3 className="h5 fw-bold mt-3">{s.title}</h3>
                  <p className="text-muted mb-0">{s.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why us — only claims the app can back up */}
      <section className="bg-white border-top border-bottom">
        <div className="container py-5">
          <h2 className="h4 fw-bold text-center mb-4">Why use CareerConnect?</h2>
          <div className="row g-3">
            {[
              { icon: 'search', title: 'Search that understands', text: 'Keyword search, filters, and typeahead — across title, skills, and company.' },
              { icon: 'filetype-pdf', title: 'Real resumes, real files', text: 'Uploads are validated (type + size) and served only to the recruiter you applied to.' },
              { icon: 'kanban', title: 'Application tracking', text: 'Every stage — applied, shortlisted, interview — in one dashboard.' },
              { icon: 'phone', title: 'Works everywhere', text: 'Fully responsive, from your phone to your desktop.' },
            ].map((f) => (
              <div className="col-md-6 col-lg-3" key={f.title}>
                <div className="d-flex gap-3">
                  <i className={`bi bi-${f.icon} fs-3 text-primary`} aria-hidden="true"></i>
                  <div>
                    <h3 className="h6 fw-bold mb-1">{f.title}</h3>
                    <p className="text-muted small mb-0">{f.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-5 text-center">
        <h2 className="h4 fw-bold">Ready to build your career?</h2>
        <p className="text-muted">Join CareerConnect today — it&apos;s free for job seekers.</p>
        <Link className="btn btn-primary btn-lg" to="/register">
          Get started <i className="bi bi-arrow-right ms-1" aria-hidden="true"></i>
        </Link>
      </section>
    </>
  );
};

export default Home;
