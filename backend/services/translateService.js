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

const translateText = async (text, targetLang) => {
  const normalizedText = typeof text === 'string' ? text.trim() : '';
  const normalizedTargetLang =
    typeof targetLang === 'string' ? targetLang.trim().toLowerCase() : '';

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
        sl: 'auto',
        tl: normalizedTargetLang,
        dt: 't',
        q: normalizedText,
      },
    });

    const translatedText = normalizeTranslatedText(response.data);

    if (!translatedText) {
      throw createHttpError(502, 'Translation failed.');
    }

    return {
      translatedText,
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    throw createHttpError(502, 'Translation failed.');
  }
};

module.exports = {
  translateText,
};
