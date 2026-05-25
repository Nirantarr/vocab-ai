const API_BASE_URL = 'http://localhost:5000'
const AUTH_BASE_URL = `${API_BASE_URL}/api/auth`
const AUTH_EXPIRED_EVENT = 'vocabai:auth-expired'

const AUTH_ENDPOINTS = {
  login: [`${AUTH_BASE_URL}/login`, `${API_BASE_URL}/login`],
  signup: [`${AUTH_BASE_URL}/signup`, `${API_BASE_URL}/signup`],
}

async function parseJson(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

async function refreshSession() {
  const response = await fetch(`${AUTH_BASE_URL}/refresh`, {
    method: 'POST',
    credentials: 'include',
  })

  if (!response.ok) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))
    }

    throw new Error('Session expired. Please log in again.')
  }

  return parseJson(response)
}

async function request(url, options = {}, { retryOnAuthFailure = true } = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
  })
  const data = await parseJson(response)

  if (response.status === 401 && retryOnAuthFailure) {
    await refreshSession()
    return request(url, options, { retryOnAuthFailure: false })
  }

  if (!response.ok) {
    throw new Error(data.message || 'Request failed.')
  }

  return data
}

export async function requestAuth(endpoint, payload) {
  let lastError = new Error('Unable to complete authentication request.')

  for (const url of AUTH_ENDPOINTS[endpoint]) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const data = await parseJson(response)

      if (response.status === 404) {
        continue
      }

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed.')
      }

      return data
    } catch (error) {
      lastError = error
    }
  }

  throw lastError
}

export function fetchSession() {
  return request(`${AUTH_BASE_URL}/session`)
}

export function logoutSession() {
  return request(`${AUTH_BASE_URL}/logout`, {
    method: 'POST',
  }, { retryOnAuthFailure: false })
}

export function analyzeText(text, selectedTexts = []) {
  return request(`${API_BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, selectedTexts }),
  }, { retryOnAuthFailure: false })
}

export function fetchWordDetail(word) {
  return request(`${API_BASE_URL}/api/word/${encodeURIComponent(word)}`, {}, { retryOnAuthFailure: false })
}

export function saveWord(word) {
  return request(`${API_BASE_URL}/api/user/save-word`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ word }),
  })
}

export function fetchUserWords() {
  return request(`${API_BASE_URL}/api/user/my-words`)
}

export function fetchUserStats() {
  return request(`${API_BASE_URL}/api/user/stats`)
}

export function markLearned(word, isLearned) {
  return request(`${API_BASE_URL}/api/user/mark-learned`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ word, isLearned }),
  })
}

export function fetchQuiz(limit) {
  return request(`${API_BASE_URL}/api/test?limit=${encodeURIComponent(limit)}`)
}

export { AUTH_EXPIRED_EVENT }
