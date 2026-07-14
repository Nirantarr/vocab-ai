(function initializeExtensionConfig() {
  const config = Object.freeze({
    API_BASE_URL: "http://localhost:5000",
    WEB_APP_URL: "http://localhost:5173",
    ENVIRONMENT: "development",
    APP_NAME: "VocabAI Selection Helper"
  });

  globalThis.VocabAIExtensionConfig = config;
  globalThis.VocabAIExtension = globalThis.VocabAIExtension || {};
  globalThis.VocabAIExtension.config = config;
})();
