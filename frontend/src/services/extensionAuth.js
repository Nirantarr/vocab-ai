import { EXTENSION_ID } from '../config/env'

export async function notifyExtensionAuthSuccess(token) {
  if (typeof window === 'undefined' || !window.chrome?.runtime?.sendMessage) {
    return { success: false, skipped: true }
  }

  if (typeof token !== 'string' || !token.trim() || !EXTENSION_ID) {
    return { success: false, skipped: true }
  }

  return new Promise((resolve) => {
    try {
      window.chrome.runtime.sendMessage(
        EXTENSION_ID,
        {
          type: 'AUTH_SUCCESS',
          token: token.trim(),
        },
        (response) => {
          if (window.chrome.runtime.lastError) {
            resolve({
              success: false,
              error: window.chrome.runtime.lastError.message,
            })
            return
          }

          resolve(response || { success: false })
        }
      )
    } catch (error) {
      resolve({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to notify extension.',
      })
    }
  })
}
