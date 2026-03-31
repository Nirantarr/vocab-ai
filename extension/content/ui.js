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

function renderField(label, value) {
  return `
    <div class="vocabai-popup__field">
      <div class="vocabai-popup__label">${escapeHtml(label)}</div>
      <div class="vocabai-popup__value">${escapeHtml(value)}</div>
    </div>
  `;
}

function truncateText(value, limit = PREVIEW_LIMIT) {
  if (typeof value !== "string" || value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit).trimEnd()}...`;
}

function renderSelectionPreview(selectedText, isExpanded = false) {
  if (typeof selectedText !== "string" || selectedText.length <= LONG_TEXT_THRESHOLD) {
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

function renderShell(title, body) {
  return `
    <div class="vocabai-popup__header">
      <div class="vocabai-popup__title">${escapeHtml(title)}</div>
      <button type="button" class="vocabai-popup__close" aria-label="Close popup">x</button>
    </div>
    <div class="vocabai-popup__body">${body}</div>
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
    <div class="vocabai-popup__actions">
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
  showTranslate = true
} = {}) {
  if (!showTranslate) {
    return "";
  }

  const isTranslating = translationState === "loading";
  const statusMessage = translationState === "error"
    ? "Translation failed"
    : translationMessage;

  return `
    <div class="vocabai-popup__translate">
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
      ${
        translatedText
          ? renderField("Translation", translatedText)
          : ""
      }
      ${
        statusMessage
          ? `<div class="vocabai-popup__status ${translationState === "error" ? "vocabai-popup__status--error" : ""}">${escapeHtml(statusMessage)}</div>`
          : ""
      }
    </div>
  `;
}

function getLoadingMarkup(word) {
  return renderShell(
    word || "Selection",
    '<div class="vocabai-popup__status">Loading...</div>'
  );
}

function getResultMarkup({
  selectedText,
  isExpanded,
  word,
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
  showTranslate
}) {
  return renderShell(
    truncateText(word || "Selection"),
    [
      renderSelectionPreview(selectedText, isExpanded),
      renderField("Meaning", meaning || "No meaning available."),
      renderField(
        "Synonyms",
        Array.isArray(synonyms) && synonyms.length > 0 ? synonyms.join(", ") : "None"
      ),
      renderField(
        "Antonyms",
        Array.isArray(antonyms) && antonyms.length > 0 ? antonyms.join(", ") : "None"
      ),
      renderTranslateSection({
        targetLang,
        translationState,
        translationMessage,
        translatedText,
        showTranslate
      }),
      renderSaveSection({ saveState, saveMessage, isAuthenticated, allowSave })
    ].join("")
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
  getResultMarkup
};
