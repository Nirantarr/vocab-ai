const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

const ACCESS_COOKIE_NAME = config.cookies.accessTokenName;
const REFRESH_COOKIE_NAME = config.cookies.refreshTokenName;

function getAccessTokenExpiry() {
  return config.auth.accessTokenExpiry;
}

function getRefreshTokenExpiry() {
  return config.auth.refreshTokenExpiry;
}

function parseDurationMs(value, fallbackMs) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return fallbackMs;
  }

  const normalizedValue = value.trim().toLowerCase();
  const match = normalizedValue.match(/^(\d+)(ms|s|m|h|d)?$/);

  if (!match) {
    return fallbackMs;
  }

  const amount = Number(match[1]);
  const unit = match[2] || 'ms';
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * (multipliers[unit] || 1);
}

function getCookieMaxAge(expiryValue, fallbackMs) {
  return parseDurationMs(expiryValue, fallbackMs);
}

function getCookieOptions() {
  const cookieOptions = {
    httpOnly: true,
    sameSite: config.cookies.sameSite,
    secure: config.cookies.secure,
    path: '/',
  };

  if (config.cookies.domain) {
    cookieOptions.domain = config.cookies.domain;
  }

  return cookieOptions;
}

function signAccessToken(userId) {
  return jwt.sign({ userId }, config.auth.accessTokenSecret, {
    expiresIn: getAccessTokenExpiry(),
  });
}

function signRefreshToken(userId) {
  return jwt.sign({ userId }, config.auth.refreshTokenSecret, {
    expiresIn: getRefreshTokenExpiry(),
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.auth.accessTokenSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, config.auth.refreshTokenSecret);
}

function parseCookies(req) {
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) {
    return {};
  }

  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf('=');

      if (separatorIndex === -1) {
        return cookies;
      }

      const key = part.slice(0, separatorIndex).trim();
      const value = decodeURIComponent(part.slice(separatorIndex + 1).trim());

      cookies[key] = value;
      return cookies;
    }, {});
}

function getTokensFromRequest(req) {
  const cookies = parseCookies(req);
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : '';

  return {
    accessToken: cookies[ACCESS_COOKIE_NAME] || bearerToken || '',
    refreshToken: cookies[REFRESH_COOKIE_NAME] || '',
  };
}

function clearAuthCookies(res) {
  const cookieOptions = getCookieOptions();
  res.clearCookie(ACCESS_COOKIE_NAME, cookieOptions);
  res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions);
}

function setAuthCookies(res, accessToken, refreshToken) {
  const cookieOptions = getCookieOptions();

  res.cookie(ACCESS_COOKIE_NAME, accessToken, {
    ...cookieOptions,
    maxAge: getCookieMaxAge(getAccessTokenExpiry(), 15 * 60 * 1000),
  });

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...cookieOptions,
    maxAge: getCookieMaxAge(getRefreshTokenExpiry(), 30 * 24 * 60 * 60 * 1000),
  });
}

async function hashRefreshToken(token) {
  return bcrypt.hash(token, config.auth.bcryptSaltRounds);
}

async function doesRefreshTokenMatch(token, hash) {
  if (!token || !hash) {
    return false;
  }

  return bcrypt.compare(token, hash);
}

module.exports = {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  clearAuthCookies,
  doesRefreshTokenMatch,
  getCookieMaxAge,
  getRefreshTokenExpiry,
  getTokensFromRequest,
  hashRefreshToken,
  parseCookies,
  setAuthCookies,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
