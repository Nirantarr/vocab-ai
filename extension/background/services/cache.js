const DEFAULT_TTL_MS = 60 * 1000;

export function createCache({ ttlMs = DEFAULT_TTL_MS } = {}) {
  const values = new Map();

  function get(key) {
    const entry = values.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      values.delete(key);
      return null;
    }

    return entry.value;
  }

  function set(key, value, customTtlMs = ttlMs) {
    values.set(key, {
      value,
      expiresAt: Date.now() + customTtlMs
    });

    return value;
  }

  function remove(key) {
    values.delete(key);
  }

  function clear() {
    values.clear();
  }

  return {
    clear,
    get,
    remove,
    set
  };
}
