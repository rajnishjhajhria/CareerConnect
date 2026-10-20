// CareerConnect — authentication controller (STEP 3)
// Handles: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
const User = require('../models/User');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Count digits only, so "+91 98765 43210" and "9876543210" both pass
const isValidPhone = (phone) => {
  const digits = String(phone).replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
};

// Build the JSON body returned by register/login (never includes the password)
const sendTokenResponse = (user, statusCode, res, message) => {
  const token = user.getSignedJwtToken();
  const userObj = user.toObject();
  delete userObj.password;
  res.status(statusCode).json({ success: true, message, data: { user: userObj, token } });
};

// @desc    Register a new job seeker or recruiter
// @route   POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, phone, password, role } = req.body;

    // 1. Required fields
    const missing = ['name', 'email', 'phone', 'password', 'role'].filter(
      (field) => !req.body[field]
    );
    if (missing.length > 0) {
      return res
        .status(400)
        .json({ success: false, message: `Missing required fields: ${missing.join(', ')}` });
    }

    // 2. Formats (never trust frontend validation alone)
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }
    if (!isValidPhone(phone)) {
      return res
        .status(400)
        .json({ success: false, message: 'Please provide a valid phone number (10–15 digits)' });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ success: false, message: 'Password must be at least 6 characters long' });
    }
    if (!['jobseeker', 'recruiter'].includes(role)) {
      return res
        .status(400)
        .json({ success: false, message: "Role must be either 'jobseeker' or 'recruiter'" });
    }

    // 3. Duplicate email (stored lowercase, so this check is case-insensitive)
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res
        .status(409)
        .json({ success: false, message: 'An account with this email already exists' });
    }

    // 4. Create — the password is hashed by the pre-save hook in User.js
    const user = await User.create({ name, email, phone, password, role });
    sendTokenResponse(user, 201, res, 'Registration successful');
  } catch (error) {
    next(error); // forwarded to errorMiddleware (handles validation/duplicate-key errors)
  }
};

// @desc    Log a user in
// @route   POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // password has select:false, so explicitly include it for comparison
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    // Same message for "no such user" and "wrong password", so attackers
    // can't probe which email addresses are registered.
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    sendTokenResponse(user, 200, res, 'Login successful');
  } catch (error) {
    next(error);
  }
};

// @desc    Get the currently logged-in user (protect middleware runs first)
// @route   GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const userObj = req.user.toObject();
    delete userObj.password; // already excluded by select:false — belt & braces
    res.status(200).json({ success: true, message: 'Current user fetched', data: { user: userObj } });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe };
