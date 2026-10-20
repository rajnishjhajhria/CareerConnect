// CareerConnect — role-based authorization middleware (STEP 3)
// Use AFTER `protect`: e.g. router.post('/jobs', protect, authorize('recruiter'), createJob)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied: this action requires the ${roles.join(' or ')} role`,
      });
    }
    next();
  };
};

module.exports = { authorize };
