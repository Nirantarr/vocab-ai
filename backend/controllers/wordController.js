const { resolveWordData, sanitizeWordList } = require('../services/wordService');

const getWord = async (req, res) => {
  try {
    const inputWord = req.query.text || req.params.word;
    const wordData = await resolveWordData(inputWord);
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
