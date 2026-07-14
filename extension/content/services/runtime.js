window.VocabAIExtension = window.VocabAIExtension || {};

(function initializeRuntimeService() {
  const logger = window.VocabAIExtension.logger;
  const { sanitizeErrorMessage } = window.VocabAIExtension.sanitize;
  let requestSequence = 0;

  function createAbortError() {
    return new DOMException("Operation aborted.", "AbortError");
  }

  function isExtensionContextAvailable() {
    return Boolean(globalThis.chrome?.runtime?.id);
  }

  function createRequestId(messageType) {
    requestSequence += 1;
    return `${messageType || "unknown"}-${Date.now()}-${requestSequence}`;
  }

  function sendMessage(message, signal) {
    return new Promise((resolve, reject) => {
      const runtimeMessage = {
        ...(message || {}),
        requestId: message?.requestId || createRequestId(message?.type)
      };

      if (!isExtensionContextAvailable()) {
        const error = new Error("Extension context invalidated.");
        logger?.error("runtime_request_failed", {
          error: sanitizeErrorMessage(error),
          requestId: runtimeMessage.requestId,
          type: runtimeMessage?.type || "unknown"
        });
        reject(error);
        return;
      }

      let settled = false;
      let abortHandler = null;

      const cleanup = () => {
        if (signal && abortHandler) {
          signal.removeEventListener("abort", abortHandler);
        }
      };

      abortHandler = () => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        logger?.warn("runtime_request_aborted", {
          requestId: runtimeMessage.requestId,
          type: runtimeMessage?.type || "unknown"
        });
        reject(createAbortError());
      };

      if (signal) {
        if (signal.aborted) {
          abortHandler();
          return;
        }

        signal.addEventListener("abort", abortHandler, { once: true });
      }

      try {
        logger?.info("runtime_request_sent", {
          requestId: runtimeMessage.requestId,
          type: runtimeMessage?.type || "unknown"
        });

        chrome.runtime.sendMessage(runtimeMessage, (response) => {
          if (settled) {
            return;
          }

          settled = true;
          cleanup();

          logger?.debug("runtime_response_received", {
            hasResponse: Boolean(response),
            requestId: runtimeMessage.requestId,
            type: runtimeMessage?.type || "unknown"
          });

          if (!isExtensionContextAvailable()) {
            const error = new Error("Extension context invalidated.");
            logger?.error("runtime_request_failed", {
              error: sanitizeErrorMessage(error),
              requestId: runtimeMessage.requestId,
              type: runtimeMessage?.type || "unknown"
            });
            reject(error);
            return;
          }

          if (chrome.runtime.lastError) {
            const error = new Error(chrome.runtime.lastError.message);
            logger?.error("runtime_request_failed", {
              error: sanitizeErrorMessage(error),
              requestId: runtimeMessage.requestId,
              type: runtimeMessage?.type || "unknown"
            });
            reject(error);
            return;
          }

          if (!response?.success) {
            const error = new Error(response?.error || "Request failed.");
            logger?.warn("runtime_response_failed", {
              error: sanitizeErrorMessage(error),
              requestId: runtimeMessage.requestId,
              type: runtimeMessage?.type || "unknown"
            });
            reject(error);
            return;
          }

          logger?.info("runtime_response_succeeded", {
            requestId: runtimeMessage.requestId,
            type: runtimeMessage?.type || "unknown"
          });
          resolve(response.data ?? response);
        });
      } catch (error) {
        logger?.error("runtime_request_failed", {
          error: sanitizeErrorMessage(error),
          requestId: runtimeMessage.requestId,
          type: runtimeMessage?.type || "unknown"
        });
        reject(error);
      }
    });
  }

  function getStoredTargetLanguage(defaultTargetLang, allowedLanguageResolver) {
    return new Promise((resolve, reject) => {
      if (!isExtensionContextAvailable()) {
        reject(new Error("Extension context invalidated."));
        return;
      }

      try {
        chrome.storage.local.get("targetLang", (result) => {
          if (!isExtensionContextAvailable()) {
            reject(new Error("Extension context invalidated."));
            return;
          }

          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          const storedValue = typeof result?.targetLang === "string" ? result.targetLang : "";
          const targetLang = allowedLanguageResolver(storedValue || defaultTargetLang);

          if (storedValue) {
            resolve(targetLang);
            return;
          }

          chrome.storage.local.set({ targetLang }, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            resolve(targetLang);
          });
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  function setStoredTargetLanguage(targetLang) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.set({ targetLang }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  window.VocabAIExtension.runtimeService = {
    getStoredTargetLanguage,
    isExtensionContextAvailable,
    sendMessage,
    setStoredTargetLanguage
  };
})();
