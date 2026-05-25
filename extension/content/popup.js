window.VocabAIExtension = window.VocabAIExtension || {};

const POPUP_ID = "vocabai-selection-popup";
const POPUP_MARGIN = 12;
const POPUP_POSITION_X_KEY = "popupX";
const POPUP_POSITION_Y_KEY = "popupY";
const POPUP_WIDTH_KEY = "popupWidth";
const POPUP_HEIGHT_KEY = "popupHeight";
const MIN_POPUP_WIDTH = 280;
const MIN_POPUP_HEIGHT = 250;

let currentPopup = null;
let popupRefs = null;
let suppressNextSelection = false;
let dragCleanup = null;
let resizeCleanup = null;
let closeHandler = null;

function clearSelection() {
  const selection = window.getSelection?.();

  if (selection) {
    selection.removeAllRanges();
  }
}

function getStoredPopupPosition() {
  try {
    const storedLeft = Number.parseFloat(
      window.localStorage.getItem(POPUP_POSITION_X_KEY)
    );
    const storedTop = Number.parseFloat(
      window.localStorage.getItem(POPUP_POSITION_Y_KEY)
    );

    if (Number.isFinite(storedLeft) && Number.isFinite(storedTop)) {
      return { left: storedLeft, top: storedTop };
    }
  } catch (_error) {
    return null;
  }

  return null;
}

function savePopupPosition(left, top) {
  try {
    window.localStorage.setItem(POPUP_POSITION_X_KEY, String(left));
    window.localStorage.setItem(POPUP_POSITION_Y_KEY, String(top));
  } catch (_error) {
    // Ignore storage failures to keep the popup usable.
  }
}

function loadPopupSize() {
  try {
    const storedWidth = Number.parseFloat(
      window.localStorage.getItem(POPUP_WIDTH_KEY)
    );
    const storedHeight = Number.parseFloat(
      window.localStorage.getItem(POPUP_HEIGHT_KEY)
    );

    return {
      width: Number.isFinite(storedWidth) ? storedWidth : null,
      height: Number.isFinite(storedHeight) ? storedHeight : null
    };
  } catch (_error) {
    return { width: null, height: null };
  }
}

function savePopupSize(width, height) {
  try {
    window.localStorage.setItem(POPUP_WIDTH_KEY, String(width));
    window.localStorage.setItem(POPUP_HEIGHT_KEY, String(height));
  } catch (_error) {
    // Ignore storage failures to keep the popup usable.
  }
}

function clampPopupPosition(left, top, popupElement) {
  const maxLeft = Math.max(
    POPUP_MARGIN,
    window.innerWidth - popupElement.offsetWidth - POPUP_MARGIN
  );
  const maxTop = Math.max(
    POPUP_MARGIN,
    window.innerHeight - popupElement.offsetHeight - POPUP_MARGIN
  );

  return {
    left: Math.min(Math.max(POPUP_MARGIN, left), maxLeft),
    top: Math.min(Math.max(POPUP_MARGIN, top), maxTop)
  };
}

function clampPopupSize(width, height) {
  const maxWidth = Math.max(MIN_POPUP_WIDTH, Math.floor(window.innerWidth * 0.9));
  const maxHeight = Math.max(MIN_POPUP_HEIGHT, Math.floor(window.innerHeight * 0.9));

  return {
    width: Math.min(Math.max(MIN_POPUP_WIDTH, width), maxWidth),
    height: Math.min(Math.max(MIN_POPUP_HEIGHT, height), maxHeight)
  };
}

function applyPopupSize(popupElement, width, height) {
  const clampedSize = clampPopupSize(width, height);
  popupElement.style.width = `${clampedSize.width}px`;
  popupElement.style.height = `${clampedSize.height}px`;
  return clampedSize;
}

function loadPopupSizeIntoElement(popupElement) {
  if (!popupElement) {
    return;
  }

  const storedSize = loadPopupSize();

  if (!storedSize.width && !storedSize.height) {
    return;
  }

  const fallbackWidth = popupElement.offsetWidth || MIN_POPUP_WIDTH;
  const fallbackHeight = popupElement.offsetHeight || 280;

  applyPopupSize(
    popupElement,
    storedSize.width || fallbackWidth,
    storedSize.height || fallbackHeight
  );
}

