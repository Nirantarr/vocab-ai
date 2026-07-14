const dotenv = require('dotenv');

dotenv.config();

const VALID_NODE_ENVS = new Set(['development', 'production', 'test']);
const CHROME_EXTENSION_ORIGIN_PATTERN = /^chrome-extension:\/\/[a-p]{32}$/;

function normalizeValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function requireEnv(name, fallbackNames = []) {
  const candidateNames = [name, ...fallbackNames];

  for (const candidateName of candidateNames) {
    const normalizedValue = normalizeValue(process.env[candidateName]);

    if (normalizedValue) {
      return normalizedValue;
    }
  }

  throw new Error(
    `Missing required environment variable "${name}".${fallbackNames.length ? ` Accepted fallbacks: ${fallbackNames.join(', ')}.` : ''}`
  );
}

function parseNodeEnv() {
  const nodeEnv = normalizeValue(process.env.NODE_ENV || 'development').toLowerCase();

  if (!VALID_NODE_ENVS.has(nodeEnv)) {
    throw new Error(
      `Invalid NODE_ENV value "${nodeEnv}". Expected one of: ${[...VALID_NODE_ENVS].join(', ')}.`
    );
  }

  return nodeEnv;
}

function parsePort(value) {
  const port = Number.parseInt(value, 10);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid PORT value "${value}". PORT must be a positive integer.`);
  }

  return port;
}

function parsePositiveInteger(value, variableName, defaultValue) {
  const normalizedValue = normalizeValue(value);

  if (!normalizedValue) {
    return defaultValue;
  }

  const parsedValue = Number.parseInt(normalizedValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`Invalid ${variableName} value "${value}". Expected a positive integer.`);
  }

  return parsedValue;
}

function normalizeUrl(value, variableName) {
  try {
    return new URL(value).toString().replace(/\/+$/, '');
  } catch (_error) {
    throw new Error(`Invalid ${variableName} value "${value}". Expected an absolute URL.`);
  }
}

function normalizeOrigin(value) {
  const normalizedValue = normalizeValue(value).replace(/\/+$/, '');

  if (!normalizedValue) {
    return '';
  }

  if (CHROME_EXTENSION_ORIGIN_PATTERN.test(normalizedValue)) {
    return normalizedValue;
  }

  try {
    const url = new URL(normalizedValue);

    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Unsupported protocol.');
    }

    return url.origin;
  } catch (_error) {
    throw new Error(
      `Invalid allowed origin "${value}". Expected http(s):// origin or chrome-extension://<extension-id>.`
    );
  }
}

function parseAllowedOrigins(value) {
  const origins = normalizeValue(value)
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error(
      'CORS_ALLOWED_ORIGINS must contain at least one origin. Example: https://app.example.com,chrome-extension://<extension-id>.'
    );
  }

  return [...new Set(origins)];
}

function parseBoolean(value, defaultValue) {
  const normalizedValue = normalizeValue(value).toLowerCase();

  if (!normalizedValue) {
    return defaultValue;
  }

  if (normalizedValue === 'true') {
    return true;
  }

  if (normalizedValue === 'false') {
    return false;
  }

  throw new Error(`Invalid boolean value "${value}". Expected "true" or "false".`);
}

function parseSameSite(value, defaultValue) {
  const normalizedValue = normalizeValue(value).toLowerCase();

  if (!normalizedValue) {
    return defaultValue;
  }

  const supportedValues = new Map([
    ['lax', 'lax'],
    ['strict', 'strict'],
    ['none', 'none'],
  ]);

  if (!supportedValues.has(normalizedValue)) {
    throw new Error(
      `Invalid COOKIE_SAME_SITE value "${value}". Expected one of: lax, strict, none.`
    );
  }

  return supportedValues.get(normalizedValue);
}

const nodeEnv = parseNodeEnv();
const isProduction = nodeEnv === 'production';

const config = {
  nodeEnv,
  isProduction,
  port: parsePort(requireEnv('PORT')),
  mongoUri: requireEnv('MONGODB_URI', ['MONGO_URI']),
  corsAllowedOrigins: parseAllowedOrigins(requireEnv('CORS_ALLOWED_ORIGINS')),
  auth: {
    accessTokenSecret: requireEnv('JWT_ACCESS_SECRET', ['JWT_SECRET']),
    refreshTokenSecret: requireEnv('JWT_REFRESH_SECRET', ['JWT_SECRET']),
    accessTokenExpiry: normalizeValue(process.env.JWT_ACCESS_EXPIRES_IN || '15m'),
    refreshTokenExpiry: normalizeValue(process.env.JWT_REFRESH_EXPIRES_IN || '30d'),
    bcryptSaltRounds: Number.parseInt(normalizeValue(process.env.BCRYPT_SALT_ROUNDS || '10'), 10),
  },
  cookies: {
    accessTokenName: normalizeValue(process.env.ACCESS_COOKIE_NAME || 'accessToken'),
    refreshTokenName: normalizeValue(process.env.REFRESH_COOKIE_NAME || 'refreshToken'),
    secure: parseBoolean(process.env.COOKIE_SECURE, isProduction),
    sameSite: parseSameSite(process.env.COOKIE_SAME_SITE, isProduction ? 'none' : 'lax'),
    domain: normalizeValue(process.env.COOKIE_DOMAIN),
  },
  rateLimit: {
    globalWindowMs: parsePositiveInteger(
      process.env.RATE_LIMIT_GLOBAL_WINDOW_MS,
      'RATE_LIMIT_GLOBAL_WINDOW_MS',
      15 * 60 * 1000
    ),
    globalMaxRequests: parsePositiveInteger(
      process.env.RATE_LIMIT_GLOBAL_MAX_REQUESTS,
      'RATE_LIMIT_GLOBAL_MAX_REQUESTS',
      300
    ),
    authWindowMs: parsePositiveInteger(
      process.env.RATE_LIMIT_AUTH_WINDOW_MS,
      'RATE_LIMIT_AUTH_WINDOW_MS',
      15 * 60 * 1000
    ),
    authMaxRequests: parsePositiveInteger(
      process.env.RATE_LIMIT_AUTH_MAX_REQUESTS,
      'RATE_LIMIT_AUTH_MAX_REQUESTS',
      10
    ),
  },
  urls: {
    clientUrl: normalizeUrl(requireEnv('CLIENT_URL'), 'CLIENT_URL'),
  },
};

if (!Number.isInteger(config.auth.bcryptSaltRounds) || config.auth.bcryptSaltRounds <= 0) {
  throw new Error(
    `Invalid BCRYPT_SALT_ROUNDS value "${process.env.BCRYPT_SALT_ROUNDS}". Expected a positive integer.`
  );
}

module.exports = config;
