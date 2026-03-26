const express = require('express');
const { saveWord, getMyWords, getUserStats, markLearned } = require('../controllers/userWordController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/save-word', protect, saveWord);
router.put('/mark-learned', protect, markLearned);
router.get('/my-words', protect, getMyWords);
router.get('/stats', protect, getUserStats);

module.exports = router;
