window.VocabAIExtension = window.VocabAIExtension || {};

(function initializeLogger() {
  const LOG_NAMESPACE = "VocabAI";

  function buildPayload(level, message, context = {}) {
    return {
      namespace: LOG_NAMESPACE,
      level,
      message,
      timestamp: new Date().toISOString(),
      ...context
    };
  }

  function write(level, message, context = {}) {
    const payload = buildPayload(level, message, context);
    const method = level === "error"
      ? "error"
      : level === "warn"
        ? "warn"
        : "log";

    console[method](`[${LOG_NAMESPACE}]`, payload);
  }

  window.VocabAIExtension.logger = {
    debug(message, context) {
      write("debug", message, context);
    },
    info(message, context) {
      write("info", message, context);
    },
    warn(message, context) {
      write("warn", message, context);
    },
    error(message, context) {
      write("error", message, context);
    }
  };
})();
