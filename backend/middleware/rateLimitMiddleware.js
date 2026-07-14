const rateLimit = require('express-rate-limit');
const config = require('../config/env');

function buildRateLimitExceededMessage(message, retryAfterSeconds) {
  return {
    message,
    retryAfterSeconds,
  };
}

function createJsonRateLimit(options) {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
    handler(req, res, _next, rateLimitOptions) {
      const retryAfterHeader = res.getHeader('Retry-After');
      const retryAfterSeconds = Number.parseInt(String(retryAfterHeader || '0'), 10) || 0;
      const body = buildRateLimitExceededMessage(
        rateLimitOptions.message || 'Too many requests. Please try again later.',
        retryAfterSeconds
      );

      res.status(rateLimitOptions.statusCode).json(body);
    },
  });
}

const globalApiRateLimit = createJsonRateLimit({
  windowMs: config.rateLimit.globalWindowMs,
  max: config.rateLimit.globalMaxRequests,
  message: 'Too many API requests. Please try again later.',
});

const strictAuthRateLimit = createJsonRateLimit({
  windowMs: config.rateLimit.authWindowMs,
  max: config.rateLimit.authMaxRequests,
  skipSuccessfulRequests: true,
  message: 'Too many authentication attempts. Please try again later.',
});

module.exports = {
  globalApiRateLimit,
  strictAuthRateLimit,
};
