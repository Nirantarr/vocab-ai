const axios = require('axios');
const Word = require('../models/wordModel');
const { createHttpError, translateText, translateWordList } = require('./translateService');

const DATAMUSE_RESULT_LIMIT = 5;
const datamuseEnrichmentInFlight = new Map();

const buildWordResponse = (wordDocument, overrides = {}) => ({
  word: wordDocument.word,
  language: 'en',
  meaning: wordDocument.meaning,
  synonyms: wordDocument.synonyms,
  antonyms: wordDocument.antonyms,
  relationFetchStatus: wordDocument.relationFetchStatus || 'complete',
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

const pickTopWordList = (entries = [], limit = DATAMUSE_RESULT_LIMIT) =>
  sanitizeWordList(
    entries
      .map((entry) => entry?.word)
      .filter(Boolean)
      .slice(0, limit)
  ).slice(0, limit);

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

const fetchDatamuseWordData = async (normalizedWord) => {
  try {
    const [synonymResponse, antonymResponse] = await Promise.all([
      axios.get('https://api.datamuse.com/words', {
        params: {
          rel_syn: normalizedWord,
          max: DATAMUSE_RESULT_LIMIT,
        },
      }),
      axios.get('https://api.datamuse.com/words', {
        params: {
          rel_ant: normalizedWord,
          max: DATAMUSE_RESULT_LIMIT,
        },
      }),
    ]);

    return {
      synonyms: pickTopWordList(synonymResponse.data),
      antonyms: pickTopWordList(antonymResponse.data),
    };
  } catch (_error) {
    return {
      synonyms: [],
      antonyms: [],
    };
  }
};

function isIncomplete(data) {
  if (!data) {
    return true;
  }

  const missingMeaning = typeof data.meaning !== 'string' || !data.meaning.trim();
  const missingSynonyms = !Array.isArray(data.synonyms) || data.synonyms.length === 0;
  const missingAntonyms = !Array.isArray(data.antonyms) || data.antonyms.length === 0;

  return missingMeaning || missingSynonyms || missingAntonyms;
}

function mergeResults(api1 = {}, api2 = {}) {
  return {
    word: api1.word || api2.word || '',
    meaning: api1.meaning || api2.meaning || '',
    synonyms: sanitizeWordList([...(api1.synonyms || []), ...(api2.synonyms || [])]).slice(
      0,
      DATAMUSE_RESULT_LIMIT
    ),
    antonyms: sanitizeWordList([...(api1.antonyms || []), ...(api2.antonyms || [])]).slice(
      0,
      DATAMUSE_RESULT_LIMIT
    ),
  };
}

async function fetchWordData(word) {
  const normalizedWord = typeof word === 'string' ? word.trim().toLowerCase() : '';

  if (!normalizedWord) {
    throw createHttpError(400, 'Word parameter is required.');
  }

  const primaryResult = await fetchEnglishDictionaryWord(normalizedWord);

  if (!isIncomplete(primaryResult)) {
    return primaryResult;
  }

  const fallbackResult = await fetchDatamuseWordData(normalizedWord);
  return mergeResults(primaryResult, fallbackResult);
}

const findCachedEnglishWord = async (normalizedWord) => Word.findOne({ word: normalizedWord });

const getRelationFetchStatus = (wordLike) => {
  if (typeof wordLike?.relationFetchStatus === 'string' && wordLike.relationFetchStatus) {
    return wordLike.relationFetchStatus;
  }

  return 'complete';
};

const shouldEnrichRelations = (wordLike) =>
  Boolean(
    wordLike?.word &&
    getRelationFetchStatus(wordLike) !== 'complete' &&
    isIncomplete(wordLike)
  );

const enrichIncompleteWordInBackground = (wordDocument) => {
  if (!shouldEnrichRelations(wordDocument)) {
    return;
  }

  if (datamuseEnrichmentInFlight.has(wordDocument.word)) {
    return;
  }

  const enrichmentPromise = (async () => {
    try {
      await Word.updateOne(
        { _id: wordDocument._id },
        {
          $set: {
            relationFetchStatus: 'loading',
          },
        }
      );

      const fallbackData = await fetchDatamuseWordData(wordDocument.word);
      const mergedData = mergeResults(wordDocument.toObject(), fallbackData);

      await Word.updateOne(
        { _id: wordDocument._id },
        {
          $set: {
            synonyms: mergedData.synonyms,
            antonyms: mergedData.antonyms,
            relationFetchStatus: 'complete',
          },
        }
      );
    } catch (_error) {
      await Word.updateOne(
        { _id: wordDocument._id },
        {
          $set: {
            relationFetchStatus: 'complete',
          },
        }
      );
    }
  })();

  datamuseEnrichmentInFlight.set(wordDocument.word, enrichmentPromise);
  wordDocument.relationFetchStatus = 'loading';
  enrichmentPromise.finally(() => {
    datamuseEnrichmentInFlight.delete(wordDocument.word);
  });
};

const resolveEnglishWordData = async (inputWord) => {
  const normalizedWord = inputWord.trim().toLowerCase();

  if (!normalizedWord) {
    throw createHttpError(400, 'Word parameter is required.');
  }

  try {
    const existingWord = await findCachedEnglishWord(normalizedWord);

    if (existingWord) {
      existingWord.relationFetchStatus = getRelationFetchStatus(existingWord);
      enrichIncompleteWordInBackground(existingWord);
      return existingWord;
    }

    const primaryWordData = await fetchEnglishDictionaryWord(normalizedWord);
    const createdWord = await Word.create({
      ...primaryWordData,
      relationFetchStatus: isIncomplete(primaryWordData) ? 'loading' : 'complete',
    });
    enrichIncompleteWordInBackground(createdWord);
    return createdWord;
  } catch (error) {
    if (error.code === 11000) {
      const duplicatedWord = await findCachedEnglishWord(normalizedWord);

      if (duplicatedWord) {
        duplicatedWord.relationFetchStatus = getRelationFetchStatus(duplicatedWord);
        enrichIncompleteWordInBackground(duplicatedWord);
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
  fetchWordData,
  isIncomplete,
  mergeResults,
  resolveWordData,
  sanitizeWordList,
};
