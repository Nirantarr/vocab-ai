import { API_ENDPOINTS } from "../utils/constants.js";

async function parseJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export async function fetchWordDetails(selectedText) {
  const response = await fetch(
    `${API_ENDPOINTS.wordLookup}?text=${encodeURIComponent(selectedText)}`
  );
  const data = await parseJson(response);

  if (!response.ok || !data?.word || !data?.meaning) {
    throw new Error(data?.message || "Failed to fetch meaning");
  }

  return {
    word: data.word,
    language: typeof data.language === "string" ? data.language : "",
    meaning: data.meaning,
    synonyms: Array.isArray(data.synonyms) ? data.synonyms : [],
    antonyms: Array.isArray(data.antonyms) ? data.antonyms : []
  };
}

export async function saveWord(word, token) {
  const response = await fetch(API_ENDPOINTS.saveWord, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ word })
  });
  const data = await parseJson(response);

  if (!response.ok) {
    throw new Error(data?.message || "Failed to save word");
  }

  return data;
}

export async function saveWordDetails(wordData, token) {
  for (const endpoint of API_ENDPOINTS.saveWord) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(wordData)
    });

    const data = await parseJson(response);

    if (response.ok) {
      return { success: true };
    }

    if (response.status === 404) {
      continue;
    }

    throw new Error(data?.message || "Failed to save word");
  }

  throw new Error("Save endpoint not found");
}

export async function translateText(text, targetLang) {
  const response = await fetch(API_ENDPOINTS.translate, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text,
      targetLang
    })
  });
  const data = await parseJson(response);

  if (!response.ok) {
    throw new Error(data?.message || "Translation failed");
  }

  const translatedText =
    data?.translatedText ||
    data?.translation ||
    data?.translated ||
    data?.text;

  if (typeof translatedText !== "string" || !translatedText.trim()) {
    throw new Error("Translation failed");
  }

  return {
    translatedText: translatedText.trim()
  };
}
