// CareerConnect — Post a Job (STEP 16)
// Thin page around the shared <JobForm>: it only decides WHERE the payload
// goes (POST /api/jobs) and WHERE the user lands after success. The success
// message travels via router state so ManageJobs can show it after reload.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createJob, getErrorMessage } from '../services/api';
import JobForm from '../components/JobForm';
import DashboardSidebar from '../components/DashboardSidebar';

const CreateJob = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const handleSubmit = async (payload) => {
    setError('');
    try {
      const job = await createJob(payload);
      navigate('/recruiter/jobs', {
        replace: true,
        state: {
          notice:
            payload.status === 'draft'
              ? `Draft “${job.title}” saved — publish it when you're ready ✓`
              : `“${job.title}” is live on the job board ✓`,
        },
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create the job.'));
      throw err; // JobForm flips its button back out of "busy"
    }
  };

  return (
    <div className="container py-4 py-lg-5">
      <div className="row g-4">
        <div className="col-lg-3">
          <DashboardSidebar />
        </div>
        <div className="col-lg-9">
          <h4 className="mb-1">Post a Job</h4>
          <p className="text-muted small mb-3">
            Fields marked * are required. Everything you type here is exactly what seekers see.
          </p>
          <JobForm mode="create" onSubmit={handleSubmit} serverError={error} />
        </div>
      </div>
    </div>
  );
};

export default CreateJob;
