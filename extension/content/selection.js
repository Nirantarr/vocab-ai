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

function initializeSelectionListener({
  onSelection,
  shouldIgnoreSelection,
  debounceMs = 0
}) {
  let debounceTimerId = null;

  document.addEventListener("mouseup", (event) => {
    window.setTimeout(() => {
      if (typeof shouldIgnoreSelection === "function" && shouldIgnoreSelection(event)) {
        return;
      }

      const text = getSelectedText();
      const rect = getSelectionRect();

      const emitSelection = () => {
        if (!text || !rect) {
          onSelection(null);
          return;
        }

        onSelection({ text, rect });
      };

      if (debounceTimerId) {
        window.clearTimeout(debounceTimerId);
      }

      if (debounceMs > 0) {
        debounceTimerId = window.setTimeout(() => {
          debounceTimerId = null;
          emitSelection();
        }, debounceMs);
        return;
      }

      emitSelection();
    }, 0);
  });
}

window.VocabAIExtension.selection = {
  initializeSelectionListener
};
