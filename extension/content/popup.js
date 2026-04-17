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
let suppressNextSelection = false;
let dragCleanup = null;
let resizeCleanup = null;

function clearSelection() {
  const selection = window.getSelection?.();

  if (selection) {
    selection.removeAllRanges();
  }
}

function ensurePopup() {
  if (currentPopup && document.body.contains(currentPopup)) {
    return currentPopup;
  }

  currentPopup = document.createElement("div");
  currentPopup.id = POPUP_ID;
  currentPopup.setAttribute("role", "dialog");
  currentPopup.setAttribute("aria-live", "polite");
  currentPopup.className = "vocabai-popup";
  currentPopup.addEventListener("mousedown", (event) => {
    event.stopPropagation();
  });
  currentPopup.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  document.body.appendChild(currentPopup);

  return currentPopup;
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
  const maxWidth = Math.max(
    MIN_POPUP_WIDTH,
    Math.floor(window.innerWidth * 0.9)
  );
  const maxHeight = Math.max(
    MIN_POPUP_HEIGHT,
    Math.floor(window.innerHeight * 0.9)
  );

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
  const fallbackHeight = popupElement.offsetHeight || 220;

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
  const popupHeight = popup.offsetHeight || 220;
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

function handleManualClose(event) {
  event.preventDefault();
  event.stopPropagation();
  suppressNextSelection = true;
  clearSelection();
  removePopup();
}

function bindCloseButton(popup) {
  const closeButton = popup.querySelector(".vocabai-popup__close");

  if (!closeButton) {
    return;
  }

  closeButton.onmousedown = handleManualClose;
  closeButton.onclick = handleManualClose;
}

function makePopupDraggable(popupElement) {
  if (!popupElement) {
    return () => {};
  }

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

  // Keeping drag state in one place ensures we always stop cleanly on mouseup,
  // even if the cursor leaves the popup while dragging.
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

  const handleMouseUp = () => {
    stopDragging();
  };

  const handlePointerUp = () => {
    stopDragging();
  };

  const handleWindowBlur = () => {
    stopDragging();
  };

  const handleMouseDown = (event) => {
    if (
      event.button !== 0 ||
      popupElement.classList.contains("is-resizing") ||
      event.target.closest(".resize-handle") ||
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

  header.addEventListener("mousedown", handleMouseDown);
  document.addEventListener("mousemove", handleMouseMove, true);
  document.addEventListener("mouseup", handleMouseUp, true);
  document.addEventListener("pointerup", handlePointerUp, true);
  window.addEventListener("blur", handleWindowBlur);

  return () => {
    header.removeEventListener("mousedown", handleMouseDown);
    document.removeEventListener("mousemove", handleMouseMove, true);
    document.removeEventListener("mouseup", handleMouseUp, true);
    document.removeEventListener("pointerup", handlePointerUp, true);
    window.removeEventListener("blur", handleWindowBlur);
    popupElement.classList.remove("is-dragging");
    document.body.style.userSelect = "auto";
    isDragging = false;
  };
}

function makePopupResizable(popupElement) {
  if (!popupElement) {
    return () => {};
  }

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

    if (popupElement.style.width && popupElement.style.height) {
      savePopupSize(
        Number.parseFloat(popupElement.style.width),
        Number.parseFloat(popupElement.style.height)
      );
    }

    if (popupElement.style.left && popupElement.style.top) {
      savePopupPosition(
        Number.parseFloat(popupElement.style.left),
        Number.parseFloat(popupElement.style.top)
      );
    }
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

  const handleMouseUp = () => {
    stopResizing();
  };

  const handlePointerUp = () => {
    stopResizing();
  };

  const handleWindowBlur = () => {
    stopResizing();
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

  resizeHandle.addEventListener("mousedown", handleMouseDown);
  document.addEventListener("mousemove", handleMouseMove, true);
  document.addEventListener("mouseup", handleMouseUp, true);
  document.addEventListener("pointerup", handlePointerUp, true);
  window.addEventListener("blur", handleWindowBlur);

  return () => {
    resizeHandle.removeEventListener("mousedown", handleMouseDown);
    document.removeEventListener("mousemove", handleMouseMove, true);
    document.removeEventListener("mouseup", handleMouseUp, true);
    document.removeEventListener("pointerup", handlePointerUp, true);
    window.removeEventListener("blur", handleWindowBlur);
    if (frameId) {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
    }
    popupElement.classList.remove("is-resizing");
    document.body.style.userSelect = "auto";
    isResizing = false;
  };
}

function renderPopup(markup, rect, options = {}) {
  const popup = ensurePopup();
  popup.classList.toggle("wide-popup", Boolean(options.wide));
  popup.innerHTML = markup;
  loadPopupSizeIntoElement(popup);
  bindCloseButton(popup);
  positionPopup(popup, rect, { preservePosition: Boolean(options.preservePosition) });

  if (typeof dragCleanup === "function") {
    dragCleanup();
  }

  if (typeof resizeCleanup === "function") {
    resizeCleanup();
  }

  dragCleanup = makePopupDraggable(popup);
  resizeCleanup = makePopupResizable(popup);
}

function removePopup() {
  if (currentPopup) {
    if (typeof dragCleanup === "function") {
      dragCleanup();
      dragCleanup = null;
    }

    if (typeof resizeCleanup === "function") {
      resizeCleanup();
      resizeCleanup = null;
    }

    currentPopup.remove();
    currentPopup = null;
  }
}

function initializePopupHandlers() {
  window.addEventListener("resize", () => {
    if (!currentPopup) {
      return;
    }

    const popupRect = currentPopup.getBoundingClientRect();
    const clampedSize = applyPopupSize(
      currentPopup,
      popupRect.width,
      popupRect.height
    );
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

window.VocabAIExtension.popup = {
  consumeSelectionSuppression,
  currentPopupContains: (target) => Boolean(currentPopup && currentPopup.contains(target)),
  initializePopupHandlers,
  loadPopupSize: loadPopupSizeIntoElement,
  makePopupDraggable,
  makePopupResizable,
  removePopup,
  renderPopup,
  suppressSelectionOnce
};
