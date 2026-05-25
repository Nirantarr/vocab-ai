const express = require('express');
const { signup, login, logout, refreshSession, getSession } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh', refreshSession);
router.post('/logout', logout);
router.get('/session', protect, getSession);

module.exports = router;
