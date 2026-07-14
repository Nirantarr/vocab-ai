window.VocabAIExtension = window.VocabAIExtension || {};

(function initializeContentScript() {
  const extensionConfig = window.VocabAIExtension.config || globalThis.VocabAIExtensionConfig;
  const {
    DEFAULT_TARGET_LANG,
    LANGUAGE_OPTIONS,
    LONG_TEXT_THRESHOLD,
    normalizeRelationStatus
  } = window.VocabAIExtension.ui;
  const logger = window.VocabAIExtension.logger;
  const {
    sanitizeErrorMessage,
    sanitizeList,
    sanitizeText
  } = window.VocabAIExtension.sanitize;
  const popupStateStore = window.VocabAIExtension.popupState;
  const runtimeService = window.VocabAIExtension.runtimeService;
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

  if (!extensionConfig?.WEB_APP_URL) {
    throw new Error("Extension WEB_APP_URL configuration is missing.");
  }

  const RELATION_POLL_INTERVAL_MS = 1200;
  const RELATION_POLL_MAX_ATTEMPTS = 6;

  let popupState = null;
  let popupRefs = null;
  let boundPopupElement = null;
  let relationPollTimeoutId = null;
  let selectionRequestController = null;
  let translationRequestController = null;
  let popupClosedManually = false;
  let lastClosedSelectionSignature = "";
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

  function isPdfPage() {
    const href = String(globalThis.location?.href || "");
    const protocol = String(globalThis.location?.protocol || "");
    const contentType = String(document.contentType || "").toLowerCase();

    if (protocol === "file:" && href.toLowerCase().includes(".pdf")) {
      return true;
    }

    if (contentType === "application/pdf") {
      return true;
    }

    if (
      href.startsWith("chrome-extension://") &&
      (
        href.toLowerCase().includes(".pdf") ||
        document.querySelector("embed[type='application/pdf'], pdf-viewer, viewer-toolbar")
      )
    ) {
      return true;
    }

    return Boolean(document.querySelector("embed[type='application/pdf']"));
  }

  function buildSelectionSignature(text, rect) {
    const normalizedText = sanitizeText(String(text || "").trim()).toLowerCase();

    if (!normalizedText) {
      return "";
    }

    const left = Number.isFinite(rect?.left) ? Math.round(rect.left) : 0;
    const top = Number.isFinite(rect?.top) ? Math.round(rect.top) : 0;
    const width = Number.isFinite(rect?.width) ? Math.round(rect.width) : 0;
    const height = Number.isFinite(rect?.height) ? Math.round(rect.height) : 0;

    return `${normalizedText}|${left}:${top}:${width}:${height}`;
  }

  function shouldPreventManualReopen(selection) {
    if (!popupClosedManually || !selection) {
      return false;
    }

    const signature = buildSelectionSignature(selection.text, selection.rect);

    if (!signature || signature !== lastClosedSelectionSignature) {
      return false;
    }

    logger?.debug("popup_recreation_prevented", {
      reason: "manual_close_guard",
      isPdfPage: isPdfPage(),
      signature
    });
    return true;
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

  function isSingleWord(value) {
    return /^[a-zA-Z][a-zA-Z'-]*$/.test(value);
  }

  function sanitizeSelectionText(value) {
    if (typeof value !== "string") {
      return "";
    }

    return value
      .replace(/[\[\](){}<>]/g, " ")
      .replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getSelectionMode(value) {
    const sanitizedText = sanitizeSelectionText(value);
    return isSingleWord(sanitizedText) ? "word" : "text";
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
    return sanitizeList(values);
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
    button.dataset.copyValue = sanitizeText(normalizedValue, "No data available") || "No data available";
    button.textContent = sanitizeText(feedback, "Copy") || "Copy";
    button.hidden = Boolean(hidden);
  }

  function updateTextBlock(element, value, { loading = false, error = false } = {}) {
    if (!element) {
      return;
    }

    element.textContent = sanitizeText(value, value);
    element.classList.toggle("vocabai-popup__value--loading", Boolean(loading));
    element.classList.toggle("vocabai-popup__status--error", Boolean(error));
  }

  function updateStatusBlock(element, message, { hidden = false, error = false } = {}) {
    if (!element) {
      return;
    }

    element.hidden = Boolean(hidden || !message);
    element.textContent = sanitizeText(message || "", message || "");
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
    const isWordMode = popupState?.mode === "word";
    setHidden(refs.meaningField, !isWordMode);

    if (!isWordMode) {
      return;
    }

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

    setHidden(refs.translateSelect, false);
    setHidden(refs.translateButton, false);
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
    const isWordMode = popupState?.mode === "word";
    setHidden(refs.synonymsField, !isWordMode);
    setHidden(refs.antonymsField, !isWordMode);

    if (!isWordMode) {
      return;
    }

    renderList(refs.synonymsField, popupState?.synonyms, popupState?.relationFetchStatus);
    renderList(refs.antonymsField, popupState?.antonyms, popupState?.relationFetchStatus);
  }

  function renderStaticSections() {
    const refs = ensurePopupRefs();

    if (!refs?.translateSelect) {
      return;
    }

    const existingOptionValues = Array.from(refs.translateSelect.options).map((option) => option.value);
    const expectedOptionValues = LANGUAGE_OPTIONS.map((option) => option.value);

    if (
      existingOptionValues.length === expectedOptionValues.length &&
      existingOptionValues.every((value, index) => value === expectedOptionValues[index])
    ) {
      return;
    }

    refs.translateSelect.replaceChildren();

    LANGUAGE_OPTIONS.forEach(({ label, value }) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      refs.translateSelect.appendChild(option);
    });
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
    const refs = ensurePopupRefs();

    if (!refs?.popup) {
      return;
    }

    if (
      boundPopupElement &&
      boundPopupElement === refs.popup &&
      document.body.contains(boundPopupElement)
    ) {
      return;
    }

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
    popupStateStore.setState(popupState);
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
        translationLoading: false,
        translatedText: "",
        translationState: "idle",
        translationMessage: ""
      };
      popupStateStore.setState(popupState);
      renderTranslation();

      try {
        await setStoredTargetLanguage(nextLang);
      } catch (_error) {
        popupState = {
          ...popupState,
          translationLoading: false,
          translationState: "error",
          translationMessage: "Translation failed"
        };
        popupStateStore.setState(popupState);
        renderTranslation();
      }
    });

    boundPopupElement = refs.popup;
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
      popupStateStore.setState(popupState);

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
      logger?.warn("copy_failed", { copyType });
      popupState = {
        ...popupState,
        copyFeedback: {
          ...(popupState.copyFeedback || {}),
          [copyType]: "Copy failed"
        }
      };
    }
    popupStateStore.setState(popupState);

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
    popupStateStore.resetState();
    popupRefs = null;
    boundPopupElement = null;
  }

  function fetchWordDetails(selectedText, signal) {
    return runtimeService.sendMessage(
      {
        type: "FETCH_WORD_DETAILS",
        text: selectedText
      },
      signal
    );
  }

  function saveWordDetails(wordData, signal) {
    return runtimeService.sendMessage(
      {
        type: "SAVE_WORD",
        data: wordData
      },
      signal
    );
  }

  function requestTranslation(text, targetLang, signal) {
    return runtimeService.sendMessage(
      {
        type: "TRANSLATE_TEXT",
        text,
        targetLang
      },
      signal
    );
  }

  function getAuthStatus() {
    return runtimeService.sendMessage({ type: "GET_AUTH_STATUS" }).then((response) =>
      Boolean(response?.authenticated)
    );
  }

  function getStoredTargetLanguage() {
    return runtimeService.getStoredTargetLanguage(DEFAULT_TARGET_LANG, getAllowedLanguage);
  }

  function setStoredTargetLanguage(targetLang) {
    return runtimeService.setStoredTargetLanguage(targetLang);
  }

  async function handleTranslate() {
    if (!hasActivePopupState()) {
      return;
    }

    abortControllerSafely(translationRequestController);
    translationRequestController = new AbortController();

    popupState = {
      ...popupState,
      translationLoading: true,
      translationState: "loading",
      translationMessage: "",
      translatedText: ""
    };
    popupStateStore.setState(popupState);
    renderTranslation();

    try {
      const response = await requestTranslation(
        popupState.selectedText,
        popupState.targetLang,
        translationRequestController.signal
      );

      popupState = {
        ...popupState,
        translationLoading: false,
        translationState: "success",
        translationMessage: "",
        translatedText: response?.translatedText || ""
      };
      popupStateStore.setState(popupState);
      renderTranslation();
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      logger?.warn("translation_failed", {
        error: sanitizeErrorMessage(error)
      });
      popupState = {
        ...popupState,
        translationLoading: false,
        translationState: "error",
        translationMessage: "Translation failed",
        translatedText: ""
      };
      popupStateStore.setState(popupState);
      renderTranslation();
    }
  }

  async function handleSave() {
    if (!hasActivePopupState() || !popupState.allowSave) {
      return;
    }

    if (!popupState.isAuthenticated) {
      window.open(`${extensionConfig.WEB_APP_URL}/login`, "_blank", "noopener,noreferrer");
      return;
    }

    popupState = {
      ...popupState,
      saveState: "saving",
      saveMessage: ""
    };
    popupStateStore.setState(popupState);
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
        popupStateStore.setState(popupState);
        renderSaveSection();
        return;
      }

      popupState = {
        ...popupState,
        saveState: "error",
        saveMessage: "Failed to save"
      };
      popupStateStore.setState(popupState);
      renderSaveSection();
    } catch (_error) {
      logger?.warn("save_failed", {
        error: sanitizeErrorMessage(_error)
      });
      popupState = {
        ...popupState,
        saveState: "error",
        saveMessage: "Failed to save"
      };
      popupStateStore.setState(popupState);
      renderSaveSection();
    }
  }

  async function pollForRelationUpdates(text, controller, attemptsLeft) {
    if (popupState?.mode !== "word") {
      return;
    }

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
        relationFetchStatus: normalizeRelationStatus(data.relationFetchStatus),
        relationLoading: normalizeRelationStatus(data.relationFetchStatus) === "loading"
      };
      popupStateStore.setState(popupState);
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
        relationFetchStatus: "complete",
        relationLoading: false
      };
      popupStateStore.setState(popupState);
      renderRelations();
    }, RELATION_POLL_INTERVAL_MS);
  }

  async function loadAnalysisFromText(text, rect) {
    abortControllerSafely(selectionRequestController);
    abortControllerSafely(translationRequestController);
    clearRelationPolling();

    selectionRequestController = new AbortController();
    const { signal } = selectionRequestController;
    const sanitizedText = sanitizeSelectionText(text);
    const mode = getSelectionMode(text);
    const isWordMode = mode === "word";
    const lookupText = isWordMode ? sanitizedText : text.trim();
    popupClosedManually = false;
    lastClosedSelectionSignature = "";
    const refs = showPopup(rect, {
      wide: text.length > LONG_TEXT_THRESHOLD,
      preservePosition: true
    });
    logger?.info("popup_created", {
      isPdfPage: isPdfPage(),
      mode,
      text: sanitizeText(text)
    });

    bindPopupListeners();
    popupState = {
      selectedText: text,
      rect,
      mode,
      word: isWordMode ? lookupText : text,
      language: "",
      meaning: isWordMode ? "Loading..." : "",
      synonyms: [],
      antonyms: [],
      relationFetchStatus: isWordMode ? "loading" : "skipped",
      targetLang: DEFAULT_TARGET_LANG,
      translationLoading: false,
      relationLoading: isWordMode,
      wordLoading: isWordMode,
      translationState: "idle",
      translationMessage: "",
      translatedText: "",
      saveState: "idle",
      saveMessage: "",
      isAuthenticated: false,
      allowSave: isWordMode,
      showTranslate: true,
      isLongSelection: text.length > LONG_TEXT_THRESHOLD,
      isExpanded: false,
      copyFeedback: {}
    };
    popupStateStore.setState(popupState);

    refs.popup.classList.toggle("wide-popup", popupState.isLongSelection);
    renderHeader();
    renderSelectionPreview();
    renderMeaning();
    renderRelations();
    renderTranslation();
    renderSaveSection();
    renderStatusSection({
      loading: Boolean(popupState.wordLoading),
      message: popupState.wordLoading ? "Loading..." : ""
    });

    if (!isWordMode) {
      try {
        const targetLang = await getStoredTargetLanguage().catch(() => DEFAULT_TARGET_LANG);

        if (signal.aborted) {
          return;
        }

        popupState = {
          ...popupState,
          targetLang,
          wordLoading: false,
          relationLoading: false,
          relationFetchStatus: "skipped"
        };
        popupStateStore.setState(popupState);
        renderWordDetails();
        renderStatusSection();
      } catch (_error) {
        renderStatusSection();
      }

      return;
    }

    try {
      const [data, authenticated, targetLang] = await Promise.all([
        fetchWordDetails(lookupText, signal),
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
        wordLoading: false,
        relationLoading: normalizeRelationStatus(data.relationFetchStatus) === "loading",
        targetLang,
        isAuthenticated: authenticated,
        allowSave: isWordMode
      };
      popupStateStore.setState(popupState);

      renderWordDetails();

      if (popupState.relationFetchStatus === "loading") {
        await pollForRelationUpdates(lookupText, selectionRequestController, RELATION_POLL_MAX_ATTEMPTS);
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
        wordLoading: false,
        relationLoading: false,
        allowSave: false
      };
      popupStateStore.setState(popupState);
      renderWordDetails();
      renderStatusSection({
        message: sanitizeErrorMessage(error, "Failed to fetch meaning"),
        error: true
      });
      logger?.error("word_lookup_failed", {
        error: sanitizeErrorMessage(error),
        text: sanitizeText(text)
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

    if (shouldPreventManualReopen(selection)) {
      return;
    }

    popupClosedManually = false;
    lastClosedSelectionSignature = "";

    await loadAnalysisFromText(selection.text, selection.rect);
  }

  initializePopupHandlers();
  logger?.info("content_script_initialized", {
    isPdfPage: isPdfPage()
  });
  setCloseHandler((reason = "programmatic") => {
    const closeSignature = buildSelectionSignature(popupState?.selectedText, popupState?.rect);

    if (reason === "manual") {
      popupClosedManually = true;
      lastClosedSelectionSignature = closeSignature;
    }

    logger?.info("popup_closed", {
      isPdfPage: isPdfPage(),
      reason,
      signature: closeSignature
    });
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
      bindPopupListeners();
      logger?.info("popup_created", {
        isPdfPage: isPdfPage(),
        mode: "ocr-loading",
        text: sanitizeText(label)
      });
      renderStatusSection({ loading: true, message: label });
    },
    showOcrError: (message = "OCR failed") => {
      showPopup(buildDefaultPopupRect(), { wide: true, preservePosition: true });
      bindPopupListeners();
      logger?.info("popup_created", {
        isPdfPage: isPdfPage(),
        mode: "ocr-error",
        text: sanitizeText(message)
      });
      renderStatusSection({ message, error: true });
    }
  };
})();
