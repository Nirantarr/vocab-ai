const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'for',
  'from',
  'has',
  'have',
  'he',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'or',
  'that',
  'the',
  'their',
  'there',
  'they',
  'this',
  'to',
  'was',
  'were',
  'will',
  'with',
  'you',
  'your',
]);

const COMMON_WORDS = new Set([
  'about',
  'after',
  'again',
  'also',
  'because',
  'being',
  'does',
  'done',
  'each',
  'even',
  'find',
  'good',
  'into',
  'just',
  'know',
  'like',
  'look',
  'made',
  'make',
  'many',
  'more',
  'most',
  'only',
  'other',
  'over',
  'same',
  'some',
  'than',
  'them',
  'then',
  'they',
  'thing',
  'time',
  'used',
  'uses',
  'using',
  'very',
  'want',
  'well',
  'what',
  'when',
  'where',
  'which',
  'work',
  'would',
  'your',
  'good',
  'make',
  'use',
  'does',
  'doing',
]);

const normalizeText = (text) => text.toLowerCase().replace(/[^\w\s'-]/g, ' ');

const extractCandidateWords = (text) =>
  normalizeText(text)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(
      (word) =>
        word.length >= 4 &&
        !STOPWORDS.has(word) &&
        !COMMON_WORDS.has(word) &&
        /[a-z]/.test(word)
    );

const countWordFrequency = (words) =>
  words.reduce((frequencyMap, word) => {
    frequencyMap[word] = (frequencyMap[word] || 0) + 1;
    return frequencyMap;
  }, {});

const extractKeywords = (text, limit = 5) => {
  const words = extractCandidateWords(text);

  if (words.length === 0) {
    return [];
  }

  const frequencyMap = countWordFrequency(words);

  return Object.keys(frequencyMap)
    .sort((firstWord, secondWord) => {
      if (secondWord.length !== firstWord.length) {
        return secondWord.length - firstWord.length;
      }

      if (frequencyMap[firstWord] !== frequencyMap[secondWord]) {
        return frequencyMap[firstWord] - frequencyMap[secondWord];
      }

      return firstWord.localeCompare(secondWord);
    })
    .slice(0, limit);
};

module.exports = {
  extractCandidateWords,
  extractKeywords,
};
