const bcrypt = require('bcryptjs');
const config = require('../config/env');
const User = require('../models/User');
const {
  clearAuthCookies,
  doesRefreshTokenMatch,
  getCookieMaxAge,
  getRefreshTokenExpiry,
  getTokensFromRequest,
  hashRefreshToken,
  setAuthCookies,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require('../utils/auth');

function sanitizeUser(user) {
  return {
    id: user._id,
    email: user.email,
    createdAt: user.createdAt,
  };
}

async function issueSession(res, user) {
  const accessToken = signAccessToken(user._id.toString());
  const refreshToken = signRefreshToken(user._id.toString());

  user.refreshTokenHash = await hashRefreshToken(refreshToken);
  user.refreshTokenExpiresAt = new Date(
    Date.now() + getCookieMaxAge(getRefreshTokenExpiry(), 30 * 24 * 60 * 60 * 1000)
  );
  await user.save();

  setAuthCookies(res, accessToken, refreshToken);
}

const signup = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ message: 'User already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, config.auth.bcryptSaltRounds);

    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
    });

    await issueSession(res, user);

    return res.status(201).json({
      message: 'User created successfully.',
      user: sanitizeUser(user),
    });
  } catch (_error) {
    return res.status(500).json({ message: 'Failed to sign up user.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    await issueSession(res, user);

    return res.status(200).json({
      message: 'Login successful.',
      user: sanitizeUser(user),
    });
  } catch (_error) {
    return res.status(500).json({ message: 'Failed to log in user.' });
  }
};

const getSession = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated.' });
  }

  return res.status(200).json({
    authenticated: true,
    user: sanitizeUser(req.user),
  });
};

const refreshSession = async (req, res) => {
  try {
    const { refreshToken } = getTokensFromRequest(req);

    if (!refreshToken) {
      clearAuthCookies(res);
      return res.status(401).json({ message: 'Refresh token missing.' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId);

    if (!user || !user.refreshTokenHash) {
      clearAuthCookies(res);
      return res.status(401).json({ message: 'Refresh token invalid.' });
    }

    if (user.refreshTokenExpiresAt && user.refreshTokenExpiresAt.getTime() < Date.now()) {
      user.refreshTokenHash = '';
      user.refreshTokenExpiresAt = null;
      await user.save();
      clearAuthCookies(res);
      return res.status(401).json({ message: 'Session expired.' });
    }

    const refreshMatches = await doesRefreshTokenMatch(refreshToken, user.refreshTokenHash);

    if (!refreshMatches) {
      user.refreshTokenHash = '';
      user.refreshTokenExpiresAt = null;
      await user.save();
      clearAuthCookies(res);
      return res.status(401).json({ message: 'Refresh token invalid.' });
    }

    await issueSession(res, user);

    return res.status(200).json({
      message: 'Session refreshed.',
      user: sanitizeUser(user),
    });
  } catch (_error) {
    clearAuthCookies(res);
    return res.status(401).json({ message: 'Unable to refresh session.' });
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = getTokensFromRequest(req);

    if (refreshToken) {
      try {
        const decoded = verifyRefreshToken(refreshToken);
        const user = await User.findById(decoded.userId);

        if (user) {
          user.refreshTokenHash = '';
          user.refreshTokenExpiresAt = null;
          await user.save();
        }
      } catch (_error) {
        // Ignore invalid refresh token during logout and still clear cookies.
      }
    }

    clearAuthCookies(res);
    return res.status(200).json({ message: 'Logged out successfully.' });
  } catch (_error) {
    clearAuthCookies(res);
    return res.status(200).json({ message: 'Logged out successfully.' });
  }
};

module.exports = {
  getSession,
  login,
  logout,
  refreshSession,
  signup,
};
