// CareerConnect — authentication routes (STEP 3)
const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe); // private: needs Authorization: Bearer <token>

module.exports = router;
