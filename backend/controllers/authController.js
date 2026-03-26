const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (userId) => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('Missing JWT_SECRET in environment variables.');
  }

  return jwt.sign({ userId }, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

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

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
    });

    return res.status(201).json({
      message: 'User created successfully.',
      user: {
        id: user._id,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
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

    const token = generateToken(user._id.toString());

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to log in user.' });
  }
};

module.exports = {
  signup,
  login,
};
