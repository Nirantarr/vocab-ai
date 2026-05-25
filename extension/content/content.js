window.VocabAIExtension = window.VocabAIExtension || {};

(function initializeContentScript() {
  const {
    DEFAULT_TARGET_LANG,
    LANGUAGE_OPTIONS,
    LONG_TEXT_THRESHOLD,
    normalizeRelationStatus
  } = window.VocabAIExtension.ui;
  const {
    initializePopupHandlers,
    getPopupRefs,
    removePopup,
    setCloseHandler,
    showPopup,
    consumeSelectionSuppression,
    currentPopupContains,
    suppressSelectionOnce,
    setHidden,
    setText
  } = window.VocabAIExtension.popup;
  const { initializeSelectionListener } = window.VocabAIExtension.selection;

  const RELATION_POLL_INTERVAL_MS = 1200;
  const RELATION_POLL_MAX_ATTEMPTS = 6;

  let popupState = null;
  let popupRefs = null;
  let listenersBound = false;
  let relationPollTimeoutId = null;
  let selectionRequestController = null;
  let translationRequestController = null;
  const copyResetTimers = {};

  function ensurePopupRefs() {
    if (!popupRefs || !popupRefs.popup || !document.body.contains(popupRefs.popup)) {
      popupRefs = getPopupRefs();
    }

    return popupRefs;
  }

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

  function isPopupInteraction(event) {
    if (!event) {
      return false;
    }

    if (currentPopupContains(event.target)) {
      return true;
    }

    if (typeof event.composedPath === "function") {
      return event.composedPath().some((node) => {
        if (!node || typeof node !== "object") {
          return false;
        }

        if (node.id === "vocabai-selection-popup") {
          return true;
        }

        if (typeof node.classList?.contains === "function") {
          return node.classList.contains("vocabai-popup");
        }

        return false;
      });
    }

    return false;
  }

  function isSingleWordSelection(value) {
    return /^[a-zA-Z][a-zA-Z'-]*$/.test(value);
  }

  function buildDefaultPopupRect() {
    const viewportWidth = document.documentElement.clientWidth;
    const defaultMargin = 12;

    return {
      left: Math.max(defaultMargin, Math.round((viewportWidth - 320) / 2)),
      top: 24,
      bottom: 64
    };
  }

  function normalizeList(values) {
    return Array.isArray(values)
      ? values.filter((value) => typeof value === "string" && value.trim())
      : [];
  }

  function formatList(values) {
    const normalizedValues = normalizeList(values);
    return normalizedValues.length ? normalizedValues.join(", ") : "No data available";
  }

  function setCopyButtonState(button, copyType, value, feedback = "", hidden = false) {
    if (!button) {
      return;
    }

    const normalizedValue = Array.isArray(value) ? formatList(value) : String(value || "").trim();
    button.dataset.copyType = copyType;
    button.dataset.copyValue = normalizedValue || "No data available";
    button.textContent = feedback || "Copy";
    button.hidden = Boolean(hidden);
  }

  function updateTextBlock(element, value, { loading = false, error = false } = {}) {
    if (!element) {
      return;
    }

    element.textContent = value;
    element.classList.toggle("vocabai-popup__value--loading", Boolean(loading));
    element.classList.toggle("vocabai-popup__status--error", Boolean(error));
  }

  function updateStatusBlock(element, message, { hidden = false, error = false } = {}) {
    if (!element) {
      return;
    }

    element.hidden = Boolean(hidden || !message);
    element.textContent = message || "";
    element.classList.toggle("vocabai-popup__status--error", Boolean(error));
  }

  function getSelectionPreviewText() {
    if (!popupState?.selectedText) {
      return "";
    }

    if (!shouldShowSelectionPreview()) {
      return popupState.selectedText;
    }

    if (
      popupState.selectedText.length > 120 &&
      !popupState.isExpanded
    ) {
      return `${popupState.selectedText.slice(0, 120).trimEnd()}...`;
    }

    return popupState.selectedText;
  }

  function shouldShowSelectionPreview() {
    if (!popupState?.selectedText?.trim()) {
      return false;
    }

    if (popupState.selectedText.length > LONG_TEXT_THRESHOLD) {
      return true;
    }

    if (!/^\S+$/.test(popupState.selectedText.trim())) {
      return true;
    }

    return popupState.selectedText.trim() !== String(popupState.word || "").trim();
  }

  function getPopupTitle() {
    const text = shouldShowSelectionPreview()
      ? popupState.selectedText
      : popupState.word || "Selection";

    if (typeof text !== "string" || text.length <= 120) {
      return text;
    }

    return `${text.slice(0, 120).trimEnd()}...`;
  }

  function renderSelectionPreview() {
    const refs = ensurePopupRefs();
    const shouldShow = shouldShowSelectionPreview();
    setHidden(refs.selectionField, !shouldShow);

    if (!shouldShow) {
      return;
    }

    updateTextBlock(refs.selectionValue, getSelectionPreviewText());
    const canToggle = popupState.selectedText.length > 120;
    refs.previewToggle.hidden = !canToggle;
    refs.previewToggle.textContent = popupState.isExpanded ? "Show Less" : "Show More";
  }

  function renderList(container, data, status) {
    if (!container) {
      return;
    }

    const refs = ensurePopupRefs();
    const relationValues = normalizeList(data);
    const normalizedStatus = normalizeRelationStatus(status);
    const sectionKey = container.dataset.relationSection;
    const valueElement = sectionKey === "synonyms" ? refs.synonymsValue : refs.antonymsValue;
    const copyButton = sectionKey === "synonyms" ? refs.synonymsCopyButton : refs.antonymsCopyButton;
    const copyFeedback = popupState?.copyFeedback?.[sectionKey] || "";

    if (normalizedStatus === "loading") {
      updateTextBlock(valueElement, "Loading...", { loading: true });
      setCopyButtonState(copyButton, sectionKey, relationValues, copyFeedback, true);
      return;
    }

    if (!relationValues.length) {
      updateTextBlock(valueElement, "No data available");
      setCopyButtonState(copyButton, sectionKey, relationValues, copyFeedback, true);
      return;
    }

    updateTextBlock(valueElement, relationValues.join(", "));
    setCopyButtonState(copyButton, sectionKey, relationValues, copyFeedback, false);
  }

  function renderMeaning() {
    const refs = ensurePopupRefs();
    updateTextBlock(
      refs.meaningValue,
      popupState?.meaning || "No meaning available."
    );
    setCopyButtonState(
      refs.meaningCopyButton,
      "meaning",
      popupState?.meaning || "",
      popupState?.copyFeedback?.meaning || "",
      false
    );
  }

  function renderTranslation() {
    const refs = ensurePopupRefs();
    const translatedText = popupState?.translatedText || "";
    const state = popupState?.translationState || "idle";
    const statusMessage = state === "error"
      ? "Translation failed"
      : popupState?.translationMessage || "";

    setHidden(refs.translationResults, !translatedText && !statusMessage);
    setHidden(refs.translationField, !translatedText);
    updateStatusBlock(
      refs.translationStatus,
      statusMessage,
      { hidden: !statusMessage, error: state === "error" }
    );

    if (translatedText) {
      updateTextBlock(refs.translationValue, translatedText);
      setCopyButtonState(
        refs.translationCopyButton,
        "translation",
        translatedText,
        popupState?.copyFeedback?.translation || "",
        false
      );
    } else {
      setCopyButtonState(
        refs.translationCopyButton,
        "translation",
        "",
        popupState?.copyFeedback?.translation || "",
        true
      );
    }

    refs.translateSelect.value = getAllowedLanguage(popupState?.targetLang);
    refs.translateButton.disabled = state === "loading";
    refs.translateButton.textContent = state === "loading" ? "Translating..." : "Translate";
  }

  function renderSaveSection() {
    const refs = ensurePopupRefs();
    const allowSave = Boolean(popupState?.allowSave);
    setHidden(refs.saveBlock, !allowSave);

    if (!allowSave) {
      return;
    }

    const saveState = popupState?.saveState || "idle";
    const isAuthenticated = Boolean(popupState?.isAuthenticated);
    const isSaved = saveState === "saved";
    const isSaving = saveState === "saving";

    refs.saveButton.disabled = isAuthenticated && (isSaved || isSaving);
    refs.saveButton.textContent = isAuthenticated
      ? (isSaved ? "Saved" : isSaving ? "Saving..." : "Save Word")
      : "Login to Save";

    updateStatusBlock(
      refs.saveStatus,
      popupState?.saveMessage || "",
      {
        hidden: !popupState?.saveMessage,
        error: saveState === "error"
      }
    );
  }

  function renderHeader() {
    const refs = ensurePopupRefs();
    setText(refs.title, getPopupTitle());
    setCopyButtonState(
      refs.wordCopyButton,
      "word",
      popupState?.selectedText || popupState?.word || "Selection",
      popupState?.copyFeedback?.word || "",
      false
    );

    if (popupState?.language) {
      setText(refs.languageBadge, popupState.language);
      setHidden(refs.languageBadge, false);
    } else {
      setHidden(refs.languageBadge, true);
    }
  }

  function renderStatusSection({ loading = false, message = "", error = false } = {}) {
    const refs = ensurePopupRefs();
    setHidden(refs.statusSection, !loading && !message);
    setHidden(refs.loader, !loading);
    if (loading) {
      setText(refs.loaderText, message || "Loading...");
    }

    updateStatusBlock(refs.statusMessage, message, {
      hidden: loading || !message,
      error
    });
  }

  function renderRelations() {
    const refs = ensurePopupRefs();
    renderList(refs.synonymsField, popupState?.synonyms, popupState?.relationFetchStatus);
    renderList(refs.antonymsField, popupState?.antonyms, popupState?.relationFetchStatus);
  }

  function renderStaticSections() {
    const refs = ensurePopupRefs();
    refs.translateSelect.innerHTML = LANGUAGE_OPTIONS.map(({ label, value }) => `
      <option value="${value}">${label}</option>
    `).join("");
  }

  function renderWordDetails() {
    renderHeader();
    renderSelectionPreview();
    renderMeaning();
    renderRelations();
    renderTranslation();
    renderSaveSection();
    renderStatusSection();
  }

  function bindPopupListeners() {
    if (listenersBound) {
      return;
    }

    const refs = ensurePopupRefs();
    renderStaticSections();

    refs.previewToggle.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      suppressSelectionOnce();
    });

    refs.previewToggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      suppressSelectionOnce();

      if (!hasActivePopupState()) {
        return;
      }

      popupState = {
        ...popupState,
        isExpanded: !popupState.isExpanded
      };
      renderSelectionPreview();
      renderHeader();
    });

    refs.popup.addEventListener("click", async (event) => {
      const copyButton = event.target.closest(".vocabai-popup__copy");

      if (copyButton) {
        event.preventDefault();
        event.stopPropagation();
        await handleCopy(copyButton);
        return;
      }

      if (event.target === refs.translateButton) {
        event.preventDefault();
        event.stopPropagation();
        await handleTranslate();
        return;
      }

      if (event.target === refs.saveButton) {
        event.preventDefault();
        event.stopPropagation();
        await handleSave();
        return;
      }

      if (event.target === refs.scanImageButton) {
        event.preventDefault();
        event.stopPropagation();
        window.VocabAIExtension.imageScan?.openImagePicker?.();
        return;
      }

      if (event.target === refs.pasteImageButton) {
        event.preventDefault();
        event.stopPropagation();
        window.VocabAIExtension.imageScan?.armPasteCapture?.();
      }
    });

    refs.translateSelect.addEventListener("change", async (event) => {
      const nextLang = getAllowedLanguage(event.target.value);

      popupState = {
        ...popupState,
        targetLang: nextLang,
        translatedText: "",
        translationState: "idle",
        translationMessage: ""
      };
      renderTranslation();

      try {
        await setStoredTargetLanguage(nextLang);
      } catch (_error) {
        popupState = {
          ...popupState,
          translationState: "error",
          translationMessage: "Translation failed"
        };
        renderTranslation();
      }
    });

    listenersBound = true;
  }

  async function copyToClipboard(text) {
    let normalizedText = text;

    if (Array.isArray(normalizedText)) {
      normalizedText = normalizedText.join(", ");
    }

    if (typeof normalizedText !== "string" || !normalizedText.trim()) {
      normalizedText = "No data available";
    }

    await navigator.clipboard.writeText(normalizedText);
  }

  function resetCopyFeedbackLater(copyType) {
    if (copyResetTimers[copyType]) {
      window.clearTimeout(copyResetTimers[copyType]);
    }

    copyResetTimers[copyType] = window.setTimeout(() => {
      if (!hasActivePopupState()) {
        return;
      }

      popupState = {
        ...popupState,
        copyFeedback: {
          ...(popupState.copyFeedback || {}),
          [copyType]: ""
        }
      };

      if (copyType === "meaning") {
        renderMeaning();
      } else if (copyType === "translation") {
        renderTranslation();
      } else if (copyType === "word") {
        renderHeader();
      } else {
        renderRelations();
      }
    }, 1500);
  }

  async function handleCopy(button) {
    if (!hasActivePopupState()) {
      return;
    }

    const copyType = button.dataset.copyType || "";
    const copyValue = button.dataset.copyValue || "";

    if (!copyType) {
      return;
    }

    try {
      await copyToClipboard(copyValue);
      popupState = {
        ...popupState,
        copyFeedback: {
          ...(popupState.copyFeedback || {}),
          [copyType]: "Copied \u2705"
        }
      };
    } catch (_error) {
      popupState = {
        ...popupState,
        copyFeedback: {
          ...(popupState.copyFeedback || {}),
          [copyType]: "Copy failed"
        }
      };
    }

    if (copyType === "meaning") {
      renderMeaning();
    } else if (copyType === "translation") {
      renderTranslation();
    } else if (copyType === "word") {
      renderHeader();
    } else {
      renderRelations();
    }

    resetCopyFeedbackLater(copyType);
  }

  function abortControllerSafely(controller) {
    if (!controller) {
      return;
    }

    try {
      controller.abort();
    } catch (_error) {
      // Ignore abort races.
    }
  }

  function clearRelationPolling() {
    if (relationPollTimeoutId) {
      window.clearTimeout(relationPollTimeoutId);
      relationPollTimeoutId = null;
    }
  }

  function resetPopupState() {
    abortControllerSafely(selectionRequestController);
    selectionRequestController = null;
    abortControllerSafely(translationRequestController);
    translationRequestController = null;
    clearRelationPolling();
    popupState = null;
    popupRefs = null;
  }

  function createAbortError() {
    return new DOMException("Operation aborted.", "AbortError");
  }

  function sendRuntimeMessage(message, signal) {
    return new Promise((resolve, reject) => {
      if (!isExtensionContextAvailable()) {
        reject(new Error("Extension context invalidated."));
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
        chrome.runtime.sendMessage(message, (response) => {
          if (settled) {
            return;
          }

          settled = true;
          cleanup();

          if (!isExtensionContextAvailable()) {
            reject(new Error("Extension context invalidated."));
            return;
          }

          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (!response?.success) {
            reject(new Error(response?.error || "Request failed."));
            return;
          }

          resolve(response.data ?? response);
        });
      } catch (error) {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        reject(error);
      }
    });
  }

  function fetchWordDetails(selectedText, signal) {
    return sendRuntimeMessage(
      {
        type: "FETCH_WORD_DETAILS",
        text: selectedText
      },
      signal
    );
  }

  function saveWordDetails(wordData, signal) {
    return sendRuntimeMessage(
      {
        type: "SAVE_WORD",
        data: wordData
      },
      signal
    );
  }

  function requestTranslation(text, targetLang, signal) {
    return sendRuntimeMessage(
      {
        type: "TRANSLATE_TEXT",
        text,
        targetLang
      },
      signal
    );
  }

  function getAuthStatus() {
    return sendRuntimeMessage({ type: "GET_AUTH_STATUS" }).then((response) =>
      Boolean(response?.authenticated)
    );
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

  async function handleTranslate() {
    if (!hasActivePopupState()) {
      return;
    }

    abortControllerSafely(translationRequestController);
    translationRequestController = new AbortController();

    popupState = {
      ...popupState,
      translationState: "loading",
      translationMessage: "",
      translatedText: ""
    };
    renderTranslation();

    try {
      const response = await requestTranslation(
        popupState.selectedText,
        popupState.targetLang,
        translationRequestController.signal
      );

      popupState = {
        ...popupState,
        translationState: "success",
        translationMessage: "",
        translatedText: response?.translatedText || ""
      };
      renderTranslation();
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      popupState = {
        ...popupState,
        translationState: "error",
        translationMessage: "Translation failed",
        translatedText: ""
      };
      renderTranslation();
    }
  }

  async function handleSave() {
    if (!hasActivePopupState() || !popupState.allowSave) {
      return;
    }

    if (!popupState.isAuthenticated) {
      window.open("http://localhost:5173/login", "_blank", "noopener,noreferrer");
      return;
    }

    popupState = {
      ...popupState,
      saveState: "saving",
      saveMessage: ""
    };
    renderSaveSection();

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
        renderSaveSection();
        return;
      }

      popupState = {
        ...popupState,
        saveState: "error",
        saveMessage: "Failed to save"
      };
      renderSaveSection();
    } catch (_error) {
      popupState = {
        ...popupState,
        saveState: "error",
        saveMessage: "Failed to save"
      };
      renderSaveSection();
    }
  }

  async function pollForRelationUpdates(text, controller, attemptsLeft) {
    if (!controller || controller.signal.aborted || attemptsLeft <= 0) {
      return;
    }

    relationPollTimeoutId = window.setTimeout(async () => {
      relationPollTimeoutId = null;

      if (controller.signal.aborted || !hasActivePopupState()) {
        return;
      }

      try {
        const data = await fetchWordDetails(text, controller.signal);

        if (controller.signal.aborted || !hasActivePopupState()) {
          return;
        }

        popupState = {
          ...popupState,
          synonyms: normalizeList(data.synonyms),
          antonyms: normalizeList(data.antonyms),
          relationFetchStatus: normalizeRelationStatus(data.relationFetchStatus)
        };
        renderRelations();

        if (popupState.relationFetchStatus === "loading") {
          await pollForRelationUpdates(text, controller, attemptsLeft - 1);
          return;
        }
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }
      }

      popupState = {
        ...popupState,
        relationFetchStatus: "complete"
      };
      renderRelations();
    }, RELATION_POLL_INTERVAL_MS);
  }

  async function loadAnalysisFromText(text, rect) {
    abortControllerSafely(selectionRequestController);
    abortControllerSafely(translationRequestController);
    clearRelationPolling();

    selectionRequestController = new AbortController();
    const { signal } = selectionRequestController;
    const refs = showPopup(rect, {
      wide: text.length > LONG_TEXT_THRESHOLD,
      preservePosition: true
    });

    bindPopupListeners();
    popupState = {
      selectedText: text,
      rect,
      word: text,
      language: "",
      meaning: "Loading...",
      synonyms: [],
      antonyms: [],
      relationFetchStatus: "loading",
      targetLang: DEFAULT_TARGET_LANG,
      translationState: "idle",
      translationMessage: "",
      translatedText: "",
      saveState: "idle",
      saveMessage: "",
      isAuthenticated: false,
      allowSave: isSingleWordSelection(text),
      showTranslate: true,
      isLongSelection: text.length > LONG_TEXT_THRESHOLD,
      isExpanded: false,
      copyFeedback: {}
    };

    refs.popup.classList.toggle("wide-popup", popupState.isLongSelection);
    renderHeader();
    renderSelectionPreview();
    renderMeaning();
    renderRelations();
    renderTranslation();
    renderSaveSection();
    renderStatusSection({ loading: true, message: "Loading..." });

    try {
      const [data, authenticated, targetLang] = await Promise.all([
        fetchWordDetails(text, signal),
        getAuthStatus().catch(() => false),
        getStoredTargetLanguage().catch(() => DEFAULT_TARGET_LANG)
      ]);

      if (signal.aborted) {
        return;
      }

      popupState = {
        ...popupState,
        word: data.word,
        language: data.language || "",
        meaning: data.meaning || "No meaning available.",
        synonyms: normalizeList(data.synonyms),
        antonyms: normalizeList(data.antonyms),
        relationFetchStatus: normalizeRelationStatus(data.relationFetchStatus),
        targetLang,
        isAuthenticated: authenticated,
        allowSave: isSingleWordSelection(text)
      };

      renderWordDetails();

      if (popupState.relationFetchStatus === "loading") {
        await pollForRelationUpdates(text, selectionRequestController, RELATION_POLL_MAX_ATTEMPTS);
        return;
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      popupState = {
        ...popupState,
        word: text,
        language: "",
        meaning: "Meaning is unavailable for this selection.",
        synonyms: [],
        antonyms: [],
        relationFetchStatus: "complete",
        allowSave: false
      };
      renderWordDetails();
      renderStatusSection({
        message: error instanceof Error ? error.message : "Failed to fetch meaning",
        error: true
      });
      return;
    }

    renderStatusSection();
  }

  async function handleSelection(selection) {
    if (!selection) {
      resetPopupState();
      return;
    }

    await loadAnalysisFromText(selection.text, selection.rect);
  }

  initializePopupHandlers();
  ensurePopupRefs();
  bindPopupListeners();
  setCloseHandler(() => {
    resetPopupState();
  });
  initializeSelectionListener({
    onSelection: handleSelection,
    shouldIgnoreSelection: (event) =>
      consumeSelectionSuppression() || isPopupInteraction(event),
    debounceMs: 300
  });

  window.VocabAIExtension.contentActions = {
    analyzeTextInput: async (text) => {
      if (typeof text !== "string" || !text.trim()) {
        return;
      }

      await loadAnalysisFromText(text.trim(), buildDefaultPopupRect());
    },
    showOcrLoading: (label = "Scanning image...") => {
      showPopup(buildDefaultPopupRect(), { wide: true, preservePosition: true });
      renderStatusSection({ loading: true, message: label });
    },
    showOcrError: (message = "OCR failed") => {
      showPopup(buildDefaultPopupRect(), { wide: true, preservePosition: true });
      renderStatusSection({ message, error: true });
    }
  };
})();
