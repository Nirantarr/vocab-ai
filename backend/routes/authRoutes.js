const express = require('express');
const { signup, login, logout, refreshSession, getSession } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { strictAuthRateLimit } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

router.post('/signup', strictAuthRateLimit, signup);
router.post('/login', strictAuthRateLimit, login);
router.post('/refresh', strictAuthRateLimit, refreshSession);
router.post('/refresh-token', strictAuthRateLimit, refreshSession);
router.post('/logout', logout);
router.get('/session', protect, getSession);

module.exports = router;
