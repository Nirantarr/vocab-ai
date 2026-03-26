const AUTH_ENDPOINTS = {
  login: ['http://localhost:5000/api/login', 'http://localhost:5000/login'],
  signup: ['http://localhost:5000/api/signup', 'http://localhost:5000/signup'],
}

async function parseJson(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

async function request(url, options = {}) {
  const response = await fetch(url, options)
  const data = await parseJson(response)

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

export function analyzeText(text, selectedTexts = []) {
  return request('http://localhost:5000/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, selectedTexts }),
  })
}

export function fetchWordDetail(word) {
  return request(`http://localhost:5000/api/word/${encodeURIComponent(word)}`)
}

export function saveWord(word, token) {
  return request('http://localhost:5000/api/user/save-word', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ word }),
  })
}

export function fetchUserWords(token) {
  return request('http://localhost:5000/api/user/my-words', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export function fetchUserStats(token) {
  return request('http://localhost:5000/api/user/stats', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export function markLearned(word, isLearned, token) {
  return request('http://localhost:5000/api/user/mark-learned', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ word, isLearned }),
  })
}
