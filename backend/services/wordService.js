const axios = require('axios');
const Word = require('../models/wordModel');
const { createHttpError, translateText, translateWordList } = require('./translateService');

const buildWordResponse = (wordDocument, overrides = {}) => ({
  word: wordDocument.word,
  language: 'en',
  meaning: wordDocument.meaning,
  synonyms: wordDocument.synonyms,
  antonyms: wordDocument.antonyms,
  ...overrides,
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

const fetchEnglishDictionaryWord = async (normalizedWord) => {
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

  return wordData;
};

const findCachedEnglishWord = async (normalizedWord) => Word.findOne({ word: normalizedWord });

const resolveEnglishWordData = async (inputWord) => {
  const normalizedWord = inputWord.trim().toLowerCase();

  if (!normalizedWord) {
    throw createHttpError(400, 'Word parameter is required.');
  }

  try {
    const existingWord = await findCachedEnglishWord(normalizedWord);

    if (existingWord) {
      return existingWord;
    }

    const wordData = await fetchEnglishDictionaryWord(normalizedWord);
    return await Word.create(wordData);
  } catch (error) {
    if (error.code === 11000) {
      const duplicatedWord = await findCachedEnglishWord(normalizedWord);

      if (duplicatedWord) {
        return duplicatedWord;
      }
    }

    if (error.statusCode) {
      throw error;
    }

    throw createHttpError(500, 'Failed to fetch word.');
  }
};

const translateWordPayload = async (wordDocument, originalWord, sourceLanguage) => {
  if (!sourceLanguage || sourceLanguage === 'en') {
    return buildWordResponse(wordDocument, {
      word: originalWord || wordDocument.word,
      language: 'en',
    });
  }

  const [meaningResult, synonyms, antonyms] = await Promise.all([
    translateText(wordDocument.meaning, sourceLanguage, 'en'),
    translateWordList(wordDocument.synonyms, sourceLanguage, 'en'),
    translateWordList(wordDocument.antonyms, sourceLanguage, 'en'),
  ]);

  return buildWordResponse(wordDocument, {
    word: originalWord,
    language: sourceLanguage,
    meaning: meaningResult.translatedText,
    synonyms,
    antonyms,
  });
};

const resolveWordData = async (inputWord) => {
  const rawInput = typeof inputWord === 'string' ? inputWord.trim() : '';

  if (!rawInput) {
    throw createHttpError(400, 'Word parameter is required.');
  }

  const translationToEnglish = await translateText(rawInput, 'en');
  const sourceLanguage = translationToEnglish.detectedLanguage || 'en';
  const englishLookupWord = translationToEnglish.translatedText.trim().toLowerCase();
  const englishWordDocument = await resolveEnglishWordData(englishLookupWord);

  return translateWordPayload(englishWordDocument, rawInput, sourceLanguage);
};

module.exports = {
  resolveWordData,
  sanitizeWordList,
};
