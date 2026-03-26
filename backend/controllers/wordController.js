const { resolveWordData, sanitizeWordList } = require('../services/wordService');

const getWord = async (req, res) => {
  try {
    const wordData = await resolveWordData(req.params.word);
    return res.status(200).json(wordData);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
};

module.exports = {
  getWord,
  resolveWordData,
  sanitizeWordList,
};
