function requireViteEnv(name) {
  const value = import.meta.env[name];

  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing required Vite environment variable "${name}".`);
  }

  return value.trim();
}

function normalizeUrl(value, variableName) {
  try {
    return new URL(value).toString().replace(/\/+$/, '');
  } catch (_error) {
    throw new Error(`Invalid ${variableName} value "${value}". Expected an absolute URL.`);
  }
}

export const API_BASE_URL = normalizeUrl(requireViteEnv('VITE_API_BASE_URL'), 'VITE_API_BASE_URL')
export const AUTH_BASE_URL = `${API_BASE_URL}/api/auth`
export const EXTENSION_ID = import.meta.env.VITE_EXTENSION_ID?.trim() || ''
