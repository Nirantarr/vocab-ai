window.VocabAIExtension = window.VocabAIExtension || {};

(function initializeContentScript() {
  const {
    DEFAULT_TARGET_LANG,
    LANGUAGE_OPTIONS,
    LONG_TEXT_THRESHOLD,
    getErrorMarkup,
    getLoadingMarkup,
    getResultMarkup
  } = window.VocabAIExtension.ui;
  const {
    initializePopupHandlers,
    renderPopup,
    removePopup,
    consumeSelectionSuppression,
    currentPopupContains
  } = window.VocabAIExtension.popup;
  const { initializeSelectionListener } = window.VocabAIExtension.selection;
  let popupState = null;

  function getAllowedLanguage(value) {
    return LANGUAGE_OPTIONS.some((option) => option.value === value)
      ? value
      : DEFAULT_TARGET_LANG;
  }

  function isExtensionContextAvailable() {
    return Boolean(globalThis.chrome?.runtime?.id);
  }

  function hasActivePopupState() {
    return Boolean(popupState?.word && popupState?.rect);
  }

  function isSingleWordSelection(value) {
    return /^[a-zA-Z][a-zA-Z'-]*$/.test(value);
  }

  function renderCurrentPopup() {
    if (!hasActivePopupState()) {
      return;
    }

    renderPopup(
      getResultMarkup({
        selectedText: popupState.selectedText,
        isExpanded: popupState.isExpanded,
        word: popupState.word,
        meaning: popupState.meaning,
        synonyms: popupState.synonyms,
        antonyms: popupState.antonyms,
        targetLang: popupState.targetLang,
        translationState: popupState.translationState,
        translationMessage: popupState.translationMessage,
        translatedText: popupState.translatedText,
        saveState: popupState.saveState,
        saveMessage: popupState.saveMessage,
        isAuthenticated: popupState.isAuthenticated,
        allowSave: popupState.allowSave,
        showTranslate: popupState.showTranslate
      }),
      popupState.rect,
      {
        wide: popupState.isLongSelection
      }
    );

    bindPreviewToggle();
    bindTranslateControls();
    bindSaveButton();
  }

  function bindPreviewToggle() {
    const toggleButton = document.querySelector(".vocabai-popup__toggle-preview");

    if (!toggleButton || !hasActivePopupState()) {
      return;
    }

    toggleButton.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();

      popupState = {
        ...popupState,
        isExpanded: !popupState.isExpanded
      };
      renderCurrentPopup();
    };
  }

  function fetchWordDetails(selectedText) {
    return new Promise((resolve, reject) => {
      if (!isExtensionContextAvailable()) {
        reject(new Error("Extension context invalidated."));
        return;
      }

      try {
        chrome.runtime.sendMessage(
          {
            type: "FETCH_WORD_DETAILS",
            text: selectedText
          },
          (response) => {
            if (!isExtensionContextAvailable()) {
              reject(new Error("Extension context invalidated."));
              return;
            }

            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            if (!response?.success) {
              reject(new Error(response?.error || "Failed to fetch meaning"));
              return;
            }

            resolve(response.data);
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  function saveWordDetails(wordData) {
    return new Promise((resolve, reject) => {
      if (!isExtensionContextAvailable()) {
        reject(new Error("Extension context invalidated."));
        return;
      }

      try {
        chrome.runtime.sendMessage(
          {
            type: "SAVE_WORD",
            data: wordData
          },
          (response) => {
            if (!isExtensionContextAvailable()) {
              reject(new Error("Extension context invalidated."));
              return;
            }

            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            resolve(response);
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  function requestTranslation(text, targetLang) {
    return new Promise((resolve, reject) => {
      if (!isExtensionContextAvailable()) {
        reject(new Error("Extension context invalidated."));
        return;
      }

      try {
        chrome.runtime.sendMessage(
          {
            type: "TRANSLATE_TEXT",
            text,
            targetLang
          },
          (response) => {
            if (!isExtensionContextAvailable()) {
              reject(new Error("Extension context invalidated."));
              return;
            }

            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            if (!response?.success) {
              reject(new Error(response?.error || "Translation failed"));
              return;
            }

            resolve(response.data);
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  function getAuthStatus() {
    return new Promise((resolve, reject) => {
      if (!isExtensionContextAvailable()) {
        reject(new Error("Extension context invalidated."));
        return;
      }

      try {
        chrome.runtime.sendMessage(
          {
            type: "GET_AUTH_STATUS"
          },
          (response) => {
            if (!isExtensionContextAvailable()) {
              reject(new Error("Extension context invalidated."));
              return;
            }

            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            resolve(Boolean(response?.authenticated));
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  function getStoredTargetLanguage() {
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
          const targetLang = getAllowedLanguage(storedValue);

          if (storedValue) {
            resolve(targetLang);
            return;
          }

          chrome.storage.local.set({ targetLang }, () => {
            if (!isExtensionContextAvailable()) {
              reject(new Error("Extension context invalidated."));
              return;
            }

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
      if (!isExtensionContextAvailable()) {
        reject(new Error("Extension context invalidated."));
        return;
      }

      try {
        chrome.storage.local.set({ targetLang }, () => {
          if (!isExtensionContextAvailable()) {
            reject(new Error("Extension context invalidated."));
            return;
          }

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

  function bindSaveButton() {
    const saveButton = document.querySelector(".vocabai-popup__save");

    if (!saveButton || !hasActivePopupState() || !popupState.allowSave) {
      return;
    }

    saveButton.onclick = async (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!popupState.isAuthenticated) {
        window.open("http://localhost:5173/login", "_blank", "noopener,noreferrer");
        return;
      }

      popupState = {
        ...popupState,
        saveState: "saving",
        saveMessage: ""
      };
      renderCurrentPopup();

      try {
        const response = await saveWordDetails({
          word: popupState.word,
          meaning: popupState.meaning,
          synonyms: popupState.synonyms,
          antonyms: popupState.antonyms
        });

        if (response?.success) {
          popupState = {
            ...popupState,
            saveState: "saved",
            saveMessage: "Saved successfully \u2705"
          };
          renderCurrentPopup();
          return;
        }

        if (response?.error === "NOT_AUTHENTICATED") {
          popupState = {
            ...popupState,
            isAuthenticated: false,
            saveState: "error",
            saveMessage: "Please login first"
          };
          renderCurrentPopup();
          return;
        }

        popupState = {
          ...popupState,
          saveState: "error",
          saveMessage: response?.error || "Failed to save"
        };
        renderCurrentPopup();
      } catch (_error) {
        popupState = {
          ...popupState,
          saveState: "error",
          saveMessage: "Failed to save"
        };
        renderCurrentPopup();
      }
    };
  }

  function bindTranslateControls() {
    const languageSelect = document.querySelector(".vocabai-popup__select");
    const translateButton = document.querySelector(".vocabai-popup__translate-button");

    if (!languageSelect || !translateButton || !hasActivePopupState()) {
      return;
    }

    languageSelect.value = getAllowedLanguage(popupState.targetLang);

    languageSelect.onchange = async (event) => {
      const nextLang = getAllowedLanguage(event.target.value);

      popupState = {
        ...popupState,
        targetLang: nextLang,
        translatedText: "",
        translationState: "idle",
        translationMessage: ""
      };
      renderCurrentPopup();

      try {
        await setStoredTargetLanguage(nextLang);
      } catch (_error) {
        popupState = {
          ...popupState,
          translationState: "error",
          translationMessage: "Translation failed"
        };
        renderCurrentPopup();
      }
    };

    translateButton.onclick = async (event) => {
      event.preventDefault();
      event.stopPropagation();

      popupState = {
        ...popupState,
        translationState: "loading",
        translationMessage: "",
        translatedText: ""
      };
      renderCurrentPopup();

      try {
        const response = await requestTranslation(popupState.selectedText, popupState.targetLang);

        popupState = {
          ...popupState,
          translationState: "success",
          translationMessage: "",
          translatedText: response?.translatedText || ""
        };
        renderCurrentPopup();
      } catch (_error) {
        popupState = {
          ...popupState,
          translationState: "error",
          translationMessage: "Translation failed",
          translatedText: ""
        };
        renderCurrentPopup();
      }
    };
  }

  async function handleSelection(selection) {
    if (!selection) {
      return;
    }

    const { text, rect } = selection;
    renderPopup(getLoadingMarkup(text), rect, {
      wide: text.length > LONG_TEXT_THRESHOLD
    });

    try {
      const [data, authenticated, targetLang] = await Promise.all([
        fetchWordDetails(text),
        getAuthStatus(),
        getStoredTargetLanguage()
      ]);

      popupState = {
        selectedText: text,
        rect,
        word: data.word,
        meaning: data.meaning,
        synonyms: Array.isArray(data.synonyms) ? data.synonyms : [],
        antonyms: Array.isArray(data.antonyms) ? data.antonyms : [],
        targetLang,
        translationState: "idle",
        translationMessage: "",
        translatedText: "",
        saveState: "idle",
        saveMessage: "",
        isAuthenticated: authenticated,
        allowSave: isSingleWordSelection(text),
        showTranslate: true,
        isLongSelection: text.length > LONG_TEXT_THRESHOLD,
        isExpanded: false
      };
      renderCurrentPopup();
    } catch (_error) {
      const targetLang = await getStoredTargetLanguage().catch(() => DEFAULT_TARGET_LANG);
      const authenticated = await getAuthStatus().catch(() => false);

      popupState = {
        selectedText: text,
        rect,
        word: text,
        meaning: "Meaning is unavailable for this selection.",
        synonyms: [],
        antonyms: [],
        targetLang,
        translationState: "idle",
        translationMessage: "",
        translatedText: "",
        saveState: "idle",
        saveMessage: "",
        isAuthenticated: authenticated,
        allowSave: false,
        showTranslate: true,
        isLongSelection: text.length > LONG_TEXT_THRESHOLD,
        isExpanded: false
      };

      renderCurrentPopup();
    }
  }

  initializePopupHandlers();
  initializeSelectionListener({
    onSelection: handleSelection,
    shouldIgnoreSelection: (event) =>
      consumeSelectionSuppression() || currentPopupContains(event?.target)
  });
})();
