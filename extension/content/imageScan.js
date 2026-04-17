window.VocabAIExtension = window.VocabAIExtension || {};

(function registerImageScan() {
  if (typeof window === "undefined" || typeof document === "undefined" || window.top !== window) {
    return;
  }

  let fileInput = null;
  let isProcessing = false;
  let isAwaitingPaste = false;

  function getOcrUtils() {
    return window.VocabAIExtension.ocr;
  }

  function getContentActions() {
    return window.VocabAIExtension.contentActions;
  }

  function ensureFileInput() {
    if (fileInput && document.body.contains(fileInput)) {
      return fileInput;
    }

    fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.hidden = true;
    fileInput.addEventListener("change", async (event) => {
      const selectedFile = event.target.files?.[0];

      if (!selectedFile) {
        return;
      }

      await processImageFile(selectedFile);
      event.target.value = "";
    });
    document.body.appendChild(fileInput);

    return fileInput;
  }

  function getClipboardImage(event) {
    const items = Array.from(event.clipboardData?.items || []);
    const imageItem = items.find((item) => item.type.startsWith("image/"));

    return imageItem ? imageItem.getAsFile() : null;
  }

  function cleanExtractedText(text) {
    return String(text || "")
      .replace(/\r?\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function handleOcrProgress(event) {
    const progress = typeof event.detail?.progress === "number" ? event.detail.progress : 0;
    getContentActions()?.showOcrLoading?.(`Processing image... ${progress}%`);
  }

  async function processImageFile(imageFile) {
    const ocrUtils = getOcrUtils();
    const contentActions = getContentActions();

    if (!ocrUtils?.extractTextFromImage || !contentActions?.analyzeTextInput) {
      console.warn("VocabAI OCR dependencies are not ready yet.");
      return;
    }

    if (isProcessing) {
      contentActions.showOcrLoading?.("Processing image...");
      return;
    }

    isProcessing = true;
    isAwaitingPaste = false;

    try {
      contentActions.showOcrLoading?.("Processing image...");
      const extractedText = await ocrUtils.extractTextFromImage(imageFile);
      const cleanedText = cleanExtractedText(extractedText);

      if (!cleanedText) {
        throw new Error("No text detected");
      }

      console.log("VocabAI OCR extracted text:", cleanedText);
      await contentActions.analyzeTextInput(cleanedText);
    } catch (error) {
      console.error("VocabAI image scan failed:", error);
      contentActions.showOcrError?.(error?.message || "OCR failed");
    } finally {
      isProcessing = false;
    }
  }

  function openImagePicker() {
    if (isProcessing) {
      getContentActions()?.showOcrLoading?.("Processing image...");
      return;
    }

    isAwaitingPaste = false;
    ensureFileInput().click();
  }

  function armPasteCapture() {
    const contentActions = getContentActions();

    if (isProcessing) {
      contentActions?.showOcrLoading?.("Processing image...");
      return;
    }

    isAwaitingPaste = true;
    document.body.focus?.();
    contentActions?.showOcrLoading?.("Press Ctrl + V to paste screenshot");
  }

  document.addEventListener("paste", async (event) => {
    const imageFile = getClipboardImage(event);

    if (!imageFile) {
      if (isAwaitingPaste) {
        getContentActions()?.showOcrError?.("No image found in clipboard");
        isAwaitingPaste = false;
      }
      return;
    }

    console.log("VocabAI processing pasted image...");
    event.preventDefault();
    await processImageFile(imageFile);
  });

  window.addEventListener("vocabai:ocr-progress", handleOcrProgress);

  ensureFileInput();

  window.VocabAIExtension.imageScan = {
    armPasteCapture,
    cleanExtractedText,
    openImagePicker,
    processImageFile
  };
})();
