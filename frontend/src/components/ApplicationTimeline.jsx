// CareerConnect — per-application status timeline (STEP 17)
// Purely presentational: turns the application's status into a mini stepper
// so the seeker sees WHERE they are, not just a word. 'rejected' is a branch
// of the pipeline (applied → rejected), so it draws its own two nodes rather
// than pretending the pipeline advanced. No state, no fetches — which is why
// it's a component and not part of the page.
import { Fragment } from 'react';
import { formatDate } from '../utils/format';

const PIPELINE = [
  { key: 'applied', label: 'Applied', icon: 'bi-send-check' },
  { key: 'reviewed', label: 'Under review', icon: 'bi-eye' },
  { key: 'shortlisted', label: 'Shortlisted', icon: 'bi-star' },
  { key: 'hired', label: 'Hired', icon: 'bi-briefcase' },
];

const ApplicationTimeline = ({ status, createdAt, reviewedAt, statusNote }) => {
  const rejected = status === 'rejected';
  const steps = rejected
    ? [PIPELINE[0], { key: 'rejected', label: 'Rejected', icon: 'bi-x-octagon' }]
    : PIPELINE;
  const currentIndex = rejected
    ? 1
    : Math.max(
        0,
        PIPELINE.findIndex((s) => s.key === status)
      );

  // the only dates the model actually records per stage (Step 11 fields)
  const dateFor = (key) => (key === 'applied' ? createdAt : key === 'reviewed' ? reviewedAt : null);

  return (
    <div>
      <div className="d-flex align-items-start" role="list" aria-label="Application progress">
        {steps.map((step, i) => {
          const done = !rejected && i < currentIndex;
          const current = i === currentIndex;
          const circle = done
            ? 'bg-success border-success text-white'
            : current
              ? rejected
                ? 'bg-danger border-danger text-white'
                : 'bg-primary border-primary text-white'
              : 'bg-white border text-muted';
          // segment i joins node i-1 → node i
          const segment = rejected
            ? i === 1
              ? '#dc3545'
              : '#198754'
            : i <= currentIndex
              ? '#198754'
              : '#dee2e6';
          const when = dateFor(step.key);
          return (
            <Fragment key={step.key}>
              {i > 0 && (
                <div
                  aria-hidden="true"
                  className="flex-grow-1"
                  style={{ height: 2, backgroundColor: segment, marginTop: 16 }}
                ></div>
              )}
              <div className="d-flex flex-column align-items-center text-center px-1" role="listitem" style={{ minWidth: 84 }}>
                <span
                  className={`border rounded-circle d-flex align-items-center justify-content-center ${circle}`}
                  style={{ width: 34, height: 34 }}
                >
                  <i className={`bi ${done ? 'bi-check-lg' : step.icon} small`}></i>
                </span>
                <span className={`small mt-1${current ? ' fw-semibold' : ' text-muted'}`}>{step.label}</span>
                <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                  {when ? formatDate(when) : ''}
                </span>
              </div>
            </Fragment>
          );
        })}
      </div>
      {statusNote && (
        <p className="small bg-light border border-start-0 border-end-0 border-bottom-0 px-2 py-2 mt-2 mb-0 text-muted">
          <i className="bi bi-chat-left-quote me-1" aria-hidden="true"></i>
          <span className="fw-semibold">Recruiter note:</span> “{statusNote}”
        </p>
      )}
    </div>
  );
};

export default ApplicationTimeline;