function positionPopup(popup, rect, { preservePosition = false } = {}) {
  if (
    preservePosition &&
    typeof popup.style.left === "string" &&
    popup.style.left &&
    typeof popup.style.top === "string" &&
    popup.style.top
  ) {
    const currentLeft = Number.parseFloat(popup.style.left);
    const currentTop = Number.parseFloat(popup.style.top);

    if (Number.isFinite(currentLeft) && Number.isFinite(currentTop)) {
      const clampedPosition = clampPopupPosition(currentLeft, currentTop, popup);
      popup.style.left = `${clampedPosition.left}px`;
      popup.style.top = `${clampedPosition.top}px`;
      return;
    }
  }

  const storedPosition = getStoredPopupPosition();

  if (storedPosition) {
    const clampedPosition = clampPopupPosition(
      storedPosition.left,
      storedPosition.top,
      popup
    );
    popup.style.left = `${clampedPosition.left}px`;
    popup.style.top = `${clampedPosition.top}px`;
    return;
  }

  const popupWidth = popup.offsetWidth || 300;
  const popupHeight = popup.offsetHeight || 260;
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight;

  let left = rect.left;
  let top = rect.bottom + POPUP_MARGIN;

  if (left + popupWidth > viewportWidth - POPUP_MARGIN) {
    left = viewportWidth - popupWidth - POPUP_MARGIN;
  }

  if (left < POPUP_MARGIN) {
    left = POPUP_MARGIN;
  }

  if (top + popupHeight > viewportHeight - POPUP_MARGIN) {
    top = Math.max(POPUP_MARGIN, rect.top - popupHeight - POPUP_MARGIN);
  }

  const clampedPosition = clampPopupPosition(left, top, popup);
  popup.style.left = `${clampedPosition.left}px`;
  popup.style.top = `${clampedPosition.top}px`;
}

function setHidden(element, hidden) {
  if (!element) {
    return;
  }

  element.hidden = Boolean(hidden);
}

function setText(element, value = "") {
  if (!element) {
    return;
  }

  element.textContent = value;
}

function createRelationField(label, sectionKey) {
  const field = document.createElement("div");
  field.className = "vocabai-popup__field vocabai-popup__field--relation";
  field.dataset.relationSection = sectionKey;

  const header = document.createElement("div");
  header.className = "vocabai-popup__field-header";

  const labelElement = document.createElement("div");
  labelElement.className = "vocabai-popup__label";
  labelElement.textContent = label;

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "vocabai-popup__copy";
  copyButton.dataset.copyType = sectionKey;
  copyButton.hidden = true;
  copyButton.textContent = "Copy";

  header.append(labelElement, copyButton);

  const content = document.createElement("div");
  content.className = "vocabai-popup__relation-content";

  const value = document.createElement("div");
  value.className = "vocabai-popup__value";
  content.appendChild(value);

  field.append(header, content);

  return { field, copyButton, value };
}

