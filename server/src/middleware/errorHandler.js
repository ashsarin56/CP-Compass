const AppError = require('../utils/AppError');

function handleCastError(err) {
  const message = `Invalid ID format: ${err.value}`;
  return new AppError(message, 400);
}

function handleValidationError(err) {
  const messages = Object.values(err.errors).map((e) => e.message);
  const message = `Validation failed: ${messages.join('. ')}`;
  return new AppError(message, 400);
}

function handleDuplicateKey(err) {
  const field = Object.keys(err.keyValue).join(', ');
  const message = `Duplicate field: ${field}`;
  return new AppError(message, 409);
}

function handleJWTError() {
  return new AppError('Invalid token', 401);
}

function handleTokenExpiredError() {
  return new AppError('Token expired', 401);
}

function sendErrorDev(err, res) {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
}

function sendErrorProd(err, res) {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    console.error('NON-OPERATIONAL ERROR:', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong'
    });
  }
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'production') {
    let error = Object.create(err);
    error.message = err.message;

    if (err.name === 'CastError') error = handleCastError(err);
    if (err.name === 'ValidationError') error = handleValidationError(err);
    if (err.code === 11000) error = handleDuplicateKey(err);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleTokenExpiredError();

    sendErrorProd(error, res);
  } else {
    if (err.name === 'CastError') err = handleCastError(err);
    if (err.name === 'ValidationError') err = handleValidationError(err);
    if (err.code === 11000) err = handleDuplicateKey(err);
    if (err.name === 'JsonWebTokenError') err = handleJWTError();
    if (err.name === 'TokenExpiredError') err = handleTokenExpiredError();

    sendErrorDev(err, res);
  }
}

module.exports = errorHandler;
