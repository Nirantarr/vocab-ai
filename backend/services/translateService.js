const axios = require('axios');

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeTranslatedText = (data) => {
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    return '';
  }

  return data[0]
    .map((item) => (Array.isArray(item) ? item[0] : ''))
    .filter((value) => typeof value === 'string' && value.trim())
    .join('');
};

const getDetectedLanguage = (data) => {
  if (typeof data?.[2] === 'string' && data[2].trim()) {
    return data[2].trim().toLowerCase();
  }

  return '';
};

const requestTranslation = async (text, targetLang, sourceLang = 'auto') => {
  const normalizedText = typeof text === 'string' ? text.trim() : '';
  const normalizedTargetLang =
    typeof targetLang === 'string' ? targetLang.trim().toLowerCase() : '';
  const normalizedSourceLang =
    typeof sourceLang === 'string' && sourceLang.trim() ? sourceLang.trim().toLowerCase() : 'auto';

  if (!normalizedText) {
    throw createHttpError(400, 'Text is required.');
  }

  if (!normalizedTargetLang) {
    throw createHttpError(400, 'Target language is required.');
  }

  try {
    const response = await axios.get('https://translate.googleapis.com/translate_a/single', {
      params: {
        client: 'gtx',
        sl: normalizedSourceLang,
        tl: normalizedTargetLang,
        dt: 't',
        q: normalizedText,
      },
    });

    return response.data;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    throw createHttpError(502, 'Translation failed.');
  }
};

const translateText = async (text, targetLang, sourceLang = 'auto') => {
  const translationData = await requestTranslation(text, targetLang, sourceLang);
  const translatedText = normalizeTranslatedText(translationData);

  if (!translatedText) {
    throw createHttpError(502, 'Translation failed.');
  }

  return {
    translatedText,
    detectedLanguage: getDetectedLanguage(translationData),
  };
};

const translateWordList = async (values, targetLang, sourceLang = 'auto') => {
  if (!Array.isArray(values) || values.length === 0) {
    return [];
  }

  const translatedValues = await Promise.all(
    values
      .filter((value) => typeof value === 'string' && value.trim())
      .map(async (value) => {
        const { translatedText } = await translateText(value, targetLang, sourceLang);
        return translatedText;
      })
  );

  return [...new Set(translatedValues.filter((value) => typeof value === 'string' && value.trim()))];
};

module.exports = {
  createHttpError,
  translateText,
  translateWordList,
};
