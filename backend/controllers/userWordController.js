const {
  getUserWordStats,
  listUserWords,
  markUserWordLearned,
  normalizeWord,
  saveWordForUser,
  formatUserWordResponse,
} = require('../services/userWordService');

const saveWord = async (req, res) => {
  try {
    const { word } = req.body;

    if (typeof word !== 'string' || !word.trim()) {
      return res.status(400).json({ message: 'Word is required.' });
    }

    const { userWord, created } = await saveWordForUser(req.user._id, normalizeWord(word));

    return res.status(created ? 201 : 200).json(formatUserWordResponse(userWord));
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || 'Failed to save word.' });
  }
};

const markLearned = async (req, res) => {
  try {
    const { word, isLearned } = req.body;

    if (typeof word !== 'string' || !word.trim()) {
      return res.status(400).json({ message: 'Word is required.' });
    }

    if (typeof isLearned !== 'boolean') {
      return res.status(400).json({ message: 'isLearned must be a boolean.' });
    }

    const userWord = await markUserWordLearned(req.user._id, normalizeWord(word), isLearned);

    return res.status(200).json(formatUserWordResponse(userWord));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json({ message: error.message || 'Failed to update learned status.' });
  }
};

const getMyWords = async (req, res) => {
  try {
    const userWords = await listUserWords(req.user._id);
    return res.status(200).json(userWords);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch saved words.' });
  }
};

const getUserStats = async (req, res) => {
  try {
    const stats = await getUserWordStats(req.user._id);
    return res.status(200).json(stats);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch user word stats.' });
  }
};

module.exports = {
  saveWord,
  getMyWords,
  getUserStats,
  markLearned,
};
