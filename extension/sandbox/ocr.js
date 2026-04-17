(function registerSandboxOcr() {
  const TESSERACT_WORKER_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js";
  const TESSERACT_CORE_URL = "https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js";
  const TESSERACT_LANG_PATH = "https://tessdata.projectnaptha.com/4.0.0";
  const MAX_IMAGE_WIDTH = 1000;
  let workerPromise = null;
  let isProcessing = false;
  let activeRequestId = "";
  let activeSource = null;

  async function getWorker() {
    if (workerPromise) {
      return workerPromise;
    }

    workerPromise = (async () => {
      if (!window.Tesseract?.createWorker) {
        throw new Error("Tesseract.js is unavailable in the OCR sandbox.");
      }

      return window.Tesseract.createWorker("eng", 1, {
        workerPath: TESSERACT_WORKER_URL,
        corePath: TESSERACT_CORE_URL,
        langPath: TESSERACT_LANG_PATH,
        logger: (message) => {
          console.log("VocabAI OCR progress:", message);
          if (activeRequestId && activeSource) {
            postProgress(activeSource, activeRequestId, message);
          }
        }
      });
    })().catch((error) => {
      workerPromise = null;
      throw error;
    });

    return workerPromise;
  }

  function readImageDimensions(imageDataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to load image for OCR."));
      image.src = imageDataUrl;
    });
  }

  async function resizeImageIfNeeded(imageDataUrl) {
    const image = await readImageDimensions(imageDataUrl);

    if (image.width <= MAX_IMAGE_WIDTH) {
      return imageDataUrl;
    }

    const scale = MAX_IMAGE_WIDTH / image.width;
    const canvas = document.createElement("canvas");
    canvas.width = MAX_IMAGE_WIDTH;
    canvas.height = Math.round(image.height * scale);

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Failed to prepare image for OCR.");
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/png");
  }

  function normalizeProgress(message) {
    const rawProgress = typeof message?.progress === "number" ? message.progress : 0;
    return Math.max(0, Math.min(100, Math.round(rawProgress * 100)));
  }

  function postProgress(targetWindow, requestId, message) {
    targetWindow?.postMessage(
      {
        type: "OCR_PROGRESS",
        id: requestId,
        progress: normalizeProgress(message),
        status: typeof message?.status === "string" ? message.status : ""
      },
      "*"
    );
  }

  window.addEventListener("message", async (event) => {
    const message = event.data;

    if (!message || message.type !== "OCR_EXTRACT" || typeof message.id !== "string") {
      return;
    }

    if (isProcessing) {
      event.source?.postMessage(
        {
          type: "OCR_RESULT",
          id: message.id,
          success: false,
          error: "OCR is already in progress."
        },
        "*"
      );
      return;
    }

    isProcessing = true;
    activeRequestId = message.id;
    activeSource = event.source;

    try {
      const worker = await getWorker();
      const resizedImageDataUrl = await resizeImageIfNeeded(message.imageDataUrl);
      postProgress(event.source, message.id, { progress: 0, status: "preparing image" });
      const result = await worker.recognize(resizedImageDataUrl);
      const extractedText = String(result?.data?.text || "");

      event.source?.postMessage(
        {
          type: "OCR_RESULT",
          id: message.id,
          success: true,
          text: extractedText
        },
        "*"
      );
    } catch (error) {
      event.source?.postMessage(
        {
          type: "OCR_RESULT",
          id: message.id,
          success: false,
          error: error instanceof Error ? error.message : "OCR failed."
        },
        "*"
      );
    } finally {
      isProcessing = false;
      activeRequestId = "";
      activeSource = null;
    }
  });
})();
