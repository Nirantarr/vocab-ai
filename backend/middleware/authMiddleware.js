const User = require('../models/User');
const { getTokensFromRequest, verifyAccessToken } = require('../utils/auth');

const protect = async (req, res, next) => {
  try {
    const { accessToken } = getTokensFromRequest(req);

    if (!accessToken) {
      return res.status(401).json({ message: 'Not authorized. Token is missing.' });
    }

    const decoded = verifyAccessToken(accessToken);
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