function createPopupShell() {
  const popup = document.createElement("div");
  popup.id = POPUP_ID;
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-live", "polite");
  popup.className = "vocabai-popup";
  popup.hidden = true;

  const header = document.createElement("div");
  header.className = "vocabai-popup__header popup-header";

  const headerMain = document.createElement("div");
  headerMain.className = "vocabai-popup__header-main";

  const titleRow = document.createElement("div");
  titleRow.className = "vocabai-popup__title-row";

  const title = document.createElement("div");
  title.className = "vocabai-popup__title";

  const wordCopyButton = document.createElement("button");
  wordCopyButton.type = "button";
  wordCopyButton.className = "vocabai-popup__copy";
  wordCopyButton.dataset.copyType = "word";
  wordCopyButton.textContent = "Copy";

  titleRow.append(title, wordCopyButton);

  const languageBadge = document.createElement("div");
  languageBadge.className = "vocabai-popup__language-badge";
  languageBadge.hidden = true;

  headerMain.append(titleRow, languageBadge);

  const closeButton = document.createElement("button");
  closeButton.id = "closeBtn";
  closeButton.type = "button";
  closeButton.className = "vocabai-popup__close";
  closeButton.setAttribute("aria-label", "Close popup");
  closeButton.textContent = "x";

  header.append(headerMain, closeButton);

  const body = document.createElement("div");
  body.className = "vocabai-popup__body";

  const statusSection = document.createElement("div");
  statusSection.className = "vocabai-popup__status-section";
  statusSection.hidden = true;

  const loader = document.createElement("div");
  loader.className = "vocabai-popup__loader";
  loader.hidden = true;

  const spinner = document.createElement("span");
  spinner.className = "vocabai-popup__spinner";
  spinner.setAttribute("aria-hidden", "true");

  const loaderText = document.createElement("span");
  loaderText.className = "vocabai-popup__status";
  loaderText.textContent = "Loading...";

  loader.append(spinner, loaderText);

  const statusMessage = document.createElement("div");
  statusMessage.className = "vocabai-popup__status";
  statusMessage.hidden = true;

  statusSection.append(loader, statusMessage);

  const selectionField = document.createElement("div");
  selectionField.className = "vocabai-popup__field";
  selectionField.hidden = true;

  const selectionLabel = document.createElement("div");
  selectionLabel.className = "vocabai-popup__label";
  selectionLabel.textContent = "Selected Text";

  const selectionValue = document.createElement("div");
  selectionValue.className = "vocabai-popup__value";

  const previewToggle = document.createElement("button");
  previewToggle.type = "button";
  previewToggle.className = "vocabai-popup__toggle-preview";
  previewToggle.hidden = true;

  selectionField.append(selectionLabel, selectionValue, previewToggle);

  const meaningField = document.createElement("div");
  meaningField.className = "vocabai-popup__field";

  const meaningHeader = document.createElement("div");
  meaningHeader.className = "vocabai-popup__field-header";

  const meaningLabel = document.createElement("div");
  meaningLabel.className = "vocabai-popup__label";
  meaningLabel.textContent = "Meaning";

  const meaningCopyButton = document.createElement("button");
  meaningCopyButton.type = "button";
  meaningCopyButton.className = "vocabai-popup__copy";
  meaningCopyButton.dataset.copyType = "meaning";
  meaningCopyButton.textContent = "Copy";

  meaningHeader.append(meaningLabel, meaningCopyButton);

  const meaningValue = document.createElement("div");
  meaningValue.className = "vocabai-popup__value";

  meaningField.append(meaningHeader, meaningValue);

  const synonymsField = createRelationField("Synonyms", "synonyms");
  const antonymsField = createRelationField("Antonyms", "antonyms");

  const translationResults = document.createElement("div");
  translationResults.className = "vocabai-popup__translate-results";
  translationResults.hidden = true;

  const translationField = document.createElement("div");
  translationField.className = "vocabai-popup__field";
  translationField.hidden = true;

  const translationHeader = document.createElement("div");
  translationHeader.className = "vocabai-popup__field-header";

  const translationLabel = document.createElement("div");
  translationLabel.className = "vocabai-popup__label";
  translationLabel.textContent = "Translation";

  const translationCopyButton = document.createElement("button");
  translationCopyButton.type = "button";
  translationCopyButton.className = "vocabai-popup__copy";
  translationCopyButton.dataset.copyType = "translation";
  translationCopyButton.textContent = "Copy";
  translationCopyButton.hidden = true;

  translationHeader.append(translationLabel, translationCopyButton);

  const translationValue = document.createElement("div");
  translationValue.className = "vocabai-popup__value";

  translationField.append(translationHeader, translationValue);

  const translationStatus = document.createElement("div");
  translationStatus.className = "vocabai-popup__status";
  translationStatus.hidden = true;

  translationResults.append(translationField, translationStatus);

  body.append(
    statusSection,
    selectionField,
    meaningField,
    synonymsField.field,
    antonymsField.field,
    translationResults
  );

  const footer = document.createElement("div");
  footer.className = "vocabai-popup__footer";

  const translateControlsBlock = document.createElement("div");
  translateControlsBlock.className = "vocabai-popup__footer-block vocabai-popup__translate";

  const translateControls = document.createElement("div");
  translateControls.className = "vocabai-popup__translate-controls";

  const translateSelect = document.createElement("select");
  translateSelect.className = "vocabai-popup__select";
  translateSelect.setAttribute("aria-label", "Select target language");

  const translateButton = document.createElement("button");
  translateButton.type = "button";
  translateButton.className = "vocabai-popup__translate-button";
  translateButton.textContent = "Translate";

  translateControls.append(translateSelect, translateButton);
  translateControlsBlock.appendChild(translateControls);

  const ocrActionsBlock = document.createElement("div");
  ocrActionsBlock.className = "vocabai-popup__footer-block vocabai-popup__actions";

  const ocrActions = document.createElement("div");
  ocrActions.className = "vocabai-popup__ocr-actions";

  const scanImageButton = document.createElement("button");
  scanImageButton.type = "button";
  scanImageButton.className = "vocabai-popup__scan-image";
  scanImageButton.textContent = "Scan Image";

  const pasteImageButton = document.createElement("button");
  pasteImageButton.type = "button";
  pasteImageButton.className = "vocabai-popup__paste-image";
  pasteImageButton.textContent = "Paste Screenshot";

  ocrActions.append(scanImageButton, pasteImageButton);

  const ocrHint = document.createElement("div");
  ocrHint.className = "vocabai-popup__hint";
  ocrHint.textContent = "Press Win + Shift + S, then Ctrl + V to scan text from screen.";

  ocrActionsBlock.append(ocrActions, ocrHint);

  const saveBlock = document.createElement("div");
  saveBlock.className = "vocabai-popup__footer-block vocabai-popup__actions";

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.className = "vocabai-popup__save";
  saveButton.textContent = "Save Word";

  const saveStatus = document.createElement("div");
  saveStatus.className = "vocabai-popup__status";
  saveStatus.hidden = true;

  saveBlock.append(saveButton, saveStatus);

  const resizeHandle = document.createElement("div");
  resizeHandle.className = "resize-handle";
  resizeHandle.setAttribute("aria-hidden", "true");

  footer.append(translateControlsBlock, ocrActionsBlock, saveBlock);
  popup.append(header, body, footer, resizeHandle);

  popup.addEventListener("mousedown", (event) => {
    event.stopPropagation();
  });
  popup.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  popupRefs = {
    popup,
    header,
    title,
    wordCopyButton,
    closeButton,
    languageBadge,
    body,
    footer,
    loader,
    loaderText,
    statusSection,
    statusMessage,
    selectionField,
    selectionValue,
    previewToggle,
    meaningField,
    meaningValue,
    meaningCopyButton,
    synonymsField: synonymsField.field,
    synonymsValue: synonymsField.value,
    synonymsCopyButton: synonymsField.copyButton,
    antonymsField: antonymsField.field,
    antonymsValue: antonymsField.value,
    antonymsCopyButton: antonymsField.copyButton,
    translationResults,
    translationField,
    translationValue,
    translationCopyButton,
    translationStatus,
    translateSelect,
    translateButton,
    scanImageButton,
    pasteImageButton,
    saveBlock,
    saveButton,
    saveStatus,
    resizeHandle
  };

  return popup;
}

