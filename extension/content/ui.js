window.VocabAIExtension = window.VocabAIExtension || {};

const DEFAULT_TARGET_LANG = "hi";
const LONG_TEXT_THRESHOLD = 80;
const PREVIEW_LIMIT = 120;
const LANGUAGE_OPTIONS = [
  { label: "English", value: "en" },
  { label: "Hindi", value: "hi" },
  { label: "Marathi", value: "mr" },
  { label: "Spanish", value: "es" },
  { label: "French", value: "fr" },
  { label: "German", value: "de" },
  { label: "Chinese", value: "zh" },
  { label: "Arabic", value: "ar" },
  { label: "Russian", value: "ru" }
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeListText(value) {
  if (Array.isArray(value)) {
    const filteredValues = value
      .filter((item) => typeof item === "string" && item.trim())
      .map((item) => item.trim());

    if (filteredValues.length === 0) {
      return "No data available";
    }

    return filteredValues.join(", ");
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return "No data available";
}

function renderCopyButton(copyType, copyValue, copyFeedback = "") {
  const normalizedCopyValue = normalizeListText(copyValue);
  const buttonLabel = copyFeedback || "Copy";

  return `
    <button
      type="button"
      class="vocabai-popup__copy"
      data-copy-type="${escapeHtml(copyType)}"
      data-copy-value="${escapeHtml(normalizedCopyValue)}"
    >
      ${escapeHtml(buttonLabel)}
    </button>
  `;
}

function renderField(label, value, { copyType = "", copyValue = value, copyFeedback = "" } = {}) {
  const normalizedValue = normalizeListText(value);

  return `
    <div class="vocabai-popup__field">
      <div class="vocabai-popup__field-header">
        <div class="vocabai-popup__label">${escapeHtml(label)}</div>
        ${renderCopyButton(copyType, copyValue, copyFeedback)}
      </div>
      <div class="vocabai-popup__value">${escapeHtml(normalizedValue)}</div>
    </div>
  `;
}

function truncateText(value, limit = PREVIEW_LIMIT) {
  if (typeof value !== "string" || value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit).trimEnd()}...`;
}

function isSingleWordText(value) {
  return typeof value === "string" && /^\S+$/.test(value.trim());
}

function shouldShowSelectionPreview(selectedText, word) {
  if (typeof selectedText !== "string" || !selectedText.trim()) {
    return false;
  }

  if (selectedText.length > LONG_TEXT_THRESHOLD) {
    return true;
  }

  if (!isSingleWordText(selectedText)) {
    return true;
  }

  return selectedText.trim() !== String(word || "").trim();
}

function renderSelectionPreview(selectedText, word, isExpanded = false) {
  if (!shouldShowSelectionPreview(selectedText, word)) {
    return "";
  }

  const shouldToggle = selectedText.length > PREVIEW_LIMIT;
  const previewText = shouldToggle && !isExpanded
    ? truncateText(selectedText)
    : selectedText;

  return `
    <div class="vocabai-popup__field">
      <div class="vocabai-popup__label">Selected Text</div>
      <div class="vocabai-popup__value">${escapeHtml(previewText)}</div>
      ${
        shouldToggle
          ? `<button type="button" class="vocabai-popup__toggle-preview">${isExpanded ? "Show Less" : "Show More"}</button>`
          : ""
      }
    </div>
  `;
}

function getPopupTitle(word, selectedText) {
  if (shouldShowSelectionPreview(selectedText, word)) {
    return truncateText(selectedText);
  }

  return truncateText(word || "Selection");
}

function renderHeader(title, copyValue, language = "", copyFeedback = "") {
  return `
    <div class="vocabai-popup__header-main">
      <div class="vocabai-popup__title-row">
        <div class="vocabai-popup__title">${escapeHtml(title)}</div>
        ${renderCopyButton("word", copyValue, copyFeedback)}
      </div>
      ${
        language
          ? `<div class="vocabai-popup__language-badge">${escapeHtml(language)}</div>`
          : ""
      }
    </div>
  `;
}

function renderShell(
  title,
  body,
  footer = "",
  { copyValue = "", language = "", wordCopyFeedback = "" } = {}
) {
  return `
    <div class="vocabai-popup__header popup-header">
      ${renderHeader(title, copyValue, language, wordCopyFeedback)}
      <button type="button" class="vocabai-popup__close" aria-label="Close popup">x</button>
    </div>
    <div class="vocabai-popup__body">${body}</div>
    <div class="vocabai-popup__footer">${footer}</div>
    <div class="resize-handle" aria-hidden="true"></div>
  `;
}

function renderSaveSection({
  saveState = "idle",
  saveMessage = "",
  isAuthenticated = false,
  allowSave = true
} = {}) {
  if (!allowSave) {
    return "";
  }

  const isSaved = saveState === "saved";
  const isSaving = saveState === "saving";
  const buttonLabel = isAuthenticated
    ? (isSaved ? "Saved" : isSaving ? "Saving..." : "Save Word")
    : "Login to Save";

  return `
    <div class="vocabai-popup__footer-block vocabai-popup__actions">
      <button
        type="button"
        class="vocabai-popup__save"
        ${isAuthenticated && (isSaved || isSaving) ? "disabled" : ""}
      >
        ${buttonLabel}
      </button>
      ${
        saveMessage
          ? `<div class="vocabai-popup__status ${saveState === "error" ? "vocabai-popup__status--error" : ""}">${escapeHtml(saveMessage)}</div>`
          : ""
      }
    </div>
  `;
}

function renderOcrSection() {
  return `
    <div class="vocabai-popup__footer-block vocabai-popup__actions">
      <div class="vocabai-popup__ocr-actions">
        <button type="button" class="vocabai-popup__scan-image">Scan Image</button>
        <button type="button" class="vocabai-popup__paste-image">Paste Screenshot</button>
      </div>
      <div class="vocabai-popup__hint">Press Win + Shift + S, then Ctrl + V to scan text from screen.</div>
    </div>
  `;
}

function renderLanguageOptions(selectedLang = DEFAULT_TARGET_LANG) {
  return LANGUAGE_OPTIONS.map(({ label, value }) => `
    <option value="${escapeHtml(value)}" ${value === selectedLang ? "selected" : ""}>
      ${escapeHtml(label)}
    </option>
  `).join("");
}

function renderTranslateSection({
  targetLang = DEFAULT_TARGET_LANG,
  translationState = "idle",
  translationMessage = "",
  translatedText = "",
  showTranslate = true,
  copyFeedback = ""
} = {}) {
  if (!showTranslate) {
    return { body: "", footer: "" };
  }

  const isTranslating = translationState === "loading";
  const statusMessage = translationState === "error"
    ? "Translation failed"
    : translationMessage;

  return {
    body: `
      <div class="vocabai-popup__translate-results">
        ${
          translatedText
            ? renderField("Translation", translatedText, {
              copyType: "translation",
              copyFeedback
            })
            : ""
        }
        ${
          statusMessage
            ? `<div class="vocabai-popup__status ${translationState === "error" ? "vocabai-popup__status--error" : ""}">${escapeHtml(statusMessage)}</div>`
            : ""
        }
      </div>
    `,
    footer: `
      <div class="vocabai-popup__footer-block vocabai-popup__translate">
        <div class="vocabai-popup__translate-controls">
          <select class="vocabai-popup__select" aria-label="Select target language">
            ${renderLanguageOptions(targetLang)}
          </select>
          <button
            type="button"
            class="vocabai-popup__translate-button"
            ${isTranslating ? "disabled" : ""}
          >
            ${isTranslating ? "Translating..." : "Translate"}
          </button>
        </div>
      </div>
    `
  };
}

function getLoadingMarkup(word) {
  return renderShell(
    word || "Selection",
    `
      <div class="vocabai-popup__loader">
        <span class="vocabai-popup__spinner" aria-hidden="true"></span>
        <span class="vocabai-popup__status">Loading...</span>
      </div>
    `
  );
}

function getStatusMarkup(title, message, isError = false) {
  return renderShell(
    title || "Status",
    `<div class="vocabai-popup__status ${isError ? "vocabai-popup__status--error" : ""}">${escapeHtml(message)}</div>`
  );
}

function getResultMarkup({
  selectedText,
  isExpanded,
  word,
  language,
  meaning,
  synonyms,
  antonyms,
  targetLang,
  translationState,
  translationMessage,
  translatedText,
  saveState,
  saveMessage,
  isAuthenticated,
  allowSave,
  showTranslate,
  copyFeedback = {}
}) {
  const translationSection = renderTranslateSection({
    targetLang,
    translationState,
    translationMessage,
    translatedText,
    showTranslate,
    copyFeedback: copyFeedback.translation
  });

  return renderShell(
    getPopupTitle(word, selectedText),
    [
      renderSelectionPreview(selectedText, word, isExpanded),
      renderField("Meaning", meaning || "No meaning available.", {
        copyType: "meaning",
        copyValue: meaning || "",
        copyFeedback: copyFeedback.meaning
      }),
      renderField("Synonyms", synonyms, {
        copyType: "synonyms",
        copyValue: synonyms,
        copyFeedback: copyFeedback.synonyms
      }),
      renderField("Antonyms", antonyms, {
        copyType: "antonyms",
        copyValue: antonyms,
        copyFeedback: copyFeedback.antonyms
      }),
      translationSection.body
    ].join(""),
    [
      translationSection.footer,
      renderOcrSection(),
      renderSaveSection({ saveState, saveMessage, isAuthenticated, allowSave })
    ].join(""),
    {
      copyValue: selectedText || word || "Selection",
      language,
      wordCopyFeedback: copyFeedback.word
    }
  );
}

function getErrorMarkup(word) {
  return renderShell(
    word || "Selection",
    '<div class="vocabai-popup__status vocabai-popup__status--error">Failed to fetch meaning</div>'
  );
}

window.VocabAIExtension.ui = {
  DEFAULT_TARGET_LANG,
  LANGUAGE_OPTIONS,
  LONG_TEXT_THRESHOLD,
  getErrorMarkup,
  getLoadingMarkup,
  getResultMarkup,
  getStatusMarkup
};
