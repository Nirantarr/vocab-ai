(function applyInitialTheme() {
  const THEME_KEY = "vocabai-theme";
  const storedTheme = window.localStorage.getItem(THEME_KEY);
  const theme = storedTheme === "light" ? "light" : "dark";

  if (theme === "light") {
    document.body.classList.add("light-theme");
  } else {
    document.body.classList.remove("light-theme");
  }
})();
