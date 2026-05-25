import { fetchSession, fetchWordDetails, saveWordDetails, translateText } from "./api.js";

const requestControllers = new Map();

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
  const { key, controller } = replaceRequestController(message, sender);
  const options = controller ? { signal: controller.signal } : undefined;

  try {
    if (message?.type === "FETCH_WORD_DETAILS") {
      const selectedText = typeof message.text === "string" ? message.text.trim() : "";

      if (!selectedText) {
        throw new Error("Invalid selection payload.");
      }

      const data = await fetchWordDetails(selectedText, options);
      return { success: true, data };
    }

    if (message?.type === "SAVE_WORD") {
      const payload = message?.data;
      const word = typeof payload?.word === "string" ? payload.word.trim() : "";

      if (!word) {
        throw new Error("Invalid save payload.");
      }

      try {
        const data = await saveWordDetails(
          {
            word,
            meaning: payload.meaning,
            synonyms: Array.isArray(payload.synonyms) ? payload.synonyms : [],
            antonyms: Array.isArray(payload.antonyms) ? payload.antonyms : [],
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
          error: error instanceof Error ? error.message : "FAILED",
        };
      }
    }

    if (message?.type === "GET_AUTH_STATUS") {
      try {
        const session = await fetchSession(options);
        return {
          success: true,
          authenticated: Boolean(session?.authenticated),
          user: session?.user || null,
        };
      } catch (_error) {
        return {
          success: true,
          authenticated: false,
          user: null,
        };
      }
    }

    if (message?.type === "TRANSLATE_TEXT") {
      const text = typeof message.text === "string" ? message.text.trim() : "";
      const targetLang = typeof message.targetLang === "string" ? message.targetLang.trim() : "";

      if (!text || !targetLang) {
        throw new Error("Invalid translation payload.");
      }

      const data = await translateText(text, targetLang, options);
      return {
        success: true,
        data,
      };
    }

    throw new Error("Unsupported message type.");
  } finally {
    cleanupRequestController(key, controller);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      const response = await handleMessage(message, sender);
      sendResponse(response);
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : "Unexpected extension error.",
      });
    }
  })();

  return true;
});
