// CareerConnect — route map (STEP 4, spec §22)
// Public routes render directly; private ones are wrapped in <RoleRoute>,
// which checks BOTH login and role (job seekers and recruiters stay separated).
import { useEffect } from 'react';
import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import RoleRoute from './components/RoleRoute';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Jobs from './pages/Jobs';
import JobDetails from './pages/JobDetails';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Applications from './pages/Applications';
import SavedJobs from './pages/SavedJobs';
import RecruiterDashboard from './pages/RecruiterDashboard';
import ManageJobs from './pages/ManageJobs';
import CreateJob from './pages/CreateJob';
import EditJob from './pages/EditJob';
import Applicants from './pages/Applicants';
import NotFound from './pages/NotFound';

// Shared layout: navbar on top, page content in the middle, footer at the
// bottom. (Both dashboards add their own sidebar inside the page.)
// STEP 20 polish: skip-to-content link for keyboard users + #main target.
const AppLayout = () => (
  <>
    <a className="visually-hidden-focusable" href="#main-content">
      Skip to main content
    </a>
    <Navbar />
    <main id="main-content" className="flex-grow-1">
      <Outlet />
    </main>
    <Footer />
  </>
);

// STEP 20: honest browser-tab titles derived from the route in ONE place
// (a per-page hook would mean touching 14 files for the same effect).
const TITLE_TABS = [
  [/^\/jobs\/[^/]+$/, 'Job Details'],
  [/^\/jobs$/, 'Browse Jobs'],
  [/^\/saved-jobs$/, 'Saved Jobs'],
  [/^\/applications$/, 'My Applications'],
  [/^\/profile$/, 'My Profile'],
  [/^\/dashboard$/, 'Dashboard'],
  [/^\/recruiter\/jobs\/[^/]+\/applicants$/, 'Applicants'],
  [/^\/recruiter\/jobs\/create$/, 'Post a Job'],
  [/^\/recruiter\/jobs\/[^/]+\/edit$/, 'Edit Job'],
  [/^\/recruiter\/jobs$/, 'Manage Jobs'],
  [/^\/recruiter\/dashboard$/, 'Recruiter Dashboard'],
  [/^\/login$/, 'Log In'],
  [/^\/register$/, 'Sign Up'],
];

function App() {
  const location = useLocation();

  useEffect(() => {
    const hit = TITLE_TABS.find(([rx]) => rx.test(location.pathname));
    const section = hit
      ? hit[1]
      : location.pathname === '/'
        ? null
        : 'Not Found';
    document.title = section
      ? `${section} · CareerConnect`
      : 'CareerConnect | Find opportunities. Build your career.';
  }, [location.pathname]);

  return (
    <>
      <ScrollToTop />
      <Routes>
      <Route element={<AppLayout />}>
        {/* Public */}
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="jobs/:id" element={<JobDetails />} />

        {/* Job seeker only */}
        <Route
          path="dashboard"
          element={
            <RoleRoute allowedRoles={['jobseeker']}>
              <Dashboard />
            </RoleRoute>
          }
        />
        <Route
          path="applications"
          element={
            <RoleRoute allowedRoles={['jobseeker']}>
              <Applications />
            </RoleRoute>
          }
        />
        <Route
          path="saved-jobs"
          element={
            <RoleRoute allowedRoles={['jobseeker']}>
              <SavedJobs />
            </RoleRoute>
          }
        />

        {/* Both roles — profile edit (STEP 13; recruiters land here via
            "Company profile" in the dashboard sidebar — same fields, one
            User model per spec §25) */}
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Recruiter only */}
        <Route
          path="recruiter/dashboard"
          element={
            <RoleRoute allowedRoles={['recruiter']}>
              <RecruiterDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="recruiter/jobs"
          element={
            <RoleRoute allowedRoles={['recruiter']}>
              <ManageJobs />
            </RoleRoute>
          }
        />
        <Route
          path="recruiter/jobs/create"
          element={
            <RoleRoute allowedRoles={['recruiter']}>
              <CreateJob />
            </RoleRoute>
          }
        />
        <Route
          path="recruiter/jobs/:id/edit"
          element={
            <RoleRoute allowedRoles={['recruiter']}>
              <EditJob />
            </RoleRoute>
          }
        />
        <Route
          path="recruiter/jobs/:jobId/applicants"
          element={
            <RoleRoute allowedRoles={['recruiter']}>
              <Applicants />
            </RoleRoute>
          }
        />

        {/* Catch-all 404 */}
        <Route path="*" element={<NotFound />} />
      </Route>
      </Routes>
    </>
  );
}

export default App;
