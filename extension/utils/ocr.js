window.VocabAIExtension = window.VocabAIExtension || {};

(function registerOcrUtils() {
  const OCR_FRAME_ID = "vocabai-ocr-frame";
  const OCR_TIMEOUT_MS = 120000;
  let framePromise = null;
  let requestCounter = 0;
  let activeRequestId = null;

  function getRuntimeApi() {
    const chromeRuntime = globalThis.chrome?.runtime;
    const browserRuntime = globalThis.browser?.runtime;

    if (chromeRuntime?.id || typeof chromeRuntime?.getURL === "function") {
      return chromeRuntime;
    }

    if (browserRuntime?.id || typeof browserRuntime?.getURL === "function") {
      return browserRuntime;
    }

    return null;
  }

  function getExtensionPageUrl(path) {
    const runtime = getRuntimeApi();

    if (!runtime) {
      return "";
    }

    if (typeof runtime.getURL === "function") {
      return runtime.getURL(path);
    }

    if (typeof runtime.id === "string" && runtime.id) {
      return `chrome-extension://${runtime.id}/${path.replace(/^\/+/, "")}`;
    }

    return "";
  }

  function cleanExtractedText(text) {
    return String(text || "")
      .replace(/\r?\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function readBlobAsDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read image for OCR."));
      reader.readAsDataURL(blob);
    });
  }

  function ensureOcrFrame() {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return Promise.reject(new Error("OCR is unavailable in this environment."));
    }

    if (framePromise) {
      return framePromise;
    }

    framePromise = new Promise((resolve, reject) => {
      const existingFrame = document.getElementById(OCR_FRAME_ID);

      if (existingFrame instanceof HTMLIFrameElement) {
        resolve(existingFrame);
        return;
      }

      const iframeUrl = getExtensionPageUrl("sandbox/ocr.html");

      if (!iframeUrl) {
        reject(new Error("OCR failed on this page. Try another page or reload."));
        return;
      }

      const iframe = document.createElement("iframe");
      iframe.id = OCR_FRAME_ID;
      iframe.hidden = true;
      iframe.src = iframeUrl;
      iframe.onload = () => resolve(iframe);
      iframe.onerror = () => reject(new Error("Failed to load OCR sandbox."));
      document.documentElement.appendChild(iframe);
    }).catch((error) => {
      framePromise = null;
      throw error;
    });

    return framePromise;
  }

  async function extractTextFromImage(imageFile) {
    if (!(imageFile instanceof Blob)) {
      throw new Error("A valid image file is required for OCR.");
    }

    if (activeRequestId) {
      throw new Error("OCR is already in progress.");
    }

    const iframe = await ensureOcrFrame();
    const imageDataUrl = await readBlobAsDataUrl(imageFile);
    const requestId = `ocr-${Date.now()}-${requestCounter++}`;
    activeRequestId = requestId;

    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        cleanup();
        activeRequestId = null;
        reject(new Error("OCR request timed out."));
      }, OCR_TIMEOUT_MS);

      const handleMessage = (event) => {
        if (event.source !== iframe.contentWindow) {
          return;
        }

        const message = event.data;

        if (!message || message.id !== requestId) {
          return;
        }

        if (message.type === "OCR_PROGRESS") {
          window.dispatchEvent(
            new CustomEvent("vocabai:ocr-progress", {
              detail: {
                id: requestId,
                progress: message.progress,
                status: message.status || ""
              }
            })
          );
          return;
        }

        if (message.type !== "OCR_RESULT") {
          return;
        }

        cleanup();
        activeRequestId = null;

        if (!message.success) {
          reject(new Error(message.error || "OCR failed."));
          return;
        }

        const extractedText = cleanExtractedText(message.text);

        if (!extractedText) {
          reject(new Error("No text could be extracted from the image."));
          return;
        }

        resolve(extractedText);
      };

      function cleanup() {
        window.clearTimeout(timeoutId);
        window.removeEventListener("message", handleMessage);
      }

      window.addEventListener("message", handleMessage);
      iframe.contentWindow?.postMessage(
        {
          type: "OCR_EXTRACT",
          id: requestId,
          imageDataUrl
        },
        "*"
      );
    });
  }

  window.VocabAIExtension.ocr = {
    extractTextFromImage
  };
})();
