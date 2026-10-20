// CareerConnect — centralized error handling (STEP 3)
// Guarantees every error leaves the API in the { success:false, message } shape.
const notFound = (req, res, next) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
};

const errorHandler = (err, req, res, next) => {
  console.error('Server error:', err.message);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose schema validation failed (e.g. bad email, short password)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }
  // Duplicate key (e.g. email registered twice at the exact same moment)
  if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate value: this email is already registered';
  }
  // Invalid MongoDB ObjectId in a URL param
  if (err.name === 'CastError') {
    statusCode = 404;
    message = 'Resource not found';
  }
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Not authorized, invalid token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Session expired, please log in again';
  }

  res.status(statusCode).json({ success: false, message });
};

module.exports = { notFound, errorHandler };
