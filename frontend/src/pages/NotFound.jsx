// CareerConnect — 404 page (STEP 4), rendered by the catch-all "*" route.
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="container py-5 text-center">
      <i className="bi bi-compass display-1 text-muted" aria-hidden="true"></i>
      <h1 className="display-6 fw-bold mt-3">404 — Page not found</h1>
      <p className="text-muted">The page you&apos;re looking for doesn&apos;t exist or moved.</p>
      <Link className="btn btn-primary" to="/">
        <i className="bi bi-house me-1" aria-hidden="true"></i>Go to Home
      </Link>
    </div>
  );
};

export default NotFound;
