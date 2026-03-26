const Word = require('../models/wordModel');
const UserWord = require('../models/userWordModel');

const ALLOWED_LIMITS = [5, 10, 15, 20];

const QUESTION_TYPES = {
  meaning: {
    getPrompt: (word) => `What is the meaning of "${word.word}"?`,
    getCorrectAnswer: (word) => word.meaning,
    getDistractorPool: (wordBank, currentWordId) =>
      wordBank
        .filter((entry) => String(entry._id) !== String(currentWordId))
        .map((entry) => entry.meaning),
  },
  synonym: {
    getPrompt: (word) => `Which option is a synonym of "${word.word}"?`,
    getCorrectAnswer: (word) => sampleOne(word.synonyms || []),
    getDistractorPool: (wordBank, currentWordId) =>
      wordBank
        .filter((entry) => String(entry._id) !== String(currentWordId))
        .flatMap((entry) => entry.synonyms || []),
  },
  antonym: {
    getPrompt: (word) => `Which option is an antonym of "${word.word}"?`,
    getCorrectAnswer: (word) => sampleOne(word.antonyms || []),
    getDistractorPool: (wordBank, currentWordId) =>
      wordBank
        .filter((entry) => String(entry._id) !== String(currentWordId))
        .flatMap((entry) => entry.antonyms || []),
  },
};

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function shuffleArray(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function sampleOne(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return '';
  }

  return items[Math.floor(Math.random() * items.length)];
}

function getUniqueValues(items) {
  return [...new Set(items.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean))];
}

function getAvailableQuestionTypes(word) {
  return Object.entries(QUESTION_TYPES)
    .filter(([, config]) => Boolean(config.getCorrectAnswer(word)))
    .map(([type]) => type);
}

function buildQuestion(word, wordBank) {
  const availableTypes = shuffleArray(getAvailableQuestionTypes(word));

  for (const type of availableTypes) {
    const config = QUESTION_TYPES[type];
    const correctAnswer = config.getCorrectAnswer(word);

    if (!correctAnswer) {
      continue;
    }

    const distractors = getUniqueValues(config.getDistractorPool(wordBank, word._id))
      .filter((option) => option !== correctAnswer);

    if (distractors.length < 3) {
      continue;
    }

    const options = shuffleArray([correctAnswer, ...shuffleArray(distractors).slice(0, 3)]);

    return {
      id: String(word._id),
      type,
      word: word.word,
      prompt: config.getPrompt(word),
      options,
      correctAnswer,
    };
  }

  return null;
}

async function fetchLearnedWords(userId) {
  const learnedEntries = await UserWord.find({
    user: userId,
    isLearned: true,
  }).populate('word');

  return learnedEntries
    .map((entry) => entry.word)
    .filter((word) => word && typeof word === 'object' && word.word);
}

async function fetchWordBank() {
  return Word.find({}, 'word meaning synonyms antonyms').lean();
}

async function generateQuizForUser(userId, limit) {
  if (!ALLOWED_LIMITS.includes(limit)) {
    throw createHttpError(400, 'Limit must be one of: 5, 10, 15, 20.');
  }

  const learnedWords = await fetchLearnedWords(userId);

  if (learnedWords.length < limit) {
    throw createHttpError(400, 'Not enough learned words to start test.');
  }

  const wordBank = await fetchWordBank();
  const questions = shuffleArray(
    learnedWords
      .map((word) => buildQuestion(word, wordBank))
      .filter(Boolean)
  ).slice(0, limit);

  if (questions.length < limit) {
    throw createHttpError(400, 'Not enough learned words to start test.');
  }

  return {
    totalQuestions: questions.length,
    questions,
  };
}

module.exports = {
  ALLOWED_LIMITS,
  generateQuizForUser,
};