function ensurePopup() {
  if (currentPopup && document.body.contains(currentPopup)) {
    return currentPopup;
  }

  currentPopup = createPopupShell();
  document.body.appendChild(currentPopup);
  loadPopupSizeIntoElement(currentPopup);

  if (typeof dragCleanup !== "function") {
    dragCleanup = makePopupDraggable(currentPopup);
  }

  if (typeof resizeCleanup !== "function") {
    resizeCleanup = makePopupResizable(currentPopup);
  }

  return currentPopup;
}

function showPopup(rect, options = {}) {
  const popup = ensurePopup();

  if (popupRefs?.closeButton && !popupRefs.closeButton.dataset.listenerBound) {
    popupRefs.closeButton.addEventListener("mousedown", (event) => {
      event.stopPropagation();
    });
    popupRefs.closeButton.addEventListener("click", handleManualClose);
    popupRefs.closeButton.dataset.listenerBound = "true";
  }

  popup.hidden = false;
  popup.classList.toggle("wide-popup", Boolean(options.wide));
  positionPopup(popup, rect, { preservePosition: Boolean(options.preservePosition) });
  return popupRefs;
}

function getPopupRefs() {
  ensurePopup();
  return popupRefs;
}

function closePopup() {
  if (!currentPopup) {
    if (typeof closeHandler === "function") {
      closeHandler();
    }

    return;
  }

  currentPopup.classList.remove("is-dragging", "is-resizing");
  document.body.style.userSelect = "auto";

  const popupToRemove = currentPopup;
  currentPopup = null;
  popupRefs = null;
  popupToRemove.remove();

  if (typeof dragCleanup === "function") {
    dragCleanup();
    dragCleanup = null;
  }

  if (typeof resizeCleanup === "function") {
    resizeCleanup();
    resizeCleanup = null;
  }

  if (typeof closeHandler === "function") {
    closeHandler();
  }
}

