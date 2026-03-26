const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized. Token is missing.' });
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error('Missing JWT_SECRET in environment variables.');
    }

    const decoded = jwt.verify(token, jwtSecret);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Not authorized. User not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized. Invalid token.' });
  }
};

module.exports = {
  protect,
};
