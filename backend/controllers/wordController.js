const axios = require('axios');
const Word = require('../models/wordModel');

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const buildWordResponse = (wordDocument) => ({
  word: wordDocument.word,
  meaning: wordDocument.meaning,
  synonyms: wordDocument.synonyms,
  antonyms: wordDocument.antonyms,
});

const sanitizeWordList = (values = []) => {
  const normalizedValues = values
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return [...new Set(normalizedValues)];
};

const extractWordData = (apiEntry, normalizedWord) => {
  const meanings = Array.isArray(apiEntry.meanings) ? apiEntry.meanings : [];

  for (const meaningEntry of meanings) {
    const definitions = Array.isArray(meaningEntry.definitions) ? meaningEntry.definitions : [];

    for (const definitionEntry of definitions) {
      const meaning = definitionEntry.definition;

      if (!meaning) {
        continue;
      }

      const synonyms = sanitizeWordList([
        ...(meaningEntry.synonyms || []),
        ...(definitionEntry.synonyms || []),
      ]);

      const antonyms = sanitizeWordList([
        ...(meaningEntry.antonyms || []),
        ...(definitionEntry.antonyms || []),
      ]);

      return {
        word: normalizedWord,
        meaning,
        synonyms,
        antonyms,
      };
    }
  }

  return null;
};

const resolveWordData = async (inputWord) => {
  const normalizedWord = inputWord.trim().toLowerCase();

  if (!normalizedWord) {
    throw createHttpError(400, 'Word parameter is required.');
  }

  try {
    const existingWord = await Word.findOne({ word: normalizedWord });

    if (existingWord) {
      return buildWordResponse(existingWord);
    }

    let apiResponse;

    try {
      apiResponse = await axios.get(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalizedWord)}`
      );
    } catch (error) {
      if (error.response?.status === 404) {
        throw createHttpError(404, 'Word not found.');
      }

      throw createHttpError(502, 'Failed to fetch word data from dictionary API.');
    }

    const [apiEntry] = Array.isArray(apiResponse.data) ? apiResponse.data : [];
    const wordData = apiEntry ? extractWordData(apiEntry, normalizedWord) : null;

    if (!wordData) {
      throw createHttpError(404, 'Word meaning not found.');
    }

    const savedWord = await Word.create(wordData);

    return buildWordResponse(savedWord);
  } catch (error) {
    if (error.code === 11000) {
      const duplicatedWord = await Word.findOne({ word: normalizedWord });

      if (duplicatedWord) {
        return buildWordResponse(duplicatedWord);
      }
    }

    if (error.statusCode) {
      throw error;
    }

    throw createHttpError(500, 'Failed to fetch word.');
  }
};

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
