const THEME_KEY = "vocabai-theme"

function getStoredTheme() {
  const storedTheme = window.localStorage.getItem(THEME_KEY)
  return storedTheme === "light" ? "light" : "dark"
}

function getToggleButtons() {
  return Array.from(document.querySelectorAll("[data-theme-toggle]"))
}

function updateToggleIcon(theme) {
  const nextTheme = theme === "light" ? "dark" : "light"
  const iconLabel = theme === "light" ? "☀" : "☾"
  const textLabel = theme === "light" ? "Sun" : "Moon"

  getToggleButtons().forEach((toggleButton) => {
    const iconElement = toggleButton.querySelector("[data-theme-icon]")
    const labelElement = toggleButton.querySelector("[data-theme-label]")

    if (iconElement) {
      iconElement.textContent = iconLabel
    } else {
      toggleButton.textContent = iconLabel
    }

    if (labelElement) {
      labelElement.textContent = textLabel
    }

    toggleButton.dataset.themeState = theme
    toggleButton.setAttribute("aria-label", `Switch to ${nextTheme} theme`)
    toggleButton.setAttribute("title", `Switch to ${nextTheme} theme`)
  })
}

function applyTheme(theme, { persist = true } = {}) {
  const nextTheme = theme === "light" ? "light" : "dark"
  document.body.classList.toggle("light-theme", nextTheme === "light")

  if (persist) {
    window.localStorage.setItem(THEME_KEY, nextTheme)
  }

  updateToggleIcon(nextTheme)
}

export function initTheme() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {}
  }

  const toggleButtons = getToggleButtons()
  const activeTheme = getStoredTheme()

  applyTheme(activeTheme, { persist: false })

  if (toggleButtons.length === 0) {
    return () => {}
  }

  const handleToggle = () => {
    const currentTheme = document.body.classList.contains("light-theme")
      ? "light"
      : "dark"
    applyTheme(currentTheme === "light" ? "dark" : "light")
  }

  const cleanupHandlers = toggleButtons.map((toggleButton) => {
    if (toggleButton.__themeCleanup) {
      toggleButton.__themeCleanup()
    }

    toggleButton.addEventListener("click", handleToggle)
    toggleButton.__themeCleanup = () => {
      toggleButton.removeEventListener("click", handleToggle)
      delete toggleButton.__themeCleanup
    }

    return toggleButton.__themeCleanup
  })

  return () => {
    cleanupHandlers.forEach((cleanup) => cleanup?.())
  }
}
