// CareerConnect — Edit Job (STEP 16)
// Same shared <JobForm> as Post-a-Job, pre-filled from GET /api/jobs/:id.
// Drafts open here too — the API returns a draft ONLY to its owner (others
// get 404), so ownership is already enforced before the form even renders.
// Save = PUT with the full payload; "Publish now" (drafts) is the same PUT
// with status flipped — one endpoint, like the Step 15 toggle.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchJob, updateJob, getErrorMessage } from '../services/api';
import { jobToForm } from '../utils/jobForm';
import JobForm from '../components/JobForm';
import DashboardSidebar from '../components/DashboardSidebar';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertMessage from '../components/AlertMessage';

const EditJob = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchJob(id)
      .then((data) => {
        if (!cancelled) setJob(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(getErrorMessage(err, 'Could not load this job.'));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSubmit = async (payload) => {
    setError('');
    try {
      await updateJob(id, payload);
      navigate('/recruiter/jobs', {
        replace: true,
        state: { notice: `Changes to “${job.title}” saved ✓` },
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the job.'));
      throw err;
    }
  };

  if (loadError) {
    return (
      <div className="container py-5" style={{ maxWidth: 560 }}>
        <AlertMessage type="danger" message={loadError} />
        <Link to="/recruiter/jobs" className="btn btn-outline-primary btn-sm">
          <i className="bi bi-arrow-left me-1" aria-hidden="true"></i>Back to Manage Jobs
        </Link>
      </div>
    );
  }

  if (!job) return <LoadingSpinner fullPage message="Loading job…" />;

  return (
    <div className="container py-4 py-lg-5">
      <div className="row g-4">
        <div className="col-lg-3">
          <DashboardSidebar />
        </div>
        <div className="col-lg-9">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1">
            <h4 className="mb-0">Edit Job</h4>
            <Link to={`/jobs/${job._id}`} className="btn btn-outline-secondary btn-sm">
              <i className="bi bi-box-arrow-up-right me-1" aria-hidden="true"></i>View public page
            </Link>
          </div>
          <p className="text-muted small mb-3">
            Loaded “{job.title}” exactly as seekers (or, for drafts, as nobody but you) see it.
          </p>
          <JobForm mode="edit" initial={jobToForm(job)} currentStatus={job.status} onSubmit={handleSubmit} serverError={error} />
        </div>
      </div>
    </div>
  );
};

export default EditJob;
