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

  function setupPhotoExpand() {
    document.querySelectorAll(".poi-photo").forEach(function (photo) {
      var img = photo.querySelector("img");
      if (!img) return;
      photo.setAttribute("tabindex", "0");
      photo.setAttribute("role", "button");
      var labelEn = "Expand Starbase photo";
      var labelEs = "Ampliar foto de Starbase";
      photo.setAttribute("aria-label", document.documentElement.lang === "es" ? labelEs : labelEn);
      photo.setAttribute("aria-expanded", "false");

      function toggle() {
        var on = photo.classList.toggle("is-expanded");
        var card = photo.closest(".poi-has-photo");
        if (card) card.classList.toggle("is-photo-expanded", on);
        photo.setAttribute("aria-expanded", on ? "true" : "false");
      }

      photo.addEventListener("click", function (e) {
        // Avoid hijacking caption links
        if (e.target && e.target.closest && e.target.closest("a")) return;
        toggle();
      });
      photo.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
        if (e.key === "Escape" && photo.classList.contains("is-expanded")) {
          photo.classList.remove("is-expanded");
          var card = photo.closest(".poi-has-photo");
          if (card) card.classList.remove("is-photo-expanded");
          photo.setAttribute("aria-expanded", "false");
        }
      });
    });

    document.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest(".poi-photo")) return;
      document.querySelectorAll(".poi-photo.is-expanded").forEach(function (photo) {
        photo.classList.remove("is-expanded");
        photo.setAttribute("aria-expanded", "false");
        var card = photo.closest(".poi-has-photo");
        if (card) card.classList.remove("is-photo-expanded");
      });
    });
  }

  window.setLang = setLang;
  window.toggleTheme = toggleTheme;
  window.filterAmenities = filterAmenities;

  applyI18n();
  setupPhotoExpand();
})();
