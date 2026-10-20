// CareerConnect — site footer (STEP 4, spec §38)
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-dark text-light mt-auto">
      <div className="container py-5">
        <div className="row g-4">
          <div className="col-md-4">
            <h5 className="fw-bold">
              <i className="bi bi-briefcase-fill me-2" aria-hidden="true"></i>
              CareerConnect
            </h5>
            <p className="text-white-50">Find opportunities. Build your career.</p>
          </div>
          <div className="col-6 col-md-2">
            <h6 className="text-uppercase small">Quick Links</h6>
            <ul className="list-unstyled">
              <li>
                <Link className="link-light link-opacity-75 link-underline-opacity-0" to="/">
                  Home
                </Link>
              </li>
              <li>
                <Link className="link-light link-opacity-75 link-underline-opacity-0" to="/jobs">
                  Jobs
                </Link>
              </li>
            </ul>
          </div>
          <div className="col-6 col-md-3">
            <h6 className="text-uppercase small">For Job Seekers</h6>
            <ul className="list-unstyled">
              <li>
                <Link className="link-light link-opacity-75 link-underline-opacity-0" to="/jobs">
                  Browse Jobs
                </Link>
              </li>
              <li>
                <Link
                  className="link-light link-opacity-75 link-underline-opacity-0"
                  to="/applications"
                >
                  Applications
                </Link>
              </li>
              <li>
                <Link
                  className="link-light link-opacity-75 link-underline-opacity-0"
                  to="/profile"
                >
                  Profile
                </Link>
              </li>
            </ul>
          </div>
          <div className="col-6 col-md-3">
            <h6 className="text-uppercase small">For Recruiters</h6>
            <ul className="list-unstyled">
              <li>
                <Link
                  className="link-light link-opacity-75 link-underline-opacity-0"
                  to="/recruiter/jobs/create"
                >
                  Post a Job
                </Link>
              </li>
              <li>
                <Link
                  className="link-light link-opacity-75 link-underline-opacity-0"
                  to="/recruiter/jobs"
                >
                  Manage Jobs
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-top border-secondary">
        <div className="container py-3 text-center text-white-50 small">
          © {new Date().getFullYear()} CareerConnect — Find opportunities. Build your career.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
