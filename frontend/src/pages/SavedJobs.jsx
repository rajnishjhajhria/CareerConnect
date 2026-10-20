// CareerConnect — Saved Jobs page (STEP 18)
// One request (GET /api/users/me/saved) returns the whole truth: job cards
// PLUS whether I already applied to each one (applicationStatus), because the
// server joins that in cheaply while it has the ids — the browser would
// otherwise need a second list + a client-side join.
// Un-saving here and saving from anywhere are THE SAME endpoint (toggle), so
// every entry point can't drift.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchSavedJobs,
  toggleSavedJob,
  getErrorMessage,
} from '../services/api';
import { STATUS_PILL } from '../utils/applicationStatuses';
import JobCard from '../components/JobCard';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertMessage from '../components/AlertMessage';

const SavedJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [notice, setNotice] = useState({ kind: 'info', text: '' });
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchSavedJobs()
      .then((list) => {
        if (!cancelled) {
          setJobs(list);
          setLoaded(true);
          setError('');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getErrorMessage(err, 'Could not load your saved jobs.'));
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  const handleUnsave = async (job) => {
    setBusyId(job._id);
    try {
      await toggleSavedJob(job._id);
      setJobs((prev) => prev.filter((j) => j._id !== job._id)); // no refetch needed
      setNotice({ kind: 'info', text: `Removed “${job.title}” from saved jobs` });
    } catch (err) {
      setNotice({ kind: 'danger', text: getErrorMessage(err, 'Could not update the saved list.') });
    } finally {
      setBusyId('');
    }
  };

  if (!loaded) return <LoadingSpinner fullPage message="Loading saved jobs…" />;

  if (error) {
    return (
      <div className="container py-5" style={{ maxWidth: 560 }}>
        <AlertMessage type="danger" message={error} />
        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={() => {
            setLoaded(false);
            setReloadTick((t) => t + 1);
          }}
        >
          <i className="bi bi-arrow-clockwise me-1" aria-hidden="true"></i>Try again
        </button>
      </div>
    );
  }

  return (
    <div className="container py-4 py-5">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1">
        <h4 className="mb-0">
          <i className="bi bi-bookmark-fill text-primary me-2" aria-hidden="true"></i>Saved Jobs
        </h4>
        {jobs.length > 0 && (
          <span className="text-muted small">{jobs.length} saved</span>
        )}
      </div>

      {notice.text && (
        <AlertMessage
          type={notice.kind}
          message={notice.text}
          onClose={() => setNotice({ kind: 'info', text: '' })}
        />
      )}

      {jobs.length === 0 ? (
        <div className="text-center bg-white border rounded-4 py-5 px-3">
          <i className="bi bi-bookmark fs-1 text-muted d-block mb-2" aria-hidden="true"></i>
          <h6>Nothing saved yet</h6>
          <p className="text-muted small mb-3">
            Tap <i className="bi bi-bookmark" aria-hidden="true"></i> on any job card (or the job page) to keep it
            here while you decide.
          </p>
          <Link to="/jobs" className="btn btn-primary btn-sm">
            Browse jobs
          </Link>
        </div>
      ) : (
        <div className="mt-3">
          {jobs.map((job) => (
            <div key={job._id} className="mb-1">
              {(job.applicationStatus || job.status === 'closed') && (
                <p className="small mb-1 ps-1 d-flex flex-wrap gap-2 align-items-center">
                  {job.applicationStatus ? (
                    <>
                      <span className="text-muted">You already applied —</span>
                      <span className={`badge rounded-pill ${STATUS_PILL[job.applicationStatus]}`}>
                        {job.applicationStatus}
                      </span>
                      <Link to="/applications" className="text-decoration-none small">
                        track it →
                      </Link>
                    </>
                  ) : (
                    <span className="text-muted">
                      <i className="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>
                      This job is closed for new applications.
                    </span>
                  )}
                </p>
              )}
              <JobCard
                job={job}
                saved
                busy={busyId === job._id}
                onToggleSave={handleUnsave}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedJobs;
