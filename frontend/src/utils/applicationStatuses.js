// CareerConnect — shared application-status display data (STEP 14).
// Both dashboards (and the applications/applicants pages in Steps 17/19)
// import from here so a status never renders two different colors.
export const APPLICATION_STATUSES = ['applied', 'reviewed', 'shortlisted', 'hired', 'rejected'];

export const STATUS_PILL = {
  applied: 'text-bg-primary',
  reviewed: 'text-bg-info',
  shortlisted: 'text-bg-warning',
  hired: 'text-bg-success',
  rejected: 'text-bg-danger',
};
