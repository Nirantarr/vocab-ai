const extensionConfig = globalThis.VocabAIExtension?.config || globalThis.VocabAIExtensionConfig;

if (!extensionConfig?.API_BASE_URL || !extensionConfig?.WEB_APP_URL) {
  throw new Error('Extension configuration was not initialized. Load config/config.js before other extension scripts.');
}

export const API_BASE_URL = `${extensionConfig.API_BASE_URL}/api`;
export const WEB_APP_URL = extensionConfig.WEB_APP_URL;
export const ENVIRONMENT = extensionConfig.ENVIRONMENT;
export const APP_NAME = extensionConfig.APP_NAME;
export const AUTH_BASE_URL = `${extensionConfig.API_BASE_URL}/api/auth`;

export const API_ENDPOINTS = {
  wordLookup: `${API_BASE_URL}/word`,
  saveWord: [`${API_BASE_URL}/words/save`, `${API_BASE_URL}/user/save-word`],
  translate: `${API_BASE_URL}/translate`
};

export const AUTH_ENDPOINTS = {
  session: `${AUTH_BASE_URL}/session`,
  refresh: `${AUTH_BASE_URL}/refresh`,
  logout: `${AUTH_BASE_URL}/logout`,
};

export const STORAGE_KEYS = {
  targetLang: "targetLang"
};

export const POPUP_ID = "vocabai-selection-popup";
export const POPUP_MARGIN = 12;
