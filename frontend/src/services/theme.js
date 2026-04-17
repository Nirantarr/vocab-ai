const THEME_KEY = "vocabai-theme";

function getStoredTheme() {
  const storedTheme = window.localStorage.getItem(THEME_KEY);
  return storedTheme === "light" ? "light" : "dark";
}

function updateToggleIcon(theme) {
  const toggleButton = document.getElementById("themeToggle");

  if (!toggleButton) {
    return;
  }

  toggleButton.textContent = theme === "light" ? "☀️" : "🌙";
  toggleButton.setAttribute(
    "aria-label",
    `Switch to ${theme === "light" ? "dark" : "light"} theme`
  );
}

function applyTheme(theme, { persist = true } = {}) {
  const nextTheme = theme === "light" ? "light" : "dark";
  document.body.classList.toggle("light-theme", nextTheme === "light");

  if (persist) {
    window.localStorage.setItem(THEME_KEY, nextTheme);
  }

  updateToggleIcon(nextTheme);
}

export function initTheme() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  const toggleButton = document.getElementById("themeToggle");
  const activeTheme = getStoredTheme();

  applyTheme(activeTheme, { persist: false });

  if (!toggleButton) {
    return () => {};
  }

  if (toggleButton.__themeCleanup) {
    toggleButton.__themeCleanup();
  }

  const handleToggle = () => {
    const currentTheme = document.body.classList.contains("light-theme")
      ? "light"
      : "dark";
    applyTheme(currentTheme === "light" ? "dark" : "light");
  };

  toggleButton.addEventListener("click", handleToggle);
  toggleButton.__themeCleanup = () => {
    toggleButton.removeEventListener("click", handleToggle);
    delete toggleButton.__themeCleanup;
  };

  return toggleButton.__themeCleanup;
}
