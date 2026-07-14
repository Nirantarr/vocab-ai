window.VocabAIExtension = window.VocabAIExtension || {};

(function initializeSanitize() {
  function sanitizeText(value, fallback = "") {
    if (typeof value !== "string") {
      return fallback;
    }

    return value
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
      .trim();
  }

  function sanitizeList(values = []) {
    if (!Array.isArray(values)) {
      return [];
    }

    return [...new Set(values
      .filter((value) => typeof value === "string")
      .map((value) => sanitizeText(value))
      .filter(Boolean))];
  }

  function sanitizeErrorMessage(error, fallback = "Something went wrong.") {
    if (error instanceof Error) {
      return sanitizeText(error.message, fallback) || fallback;
    }

    return fallback;
  }

  window.VocabAIExtension.sanitize = {
    sanitizeErrorMessage,
    sanitizeList,
    sanitizeText
  };
})();
