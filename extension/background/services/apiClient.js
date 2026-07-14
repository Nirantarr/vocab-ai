const DEFAULT_TIMEOUT_MS = 8000;

async function parseJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function createTimedAbortSignal(timeoutMs = DEFAULT_TIMEOUT_MS, externalSignal) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    controller.abort(new DOMException("Request timed out.", "AbortError"));
  }, timeoutMs);

  const abortFromExternal = () => {
    controller.abort(new DOMException("Request aborted.", "AbortError"));
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      abortFromExternal();
    } else {
      externalSignal.addEventListener("abort", abortFromExternal, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      globalThis.clearTimeout(timeoutId);

      if (externalSignal) {
        externalSignal.removeEventListener("abort", abortFromExternal);
      }
    }
  };
}

export function createApiClient({
  authEndpoints,
  logger
}) {
  async function withTimeout(task, { signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    const timedSignal = createTimedAbortSignal(timeoutMs, signal);

    try {
      return await task(timedSignal.signal);
    } finally {
      timedSignal.cleanup();
    }
  }

  async function refreshSession(options = {}) {
    const response = await fetch(authEndpoints.refresh, {
      method: "POST",
      credentials: "include",
      signal: options.signal
    });

    if (!response.ok) {
      throw new Error("Session expired. Please log in again.");
    }

    return parseJson(response);
  }

  async function request(url, options = {}, requestOptions = {}) {
    const {
      retryOnAuthFailure = true,
      timeoutMs = DEFAULT_TIMEOUT_MS,
      signal
    } = requestOptions;

    return withTimeout(async (timedSignal) => {
      logger?.debug("background_request_start", {
        retryOnAuthFailure,
        url
      });

      const response = await fetch(url, {
        credentials: "include",
        ...options,
        signal: timedSignal
      });
      const data = await parseJson(response);

      if (response.status === 401 && retryOnAuthFailure) {
        await refreshSession({ signal: timedSignal });
        return request(url, options, {
          retryOnAuthFailure: false,
          timeoutMs,
          signal: timedSignal
        });
      }

      if (!response.ok) {
        throw new Error(data?.message || "Request failed");
      }

      logger?.debug("background_request_success", { url });
      return data;
    }, { signal, timeoutMs });
  }

  return {
    refreshSession,
    request
  };
}
