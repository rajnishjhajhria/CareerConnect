// CareerConnect — JWT authentication middleware (STEP 3)
// `protect` verifies the token and loads the user; use it on any private route.
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // Expect: Authorization: Bearer <token>
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorized, user no longer exists' });
    }

    req.user = user; // password already excluded by select:false
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired, please log in again' });
    }
    return res.status(401).json({ success: false, message: 'Not authorized, invalid token' });
  }
};

// CareerConnect — optional authentication (STEP 7)
// Like `protect`, but never rejects: sets req.user when a VALID token is
// present, otherwise continues as a guest. Used by public routes that behave
// slightly differently for logged-in users (e.g. draft owners viewing drafts).
const optionalAuth = async (req, res, next) => {
  req.user = null;
  const header = req.headers.authorization;

  if (header && header.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
      req.user = await User.findById(decoded.userId);
    } catch {
      req.user = null; // invalid/expired token → treat as guest, don't fail
    }
  }
  next();
};

module.exports = { protect, optionalAuth };
