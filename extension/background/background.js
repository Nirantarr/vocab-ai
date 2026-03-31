import { fetchWordDetails, saveWordDetails, translateText } from "./api.js";
import { getAuthToken, setAuthToken } from "./auth.js";

async function handleMessage(message) {
  if (message?.type === "FETCH_WORD_DETAILS") {
    const selectedText = typeof message.text === "string" ? message.text.trim() : "";

    if (!selectedText) {
      throw new Error("Invalid selection payload.");
    }

    const data = await fetchWordDetails(selectedText);
    return { success: true, data };
  }

  if (message?.type === "SAVE_WORD") {
    const payload = message?.data;
    const word = typeof payload?.word === "string" ? payload.word.trim() : "";

    if (!word) {
      throw new Error("Invalid save payload.");
    }

    const token = await getAuthToken();

    if (!token) {
      return { success: false, error: "NOT_AUTHENTICATED" };
    }

    try {
      await saveWordDetails(
        {
          word,
          meaning: payload.meaning,
          synonyms: Array.isArray(payload.synonyms) ? payload.synonyms : [],
          antonyms: Array.isArray(payload.antonyms) ? payload.antonyms : []
        },
        token
      );

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "FAILED"
      };
    }
  }

  if (message?.type === "GET_AUTH_STATUS") {
    const token = await getAuthToken();
    return {
      success: true,
      authenticated: Boolean(token)
    };
  }

  if (message?.type === "TRANSLATE_TEXT") {
    const text = typeof message.text === "string" ? message.text.trim() : "";
    const targetLang = typeof message.targetLang === "string" ? message.targetLang.trim() : "";

    if (!text || !targetLang) {
      throw new Error("Invalid translation payload.");
    }

    const data = await translateText(text, targetLang);
    return {
      success: true,
      data
    };
  }

  throw new Error("Unsupported message type.");
}

// Handles all extension-side async work so content scripts stay focused on UI.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      const response = await handleMessage(message);
      sendResponse(response);
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : "Unexpected extension error."
      });
    }
  })();

  return true;
});

// Accepts login success messages from the website and stores the extension auth token.
chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      if (message?.type !== "AUTH_SUCCESS" || typeof message.token !== "string" || !message.token.trim()) {
        sendResponse({ success: false, error: "INVALID_AUTH_PAYLOAD" });
        return;
      }

      await setAuthToken(message.token);
      sendResponse({ success: true });
    } catch (_error) {
      sendResponse({ success: false, error: "FAILED_TO_STORE_TOKEN" });
    }
  })();

  return true;
});
