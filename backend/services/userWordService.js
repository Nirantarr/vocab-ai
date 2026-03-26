const UserWord = require('../models/userWordModel');
const Word = require('../models/wordModel');

const normalizeWord = (value) => value.trim().toLowerCase();

const getAlphabetGroup = (value) => {
  const normalizedValue = typeof value === 'string' ? normalizeWord(value) : '';
  const firstCharacter = normalizedValue.charAt(0);

  if (/^[a-z]$/.test(firstCharacter)) {
    return firstCharacter.toUpperCase();
  }

  return '#';
};

const getWordPayload = (userWord) => {
  const populatedWord =
    userWord.word && typeof userWord.word === 'object' && userWord.word.word ? userWord.word : null;

  if (populatedWord) {
    return {
      word: populatedWord.word,
      meaning: populatedWord.meaning,
      synonyms: populatedWord.synonyms || [],
      antonyms: populatedWord.antonyms || [],
    };
  }

  return {
    word: typeof userWord.word === 'string' ? userWord.word : '',
    meaning: userWord.meaning || '',
    synonyms: userWord.synonyms || [],
    antonyms: userWord.antonyms || [],
  };
};

const formatUserWordResponse = (userWord) => {
  const wordPayload = getWordPayload(userWord);

  return {
    id: userWord._id,
    user: userWord.user,
    word: wordPayload.word,
    meaning: wordPayload.meaning,
    synonyms: wordPayload.synonyms,
    antonyms: wordPayload.antonyms,
    isLearned: Boolean(userWord.isLearned),
    lastSeen: userWord.lastSeen,
    createdAt: userWord.createdAt || null,
  };
};

const compareUserWordsForDashboard = (left, right) => {
  const leftPayload = getWordPayload(left);
  const rightPayload = getWordPayload(right);
  const leftGroup = getAlphabetGroup(leftPayload.word);
  const rightGroup = getAlphabetGroup(rightPayload.word);

  if (leftGroup !== rightGroup) {
    if (leftGroup === '#') {
      return 1;
    }

    if (rightGroup === '#') {
      return -1;
    }

    return leftGroup.localeCompare(rightGroup);
  }

  const learnedDelta = Number(Boolean(left.isLearned)) - Number(Boolean(right.isLearned));

  if (learnedDelta !== 0) {
    return learnedDelta;
  }

  const leftLastSeen = left.lastSeen ? new Date(left.lastSeen).getTime() : 0;
  const rightLastSeen = right.lastSeen ? new Date(right.lastSeen).getTime() : 0;

  if (leftLastSeen !== rightLastSeen) {
    return rightLastSeen - leftLastSeen;
  }

  return leftPayload.word.localeCompare(rightPayload.word);
};

const findDictionaryWord = async (word) => Word.findOne({ word: normalizeWord(word) });

const findModernUserWord = (userId, wordId) =>
  UserWord.findOne({
    user: userId,
    word: wordId,
  }).populate('word');

const findLegacyUserWordId = async (userId, normalizedWord) => {
  const legacyUserWord = await UserWord.collection.findOne({
    user: userId,
    word: normalizedWord,
  });

  return legacyUserWord?._id || null;
};

const migrateLegacyUserWord = async (legacyUserWordId, wordId) =>
  UserWord.findByIdAndUpdate(
    legacyUserWordId,
    { $set: { word: wordId } },
    { new: true, runValidators: true }
  ).populate('word');

const findUserWordRecord = async (userId, wordDocument) => {
  const modernUserWord = await findModernUserWord(userId, wordDocument._id);

  if (modernUserWord) {
    return modernUserWord;
  }

  const legacyUserWordId = await findLegacyUserWordId(userId, wordDocument.word);

  if (!legacyUserWordId) {
    return null;
  }

  return migrateLegacyUserWord(legacyUserWordId, wordDocument._id);
};

const saveWordForUser = async (userId, word) => {
  const wordDetails = await findDictionaryWord(word);

  if (!wordDetails) {
    const error = new Error('Word not found in dictionary collection.');
    error.statusCode = 404;
    throw error;
  }

  const existingUserWord = await findUserWordRecord(userId, wordDetails);

  if (existingUserWord) {
    existingUserWord.lastSeen = new Date();
    await existingUserWord.save();
    return { userWord: existingUserWord, created: false };
  }

  try {
    const userWord = await UserWord.create({
      user: userId,
      word: wordDetails._id,
    });

    const populatedUserWord = await UserWord.findById(userWord._id).populate('word');

    return { userWord: populatedUserWord, created: true };
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }

    const duplicatedUserWord = await findUserWordRecord(userId, wordDetails);

    if (!duplicatedUserWord) {
      throw error;
    }

    duplicatedUserWord.lastSeen = new Date();
    await duplicatedUserWord.save();

    return { userWord: duplicatedUserWord, created: false };
  }
};

const markUserWordLearned = async (userId, word, isLearned) => {
  const wordDetails = await findDictionaryWord(word);

  if (!wordDetails) {
    const error = new Error('Saved word not found.');
    error.statusCode = 404;
    throw error;
  }

  const userWord = await findUserWordRecord(userId, wordDetails);

  if (!userWord) {
    const error = new Error('Saved word not found.');
    error.statusCode = 404;
    throw error;
  }

  userWord.isLearned = isLearned;
  userWord.lastSeen = new Date();
  await userWord.save();

  return userWord;
};

const listUserWords = async (userId) => {
  const userWords = await UserWord.find({ user: userId })
    .populate('word');

  return userWords.sort(compareUserWordsForDashboard).map(formatUserWordResponse);
};

const getUserWordStats = async (userId) => {
  const [stats] = await UserWord.aggregate([
    {
      $match: {
        user: userId,
      },
    },
    {
      $group: {
        _id: null,
        totalWords: { $sum: 1 },
        learnedWords: {
          $sum: {
            $cond: ['$isLearned', 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalWords: 1,
        learnedWords: 1,
      },
    },
  ]);

  return (
    stats || {
      totalWords: 0,
      learnedWords: 0,
    }
  );
};

module.exports = {
  formatUserWordResponse,
  getUserWordStats,
  listUserWords,
  markUserWordLearned,
  normalizeWord,
  saveWordForUser,
};
