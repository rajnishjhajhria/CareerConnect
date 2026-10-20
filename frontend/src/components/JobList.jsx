// CareerConnect — JobList (STEP 8, spec §20)
// Owns the three data-fetch states for the list: skeleton while loading,
// error alert with Retry, and a friendly empty state. The actual card markup
// lives in JobCard.
import JobCard from './JobCard';
import AlertMessage from './AlertMessage';

const SkeletonCard = () => (
  <div className="card mb-3">
    <div className="card-body d-flex gap-3">
      <div className="cc-skeleton rounded flex-shrink-0" style={{ width: 48, height: 48 }}></div>
      <div className="flex-grow-1">
        <div className="cc-skeleton mb-2" style={{ width: '45%', height: 18 }}></div>
        <div className="cc-skeleton mb-2" style={{ width: '30%', height: 14 }}></div>
        <div className="cc-skeleton mb-2" style={{ width: '90%', height: 14 }}></div>
        <div className="cc-skeleton" style={{ width: '60%', height: 14 }}></div>
      </div>
    </div>
  </div>
);

const JobList = ({ jobs, loading, error, onRetry, onClearFilters, hasFilters, onToggleSave, isSaved, busyId }) => {
  if (error) {
    return (
      <div className="card">
        <div className="card-body">
          <AlertMessage type="danger" message={error} />
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={onRetry}>
            <i className="bi bi-arrow-clockwise me-1" aria-hidden="true"></i>Try again
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div aria-hidden="true">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!jobs.length) {
    return (
      <div className="card text-center py-5">
        <div className="card-body">
          <i className="bi bi-search display-5 text-muted" aria-hidden="true"></i>
          <h3 className="h5 mt-3">No matching jobs found</h3>
          <p className="text-muted mb-3">
            Try a different keyword or remove some filters — new jobs are posted every day.
          </p>
          {hasFilters && (
            <button type="button" className="btn btn-primary btn-sm" onClick={onClearFilters}>
              Clear all filters
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {jobs.map((job) => (
        <JobCard
          key={job._id}
          job={job}
          saved={isSaved ? isSaved(job._id) : false}
          busy={busyId === job._id}
          onToggleSave={onToggleSave}
        />
      ))}
    </div>
  );
};

export default JobList;
