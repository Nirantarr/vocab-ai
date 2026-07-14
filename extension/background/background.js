import "../config/config.js";
import { createRequestRouter } from "./services/requestRouter.js";

const logger = {
  debug(message, context = {}) {
    console.log("[VocabAI]", { level: "debug", message, ...context });
  },
  info(message, context = {}) {
    console.log("[VocabAI]", { level: "info", message, ...context });
  },
  warn(message, context = {}) {
    console.warn("[VocabAI]", { level: "warn", message, ...context });
  },
  error(message, context = {}) {
    console.error("[VocabAI]", { level: "error", message, ...context });
  }
};

const requestControllers = new Map();
let requestRouter = null;

function ensureRequestRouter() {
  if (requestRouter) {
    return requestRouter;
  }

  const extensionConfig = globalThis.VocabAIExtension?.config || globalThis.VocabAIExtensionConfig;

  if (!extensionConfig?.API_BASE_URL || !extensionConfig?.WEB_APP_URL) {
    throw new Error("Extension configuration failed to initialize.");
  }

  requestRouter = createRequestRouter({ logger });
  return requestRouter;
}

function getRequestKey(message, sender) {
  const senderScope = sender?.tab?.id ?? sender?.documentId ?? "global";

  if (message?.type === "FETCH_WORD_DETAILS") {
    return `${senderScope}:word`;
  }

  if (message?.type === "TRANSLATE_TEXT") {
    return `${senderScope}:translate`;
  }

  if (message?.type === "SAVE_WORD") {
    return `${senderScope}:save-word`;
  }

  if (message?.type === "GET_AUTH_STATUS") {
    return `${senderScope}:auth-status`;
  }

  return null;
}

function replaceRequestController(message, sender) {
  const key = getRequestKey(message, sender);

  if (!key) {
    return { key: null, controller: null };
  }

  const existingController = requestControllers.get(key);

  if (existingController) {
    existingController.abort();
  }

  const controller = new AbortController();
  requestControllers.set(key, controller);
  return { key, controller };
}

function cleanupRequestController(key, controller) {
  if (!key || !controller) {
    return;
  }

  if (requestControllers.get(key) === controller) {
    requestControllers.delete(key);
  }
}

async function handleMessage(message, sender) {
  const activeRequestRouter = ensureRequestRouter();
  const { key, controller } = replaceRequestController(message, sender);
  const options = controller ? { signal: controller.signal } : undefined;

  logger.debug("background_message_received", {
    requestId: message?.requestId || null,
    type: message?.type || "unknown"
  });

  try {
    if (message?.type === "FETCH_WORD_DETAILS") {
      const selectedText = typeof message.text === "string" ? message.text.trim() : "";

      if (!selectedText) {
        throw new Error("Invalid selection payload.");
      }

      const data = await activeRequestRouter.fetchWordDetails(selectedText, options);
      return { success: true, data };
    }

    if (message?.type === "SAVE_WORD") {
      const payload = message?.data;
      const word = typeof payload?.word === "string" ? payload.word.trim() : "";

      if (!word) {
        throw new Error("Invalid save payload.");
      }

      try {
        const data = await activeRequestRouter.saveWordDetails(
          {
            word,
            meaning: payload.meaning,
            synonyms: Array.isArray(payload.synonyms) ? payload.synonyms : [],
            antonyms: Array.isArray(payload.antonyms) ? payload.antonyms : []
          },
          options
        );

        return { success: true, ...(data || {}) };
      } catch (error) {
        if (String(error?.message || "").includes("Session expired")) {
          return { success: false, error: "NOT_AUTHENTICATED" };
        }

        return {
          success: false,
          error: error instanceof Error ? error.message : "FAILED"
        };
      }
    }

    if (message?.type === "GET_AUTH_STATUS") {
      try {
        const session = await activeRequestRouter.fetchSession(options);
        return {
          success: true,
          authenticated: Boolean(session?.authenticated),
          user: session?.user || null
        };
      } catch (_error) {
        return {
          success: true,
          authenticated: false,
          user: null
        };
      }
    }

    if (message?.type === "TRANSLATE_TEXT") {
      const text = typeof message.text === "string" ? message.text.trim() : "";
      const targetLang = typeof message.targetLang === "string" ? message.targetLang.trim() : "";

      if (!text || !targetLang) {
        throw new Error("Invalid translation payload.");
      }

      const data = await activeRequestRouter.translateText(text, targetLang, options);
      return {
        success: true,
        data
      };
    }

    throw new Error("Unsupported message type.");
  } finally {
    cleanupRequestController(key, controller);
  }
}

async function respondToMessage(message, sender, sendResponse) {
  try {
    const response = await handleMessage(message, sender);
    logger.info("background_response_sent", {
      requestId: message?.requestId || null,
      success: Boolean(response?.success),
      type: message?.type || "unknown"
    });
    sendResponse(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unexpected extension error.";

    logger.error("background_message_failed", {
      error: errorMessage,
      requestId: message?.requestId || null,
      type: message?.type || "unknown"
    });
    sendResponse({
      success: false,
      error: errorMessage
    });
  }
}

try {
  ensureRequestRouter();

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    void respondToMessage(message, sender, sendResponse);
    return true;
  });
} catch (error) {
  logger.error("background_initialization_failed", {
    error: error instanceof Error ? error.message : "Unknown background initialization error."
  });
}
