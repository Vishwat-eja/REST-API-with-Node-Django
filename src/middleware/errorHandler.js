function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist.`
  });
}

function globalErrorHandler(err, req, res, next) {
  // Handle JSON parse syntax errors (e.g. malformed JSON in request body)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Malformed JSON',
      message: 'The request body contains invalid JSON. Please check your syntax.'
    });
  }

  // Handle SQLite constraint violations
  if (err.message && err.message.includes('UNIQUE constraint failed')) {
    let field = 'Resource';
    if (err.message.includes('users.email')) field = 'Email';
    if (err.message.includes('users.username')) field = 'Username';

    return res.status(409).json({
      success: false,
      error: 'Conflict',
      message: `${field} is already in use. Please choose another.`
    });
  }

  console.error('Unhandled Server Error:', err);

  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected internal server error occurred.'
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = {
  notFoundHandler,
  globalErrorHandler
};
