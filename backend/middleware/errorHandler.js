const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Set default error status and message
  let status = err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation Error';
  } else if (err.name === 'UnauthorizedError') {
    status = 401;
    message = 'Unauthorized';
  } else if (err.code === 'SQLITE_CONSTRAINT') {
    status = 400;
    if (err.message.includes('UNIQUE')) {
      message = 'A record with this value already exists';
    } else if (err.message.includes('FOREIGN KEY')) {
      message = 'Referenced record does not exist';
    } else {
      message = 'Database constraint violation';
    }
  } else if (err.code === 'SQLITE_ERROR') {
    status = 500;
    message = 'Database error occurred';
  }

  // Send error response
  res.status(status).json({
    error: {
      message,
      status,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        details: err 
      })
    }
  });
};

// Export the middleware function
module.exports = errorHandler;
