const FALLBACK_EXTENSION_ID = 'kkofmigllhfkhonhjcdonpnfmcmjbbgp'

function getExtensionId() {
  const envExtensionId = import.meta.env.VITE_EXTENSION_ID

  if (typeof envExtensionId === 'string' && envExtensionId.trim()) {
    return envExtensionId.trim()
  }

  return FALLBACK_EXTENSION_ID
}

export async function notifyExtensionAuthSuccess(token) {
  if (typeof window === 'undefined' || !window.chrome?.runtime?.sendMessage) {
    return { success: false, skipped: true }
  }

  if (typeof token !== 'string' || !token.trim()) {
    return { success: false, skipped: true }
  }

  const extensionId = getExtensionId()

  return new Promise((resolve) => {
    try {
      window.chrome.runtime.sendMessage(
        extensionId,
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
