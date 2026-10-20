// CareerConnect — user (profile) routes (STEP 13; saved jobs + resume STEP 18)
// Both roles can manage their own profile; there is intentionally NO
// /api/users/:id route — one account may never read another's profile.
const express = require('express');
const {
  getMyProfile,
  updateMyProfile,
  toggleSavedJob,
  getSavedJobs,
  uploadMyResume,
  downloadMyResume,
  removeMyResume,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { uploadProfileResume } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/me', protect, getMyProfile);
router.put('/me', protect, updateMyProfile);

// Saved jobs — job seekers only (recruiters don't apply anywhere 🙂)
router.get('/me/saved', protect, authorize('jobseeker'), getSavedJobs);
router.put('/me/saved/:jobId', protect, authorize('jobseeker'), toggleSavedJob);

// Profile resume — any role may keep one; Multer runs before the controller
router.post('/me/resume', protect, uploadProfileResume, uploadMyResume);
router.get('/me/resume', protect, downloadMyResume);
router.delete('/me/resume', protect, removeMyResume);

module.exports = router;
