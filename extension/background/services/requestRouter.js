import { AUTH_ENDPOINTS, API_ENDPOINTS } from "../../utils/constants.js";
import { createApiClient } from "./apiClient.js";
import { createCache } from "./cache.js";
const WORD_CACHE_TTL_MS = 5 * 60 * 1000;
const TRANSLATE_CACHE_TTL_MS = 60 * 1000;
const REQUEST_THROTTLE_MS = 250;

function createThrottler() {
  const timestamps = new Map();

  async function throttle(key) {
    const now = Date.now();
    const lastTimestamp = timestamps.get(key) || 0;
    const waitMs = REQUEST_THROTTLE_MS - (now - lastTimestamp);

    if (waitMs > 0) {
      await new Promise((resolve) => globalThis.setTimeout(resolve, waitMs));
    }

    timestamps.set(key, Date.now());
  }

  return { throttle };
}

export function createRequestRouter({ logger }) {
  const apiClient = createApiClient({
    authEndpoints: AUTH_ENDPOINTS,
    logger
  });
  const wordCache = createCache({ ttlMs: WORD_CACHE_TTL_MS });
  const translationCache = createCache({ ttlMs: TRANSLATE_CACHE_TTL_MS });
  const throttler = createThrottler();

  function isRelationLoading(data) {
    return data?.relationFetchStatus === "loading";
  }

  async function fetchWordDetails(selectedText, options = {}) {
    const normalizedText = selectedText.trim().toLowerCase();
    const cacheKey = `word:${normalizedText}`;
    const cachedValue = wordCache.get(cacheKey);

    if (cachedValue) {
      if (isRelationLoading(cachedValue)) {
        logger?.debug("word_cache_bypass_loading", { cacheKey });
        wordCache.remove(cacheKey);
      } else {
        logger?.debug("word_cache_hit", { cacheKey });
        return cachedValue;
      }
    }

    await throttler.throttle(cacheKey);

    const data = await apiClient.request(
      `${API_ENDPOINTS.wordLookup}?text=${encodeURIComponent(selectedText)}`,
      {},
      { ...options, retryOnAuthFailure: false }
    );

    if (!data?.word || !data?.meaning) {
      throw new Error(data?.message || "Failed to fetch meaning");
    }

    const normalizedData = {
      word: data.word,
      language: typeof data.language === "string" ? data.language : "",
      meaning: data.meaning,
      synonyms: Array.isArray(data.synonyms) ? data.synonyms : [],
      antonyms: Array.isArray(data.antonyms) ? data.antonyms : [],
      relationFetchStatus:
        typeof data.relationFetchStatus === "string" ? data.relationFetchStatus : "complete"
    };

    if (isRelationLoading(normalizedData)) {
      logger?.debug("word_cache_skip_loading", { cacheKey });
      wordCache.remove(cacheKey);
      return normalizedData;
    }

    wordCache.set(cacheKey, normalizedData);
    return normalizedData;
  }

  async function fetchSession(options = {}) {
    return apiClient.request(AUTH_ENDPOINTS.session, {}, options);
  }

  async function saveWordDetails(wordData, options = {}) {
    for (const endpoint of API_ENDPOINTS.saveWord) {
      try {
        const response = await apiClient.request(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(wordData)
        }, options);

        wordCache.remove(`word:${String(wordData.word || "").trim().toLowerCase()}`);
        return response;
      } catch (error) {
        if (String(error?.message || "").includes("Session expired")) {
          throw error;
        }

        if (!String(endpoint).includes("/words/save")) {
          throw error;
        }
      }
    }

    throw new Error("Save endpoint not found");
  }

  async function translateText(text, targetLang, options = {}) {
    const cacheKey = `translate:${targetLang}:${text.trim().toLowerCase()}`;
    const cachedValue = translationCache.get(cacheKey);

    if (cachedValue) {
      logger?.debug("translation_cache_hit", { cacheKey });
      return cachedValue;
    }

    await throttler.throttle(cacheKey);

    const data = await apiClient.request(API_ENDPOINTS.translate, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text,
        targetLang
      })
    }, { ...options, retryOnAuthFailure: false });

    const translatedText =
      data?.translatedText ||
      data?.translation ||
      data?.translated ||
      data?.text;

    if (typeof translatedText !== "string" || !translatedText.trim()) {
      throw new Error("Translation failed");
    }

    const normalizedData = {
      translatedText: translatedText.trim()
    };

    translationCache.set(cacheKey, normalizedData);
    return normalizedData;
  }

  return {
    fetchSession,
    fetchWordDetails,
    saveWordDetails,
    translateText
  };
}
