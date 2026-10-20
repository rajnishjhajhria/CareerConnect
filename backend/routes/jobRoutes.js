// CareerConnect — job routes (STEP 7; apply route added STEP 11)
const express = require('express');
const {
  getJobs,
  getMyJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  getSuggestions,
  getCategoryCounts,
} = require('../controllers/jobController');
const { applyToJob } = require('../controllers/applicationController');
const { uploadResume } = require('../middleware/uploadMiddleware');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

// IMPORTANT: /mine and /suggestions must come BEFORE /:id, otherwise those
// words are treated as a job id.
router.get('/mine', protect, authorize('recruiter'), getMyJobs);

router.get('/suggestions', getSuggestions); // public typeahead (STEP 9)
router.get('/category-counts', getCategoryCounts); // public landing-page tiles (STEP 20)
router.get('/', getJobs); // public: active jobs only
router.get('/:id', optionalAuth, getJobById); // public (+ draft owners via token)

router.post('/', protect, authorize('recruiter'), createJob);
// Apply — seeker-only, multipart (resume handled by Multer first)
router.post('/:id/applications', protect, authorize('jobseeker'), uploadResume, applyToJob);
router.put('/:id', protect, authorize('recruiter'), updateJob);
router.delete('/:id', protect, authorize('recruiter'), deleteJob);

module.exports = router;
