const { ALLOWED_LIMITS, generateQuizForUser } = require('../services/testService');

const getQuiz = async (req, res) => {
  try {
    const requestedLimit = Number.parseInt(req.query.limit, 10) || ALLOWED_LIMITS[0];
    const quiz = await generateQuizForUser(req.user._id, requestedLimit);

    return res.status(200).json(quiz);
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json({ message: error.message || 'Failed to generate quiz.' });
  }
};

module.exports = {
  getQuiz,
};