function removePopup() {
  closePopup();
}

function destroyPopup() {
  closePopup();
}

function initializePopupHandlers() {
  window.addEventListener("resize", () => {
    if (!currentPopup || currentPopup.hidden) {
      return;
    }

    const popupRect = currentPopup.getBoundingClientRect();
    const clampedSize = applyPopupSize(currentPopup, popupRect.width, popupRect.height);
    const clampedPosition = clampPopupPosition(
      popupRect.left,
      popupRect.top,
      currentPopup
    );

    currentPopup.style.width = `${clampedSize.width}px`;
    currentPopup.style.height = `${clampedSize.height}px`;
    currentPopup.style.left = `${clampedPosition.left}px`;
    currentPopup.style.top = `${clampedPosition.top}px`;
    savePopupSize(clampedSize.width, clampedSize.height);
    savePopupPosition(clampedPosition.left, clampedPosition.top);
  });
}

function makePopupDraggable(popupElement) {
  const header = popupElement.querySelector(".popup-header");

  if (!header) {
    return () => {};
  }

  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  const stopDragging = () => {
    if (!isDragging) {
      return;
    }

    isDragging = false;
    popupElement.classList.remove("is-dragging");
    document.body.style.userSelect = "auto";

    if (popupElement.style.left && popupElement.style.top) {
      savePopupPosition(
        Number.parseFloat(popupElement.style.left),
        Number.parseFloat(popupElement.style.top)
      );
    }
  };

  const handleMouseMove = (event) => {
    if (!isDragging) {
      return;
    }

    const nextPosition = clampPopupPosition(
      event.clientX - offsetX,
      event.clientY - offsetY,
      popupElement
    );

    popupElement.style.left = `${nextPosition.left}px`;
    popupElement.style.top = `${nextPosition.top}px`;
  };

  const handleMouseDown = (event) => {
    if (
      event.button !== 0 ||
      popupElement.classList.contains("is-resizing") ||
      event.target.closest(".resize-handle") ||
      event.target.closest("#closeBtn") ||
      event.target.closest(".vocabai-popup__close") ||
      event.target.closest("button") ||
      event.target.closest("select")
    ) {
      return;
    }

    event.preventDefault();
    isDragging = true;
    popupElement.classList.add("is-dragging");
    offsetX = event.clientX - popupElement.getBoundingClientRect().left;
    offsetY = event.clientY - popupElement.getBoundingClientRect().top;
    document.body.style.userSelect = "none";
  };

  const stopDraggingListener = () => {
    stopDragging();
  };

  header.addEventListener("mousedown", handleMouseDown);
  document.addEventListener("mousemove", handleMouseMove, true);
  document.addEventListener("mouseup", stopDraggingListener, true);
  document.addEventListener("pointerup", stopDraggingListener, true);
  window.addEventListener("blur", stopDraggingListener);

  return () => {
    header.removeEventListener("mousedown", handleMouseDown);
    document.removeEventListener("mousemove", handleMouseMove, true);
    document.removeEventListener("mouseup", stopDraggingListener, true);
    document.removeEventListener("pointerup", stopDraggingListener, true);
    window.removeEventListener("blur", stopDraggingListener);
    document.body.style.userSelect = "auto";
  };
}

