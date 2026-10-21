class AppError extends Error { constructor(status, code, message) { super(message); this.status = status; this.code = code; } }
function notFound(_req, _res, next) { next(new AppError(404, 'NOT_FOUND', 'Route not found')); }
function errorHandler(err, _req, res, _next) {
  let status = err.status || 500; let code = err.code || 'INTERNAL_ERROR'; let message = status >= 500 ? 'An unexpected server error occurred' : err.message;
  if (err.name === 'ValidationError') { status = 422; code = 'VALIDATION_ERROR'; message = 'One or more fields are invalid'; }
  else if (err.code === 11000) { status = 409; code = 'DUPLICATE_ACCOUNT'; message = 'An account already uses one of these details'; }
  else if (err.name === 'CastError') { status = 422; code = 'VALIDATION_ERROR'; message = 'One or more fields are invalid'; }
  else if (err.type === 'entity.parse.failed') { status = 400; code = 'INVALID_JSON'; message = 'Request body must contain valid JSON'; }
  else if (err.type === 'entity.too.large') { status = 413; code = 'BODY_TOO_LARGE'; message = 'Request body is too large'; }
  else if (status === 500) console.error(JSON.stringify({ level: 'error', name: err.name || 'Error', code: err.code || 'INTERNAL_ERROR' }));
  res.status(status).json({ success: false, error: { code, message } });
}
module.exports = { AppError, notFound, errorHandler };

function tooManyRequests(_req, res) {
  res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } });
}
module.exports.tooManyRequests = tooManyRequests;

