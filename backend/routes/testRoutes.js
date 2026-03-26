const express = require('express');
const { getQuiz } = require('../controllers/testController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getQuiz);

module.exports = router;
