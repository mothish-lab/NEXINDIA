/**
 * Centralized error handler middleware.
 * Must be registered LAST in Express app.
 */
function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, message: 'Validation error', errors: messages });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(400).json({ success: false, message: `${field} already exists` });
  }

  // Mongoose cast error (bad ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'File too large. Maximum size is 5MB.' });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  // Default internal server error
  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;
  res.status(statusCode).json({ success: false, message });
}

/**
 * Create an HTTP error with a specific status code.
 */
function createError(message, statusCode = 500) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

module.exports = { errorHandler, createError };
