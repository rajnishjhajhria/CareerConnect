// CareerConnect — reusable Bootstrap alert (STEP 4)
// <AlertMessage type="danger" message={error} onClose={() => setError('')} />
// Renders nothing when `message` is empty.
const AlertMessage = ({ type = 'info', message, onClose }) => {
  if (!message) return null;

  return (
    <div className={`alert alert-${type} alert-dismissible fade show`} role="alert">
      {message}
      <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
    </div>
  );
};

export default AlertMessage;
