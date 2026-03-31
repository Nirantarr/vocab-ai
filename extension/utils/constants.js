export const API_BASE_URL = "http://localhost:5000/api";

export const API_ENDPOINTS = {
  wordLookup: `${API_BASE_URL}/word`,
  saveWord: [`${API_BASE_URL}/words/save`, `${API_BASE_URL}/user/save-word`],
  translate: `${API_BASE_URL}/translate`
};

export const STORAGE_KEYS = {
  authToken: "authToken",
  targetLang: "targetLang"
};

export const POPUP_ID = "vocabai-selection-popup";
export const POPUP_MARGIN = 12;
