import { API_ENDPOINTS, AUTH_ENDPOINTS } from "../utils/constants.js";

const DEFAULT_TIMEOUT_MS = 8000;

async function parseJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function createTimedAbortSignal(timeoutMs = DEFAULT_TIMEOUT_MS, externalSignal) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    controller.abort(new DOMException("Request timed out.", "AbortError"));
  }, timeoutMs);

  const abortFromExternal = () => {
    controller.abort(new DOMException("Request aborted.", "AbortError"));
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      abortFromExternal();
    } else {
      externalSignal.addEventListener("abort", abortFromExternal, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      globalThis.clearTimeout(timeoutId);

      if (externalSignal) {
        externalSignal.removeEventListener("abort", abortFromExternal);
      }
    },
  };
}

async function withTimeout(task, { signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const timedSignal = createTimedAbortSignal(timeoutMs, signal);

  try {
    return await task(timedSignal.signal);
  } finally {
    timedSignal.cleanup();
  }
}

async function refreshSession(options = {}) {
  const response = await fetch(AUTH_ENDPOINTS.refresh, {
    method: "POST",
    credentials: "include",
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error("Session expired. Please log in again.");
  }

  return parseJson(response);
}

async function request(url, options = {}, { retryOnAuthFailure = true, timeoutMs = DEFAULT_TIMEOUT_MS, signal } = {}) {
  return withTimeout(async (timedSignal) => {
    const response = await fetch(url, {
      credentials: "include",
      ...options,
      signal: timedSignal,
    });
    const data = await parseJson(response);

    if (response.status === 401 && retryOnAuthFailure) {
      await refreshSession({ signal: timedSignal });
      return request(url, options, {
        retryOnAuthFailure: false,
        timeoutMs,
        signal: timedSignal,
      });
    }

    if (!response.ok) {
      throw new Error(data?.message || "Request failed");
    }

    return data;
  }, { signal, timeoutMs });
}

export function fetchSession(options = {}) {
  return request(AUTH_ENDPOINTS.session, {}, options);
}

export async function fetchWordDetails(selectedText, options = {}) {
  const data = await request(
    `${API_ENDPOINTS.wordLookup}?text=${encodeURIComponent(selectedText)}`,
    {},
    { ...options, retryOnAuthFailure: false }
  );

  if (!data?.word || !data?.meaning) {
    throw new Error(data?.message || "Failed to fetch meaning");
  }

  return {
    word: data.word,
    language: typeof data.language === "string" ? data.language : "",
    meaning: data.meaning,
    synonyms: Array.isArray(data.synonyms) ? data.synonyms : [],
    antonyms: Array.isArray(data.antonyms) ? data.antonyms : [],
    relationFetchStatus:
      typeof data.relationFetchStatus === "string" ? data.relationFetchStatus : "complete",
  };
}

export async function saveWordDetails(wordData, options = {}) {
  for (const endpoint of API_ENDPOINTS.saveWord) {
    try {
      const data = await request(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(wordData),
      }, options);

      return data;
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

export async function translateText(text, targetLang, options = {}) {
  const data = await request(API_ENDPOINTS.translate, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      targetLang,
    }),
  }, { ...options, retryOnAuthFailure: false });

  const translatedText =
    data?.translatedText ||
    data?.translation ||
    data?.translated ||
    data?.text;

  if (typeof translatedText !== "string" || !translatedText.trim()) {
    throw new Error("Translation failed");
  }

  return {
    translatedText: translatedText.trim(),
  };
}

export function logoutSession(options = {}) {
  return request(AUTH_ENDPOINTS.logout, {
    method: "POST",
  }, { ...options, retryOnAuthFailure: false });
}
