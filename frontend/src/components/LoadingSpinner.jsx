// CareerConnect — reusable loading indicator (STEP 4)
// <LoadingSpinner message="Loading jobs…" /> — fullPage centers it vertically.
const LoadingSpinner = ({ message = 'Loading…', fullPage = false }) => {
  const content = (
    <div className="text-center py-4" role="status" aria-live="polite">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">{message}</span>
      </div>
      <p className="text-muted mt-2 mb-0">{message}</p>
    </div>
  );

  if (fullPage) {
    return (
      <div
        className="d-flex align-items-center justify-content-center"
        style={{ minHeight: '60vh' }}
      >
        {content}
      </div>
    );
  }
  return content;
};

export default LoadingSpinner;
