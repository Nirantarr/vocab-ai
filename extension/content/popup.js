window.VocabAIExtension = window.VocabAIExtension || {};

const POPUP_ID = "vocabai-selection-popup";
const POPUP_MARGIN = 12;

let currentPopup = null;
let suppressNextSelection = false;

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
  currentPopup.addEventListener("mouseup", (event) => {
    event.stopPropagation();
  });
  currentPopup.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  document.body.appendChild(currentPopup);

  return currentPopup;
}

function positionPopup(popup, rect) {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const popupWidth = popup.offsetWidth || 300;
  const viewportWidth = document.documentElement.clientWidth;

  let left = rect.left + scrollX;
  let top = rect.bottom + scrollY + POPUP_MARGIN;

  if (left + popupWidth > scrollX + viewportWidth - POPUP_MARGIN) {
    left = scrollX + viewportWidth - popupWidth - POPUP_MARGIN;
  }

  if (left < scrollX + POPUP_MARGIN) {
    left = scrollX + POPUP_MARGIN;
  }

  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
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

function renderPopup(markup, rect, options = {}) {
  const popup = ensurePopup();
  popup.classList.toggle("wide-popup", Boolean(options.wide));
  popup.innerHTML = markup;
  bindCloseButton(popup);
  positionPopup(popup, rect);
}

function removePopup() {
  if (currentPopup) {
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
    const clampedLeft = Math.min(
      Math.max(popupRect.left, POPUP_MARGIN),
      document.documentElement.clientWidth - popupRect.width - POPUP_MARGIN
    );

    currentPopup.style.left = `${clampedLeft + window.scrollX}px`;
  });
}

function consumeSelectionSuppression() {
  if (!suppressNextSelection) {
    return false;
  }

  suppressNextSelection = false;
  return true;
}

window.VocabAIExtension.popup = {
  consumeSelectionSuppression,
  currentPopupContains: (target) => Boolean(currentPopup && currentPopup.contains(target)),
  initializePopupHandlers,
  removePopup,
  renderPopup
};
