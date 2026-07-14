const cors = require('cors');
const config = require('../config/env');

class CorsOriginError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CorsOriginError';
    this.statusCode = 403;
  }
}

const allowedOrigins = new Set(config.corsAllowedOrigins);

const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new CorsOriginError('Origin not allowed by CORS.'));
  },
  credentials: true,
});

function corsErrorHandler(error, _req, res, next) {
  if (!(error instanceof CorsOriginError)) {
    next(error);
    return;
  }

  res.status(error.statusCode).json({ message: error.message });
}

module.exports = {
  corsMiddleware,
  corsErrorHandler,
};