function makePopupResizable(popupElement) {
  const resizeHandle = popupElement.querySelector(".resize-handle");

  if (!resizeHandle) {
    return () => {};
  }

  let isResizing = false;
  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;
  let frameId = 0;
  let pendingWidth = 0;
  let pendingHeight = 0;

  const applyPendingResize = () => {
    frameId = 0;
    const clampedSize = applyPopupSize(popupElement, pendingWidth, pendingHeight);
    const popupRect = popupElement.getBoundingClientRect();
    const clampedPosition = clampPopupPosition(
      popupRect.left,
      popupRect.top,
      popupElement
    );

    popupElement.style.left = `${clampedPosition.left}px`;
    popupElement.style.top = `${clampedPosition.top}px`;
    pendingWidth = clampedSize.width;
    pendingHeight = clampedSize.height;
  };

  const stopResizing = () => {
    if (!isResizing) {
      return;
    }

    isResizing = false;
    popupElement.classList.remove("is-resizing");
    document.body.style.userSelect = "auto";

    if (frameId) {
      window.cancelAnimationFrame(frameId);
      applyPendingResize();
    }

    savePopupSize(
      Number.parseFloat(popupElement.style.width || popupElement.offsetWidth),
      Number.parseFloat(popupElement.style.height || popupElement.offsetHeight)
    );
    savePopupPosition(
      Number.parseFloat(popupElement.style.left || 0),
      Number.parseFloat(popupElement.style.top || 0)
    );
  };

  const handleMouseMove = (event) => {
    if (!isResizing) {
      return;
    }

    pendingWidth = startWidth + (event.clientX - startX);
    pendingHeight = startHeight + (event.clientY - startY);

    if (!frameId) {
      frameId = window.requestAnimationFrame(applyPendingResize);
    }
  };

  const handleMouseDown = (event) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    isResizing = true;
    popupElement.classList.add("is-resizing");
    startX = event.clientX;
    startY = event.clientY;
    startWidth = popupElement.offsetWidth;
    startHeight = popupElement.offsetHeight;
    pendingWidth = startWidth;
    pendingHeight = startHeight;
    document.body.style.userSelect = "none";
  };

  const stopResizingListener = () => {
    stopResizing();
  };

  resizeHandle.addEventListener("mousedown", handleMouseDown);
  document.addEventListener("mousemove", handleMouseMove, true);
  document.addEventListener("mouseup", stopResizingListener, true);
  document.addEventListener("pointerup", stopResizingListener, true);
  window.addEventListener("blur", stopResizingListener);

  return () => {
    resizeHandle.removeEventListener("mousedown", handleMouseDown);
    document.removeEventListener("mousemove", handleMouseMove, true);
    document.removeEventListener("mouseup", stopResizingListener, true);
    document.removeEventListener("pointerup", stopResizingListener, true);
    window.removeEventListener("blur", stopResizingListener);
    if (frameId) {
      window.cancelAnimationFrame(frameId);
    }
    document.body.style.userSelect = "auto";
  };
}

function consumeSelectionSuppression() {
  if (!suppressNextSelection) {
    return false;
  }

  suppressNextSelection = false;
  return true;
}

function suppressSelectionOnce() {
  suppressNextSelection = true;
}

function handleManualClose(event) {
  event.preventDefault();
  event.stopPropagation();
  suppressNextSelection = true;
  clearSelection();
  closePopup();
}

window.VocabAIExtension.popup = {
  consumeSelectionSuppression,
  currentPopupContains: (target) => Boolean(currentPopup && !currentPopup.hidden && currentPopup.contains(target)),
  destroyPopup,
  getPopupRefs,
  initializePopupHandlers,
  removePopup,
  setCloseHandler: (handler) => {
    closeHandler = typeof handler === "function" ? handler : null;
  },
  showPopup,
  suppressSelectionOnce,
  setHidden,
  setText
};
