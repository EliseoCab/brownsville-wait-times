(function () {
  var LANG_KEY = "bwt-lang";
  var THEME_KEY = "bwt-theme";

  function currentLang() {
    return document.documentElement.lang === "es" ? "es" : "en";
  }

  function applyI18n() {
    var lang = currentLang();
    document.querySelectorAll("[data-i18n-en]").forEach(function (el) {
      var text = lang === "es" ? el.getAttribute("data-i18n-es") : el.getAttribute("data-i18n-en");
      if (text) el.textContent = text;
    });
    var titleEl = document.querySelector("title[data-i18n-en]");
    if (titleEl) {
      document.title = lang === "es" ? titleEl.getAttribute("data-i18n-es") : titleEl.getAttribute("data-i18n-en");
    }
    var enBtn = document.getElementById("langEn");
    var esBtn = document.getElementById("langEs");
    if (enBtn && esBtn) {
      enBtn.classList.toggle("active", lang !== "es");
      esBtn.classList.toggle("active", lang === "es");
    }
  }

  function setLang(lang) {
    var next = lang === "es" ? "es" : "en";
    document.documentElement.lang = next;
    try { localStorage.setItem(LANG_KEY, next); } catch (_) {}
    applyI18n();
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (_) {}
    var btn = document.getElementById("themeToggle");
    if (btn) {
      btn.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
    }
  }

  function toggleTheme() {
    var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    setTheme(next);
  }

  function filterAmenities(cat, btn) {
    document.querySelectorAll(".chip").forEach(function (chip) {
      chip.classList.toggle("active", chip === btn);
      chip.setAttribute("aria-pressed", chip === btn ? "true" : "false");
    });
    var shown = 0;
    document.querySelectorAll(".poi").forEach(function (card) {
      var cats = (card.getAttribute("data-cats") || "").split(/\s+/);
      var hide = cat !== "all" && cats.indexOf(cat) === -1;
      card.hidden = hide;
      if (!hide) shown += 1;
    });
    var empty = document.getElementById("filterEmpty");
    if (empty) empty.hidden = shown > 0;
  }

  window.setLang = setLang;
  window.toggleTheme = toggleTheme;
  window.filterAmenities = filterAmenities;

  applyI18n();
})();
