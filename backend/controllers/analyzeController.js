const { resolveWordData, sanitizeWordList } = require('./wordController');
const { extractCandidateWords, extractKeywords } = require('../utils/keywordExtractor');

const normalizeSelectedText = (selectedText) =>
  typeof selectedText === 'string' ? selectedText.trim() : '';

const isSingleWord = (selectedText) => /^[a-zA-Z][a-zA-Z'-]*$/.test(selectedText);

const buildWordSelection = async (selectedText) => {
  try {
    const wordData = await resolveWordData(selectedText);

    return {
      text: selectedText,
      type: 'word',
      meaning: wordData.meaning,
      synonyms: wordData.synonyms,
      antonyms: wordData.antonyms,
    };
  } catch (error) {
    if (error.statusCode === 404) {
      return {
        text: selectedText,
        type: 'word',
        meaning: 'Word not found in dictionary.',
        synonyms: [],
        antonyms: [],
      };
    }

    return {
      text: selectedText,
      type: 'word',
      meaning: 'Word details are unavailable right now.',
      synonyms: [],
      antonyms: [],
    };
  }
};

const buildPhraseMeaning = (selectedText, relatedWords) => {
  if (relatedWords.length === 0) {
    return `A simplified explanation for "${selectedText}" is not available right now.`;
  }

  const explanations = relatedWords
    .map((wordData) => `${wordData.word}: ${wordData.meaning}`)
    .join(' ');

  return `This phrase is related to ${explanations}`;
};

const buildPhraseSelection = async (selectedText) => {
  const candidateWords = [...new Set(extractCandidateWords(selectedText))].slice(0, 3);
  const resolvedWords = [];

  for (const word of candidateWords) {
    try {
      const wordData = await resolveWordData(word);
      resolvedWords.push(wordData);
    } catch (error) {
      continue;
    }
  }

  return {
    text: selectedText,
    type: 'phrase',
    meaning: buildPhraseMeaning(selectedText, resolvedWords),
    synonyms: sanitizeWordList(resolvedWords.flatMap((wordData) => wordData.synonyms)),
    antonyms: sanitizeWordList(resolvedWords.flatMap((wordData) => wordData.antonyms)),
  };
};

const resolveSelectedEntry = async (selectedText) => {
  const normalizedSelectedText = normalizeSelectedText(selectedText);

  if (!normalizedSelectedText) {
    return null;
  }

  if (isSingleWord(normalizedSelectedText)) {
    return buildWordSelection(normalizedSelectedText.toLowerCase());
  }

  return buildPhraseSelection(normalizedSelectedText);
};

const getSelectedEntries = (selectedTexts, selectedText) => {
  if (Array.isArray(selectedTexts)) {
    return selectedTexts;
  }

  if (typeof selectedText === 'string') {
    return [selectedText];
  }

  return [];
};

const analyzeText = async (req, res) => {
  try {
    const { text, selectedText, selectedTexts } = req.body;

    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ message: 'Text is required.' });
    }

    const keywords = extractKeywords(text);
    const selectedEntries = getSelectedEntries(selectedTexts, selectedText);
    const selectedResults = await Promise.all(
      selectedEntries.map((entry) => resolveSelectedEntry(entry))
    );
    const selected = selectedResults.filter(Boolean);

    return res.status(200).json({
      keywords,
      selected,
    });
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json({ message: error.message || 'Failed to analyze text.' });
  }
};

module.exports = {
  analyzeText,
};
