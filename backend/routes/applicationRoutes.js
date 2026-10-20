// CareerConnect — application routes (STEP 11; recruiter summary STEP 14)
// Mounted at /api/applications (the submit route lives under /api/jobs/:id/applications
// because the job id belongs in the URL of the resource being acted on).
const express = require('express');
const {
  getMyApplications,
  downloadResume,
  getRecruiterSummary,
  getJobApplicants,
  updateApplicationStatus,
} = require('../controllers/applicationController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

// NOTE: literal paths are declared BEFORE the '/:id/…' pattern.
router.get('/my', protect, authorize('jobseeker'), getMyApplications);
router.get('/recruiter/summary', protect, authorize('recruiter'), getRecruiterSummary);
// STEP 19 — recruiter pipeline (both check job ownership internally, 404 otherwise)
router.get('/job/:jobId', protect, authorize('recruiter'), getJobApplicants);
router.put(
  '/job/:jobId/:applicationId/status',
  protect,
  authorize('recruiter'),
  updateApplicationStatus
);
router.get('/:id/resume', protect, downloadResume); // applicant OR that job's recruiter

module.exports = router;
