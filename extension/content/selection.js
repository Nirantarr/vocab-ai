window.VocabAIExtension = window.VocabAIExtension || {};

function getSelectedText() {
  return window.getSelection?.().toString().trim() || "";
}

function getSelectionRect() {
  const selection = window.getSelection?.();

  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  if (!rect || (rect.width === 0 && rect.height === 0)) {
    return null;
  }

  return rect;
}

function initializeSelectionListener({ onSelection, shouldIgnoreSelection }) {
  document.addEventListener("mouseup", (event) => {
    window.setTimeout(() => {
      if (typeof shouldIgnoreSelection === "function" && shouldIgnoreSelection(event)) {
        return;
      }

      const text = getSelectedText();
      const rect = getSelectionRect();

      if (!text || !rect) {
        onSelection(null);
        return;
      }

      onSelection({ text, rect });
    }, 0);
  });
}

window.VocabAIExtension.selection = {
  initializeSelectionListener
};
