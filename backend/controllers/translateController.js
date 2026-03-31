const { translateText } = require('../services/translateService');

const translate = async (req, res) => {
  try {
    const { text, targetLang } = req.body;
    const result = await translateText(text, targetLang);
    return res.status(200).json(result);
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json({ message: error.message || 'Translation failed.' });
  }
};

module.exports = {
  translate,
};
