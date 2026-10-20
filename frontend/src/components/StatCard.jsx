// CareerConnect — dashboard stat tile (STEP 12; reused by Steps 14/15).
// <StatCard icon="card-checklist" label="Total applications" value={7} tone="primary" sub="+2 this week" />
const TONES = {
  primary: 'text-primary bg-primary-subtle',
  success: 'text-success bg-success-subtle',
  warning: 'text-warning bg-warning-subtle',
  info: 'text-info bg-info-subtle',
  secondary: 'text-secondary bg-secondary-subtle',
};

const StatCard = ({ icon, label, value, sub, tone = 'primary' }) => (
  <div className="card shadow-sm h-100">
    <div className="card-body d-flex align-items-center gap-3">
      <span className={`stat-tile-icon ${TONES[tone] || TONES.primary}`} aria-hidden="true">
        <i className={`bi bi-${icon}`}></i>
      </span>
      <div className="min-w-0">
        <p className="cc-filter-label fw-semibold text-muted mb-0">{label}</p>
        <p className="h4 mb-0 fw-bold">{value}</p>
        {sub && <p className="small text-muted mb-0">{sub}</p>}
      </div>
    </div>
  </div>
);

export default StatCard;
