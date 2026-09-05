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
    var lightbox = document.createElement("div");
    lightbox.className = "photo-lightbox";
    lightbox.setAttribute("hidden", "");
    lightbox.innerHTML =
      '<button type="button" class="photo-lightbox-close" aria-label="Close">×</button>' +
      '<img alt="" />';
    document.body.appendChild(lightbox);
    var lightImg = lightbox.querySelector("img");
    var closeBtn = lightbox.querySelector(".photo-lightbox-close");
    var hoverTimer = null;
    var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    function fullSrc(thumb) {
      var raw = thumb.getAttribute("data-full-src") || thumb.getAttribute("src") || "";
      try {
        return new URL(raw, document.baseURI).href;
      } catch (e) {
        return raw;
      }
    }

    function openLightbox(thumb) {
      var src = fullSrc(thumb);
      if (!src) return;
      lightImg.src = src;
      lightImg.alt = thumb.getAttribute("alt") || "";
      lightbox.removeAttribute("hidden");
      // Force reflow so opacity transition runs even on stubborn mobile WebKits
      void lightbox.offsetWidth;
      lightbox.classList.add("is-open");
      document.documentElement.style.overflow = "hidden";
    }

    function closeLightbox() {
      lightbox.classList.remove("is-open");
      document.documentElement.style.overflow = "";
      setTimeout(function () {
        if (!lightbox.classList.contains("is-open")) {
          lightbox.setAttribute("hidden", "");
          lightImg.removeAttribute("src");
        }
      }, 200);
    }

    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox || e.target === lightImg || e.target === closeBtn) {
        closeLightbox();
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && lightbox.classList.contains("is-open")) closeLightbox();
    });

    document.querySelectorAll(".poi-photo").forEach(function (photo) {
      var img = photo.querySelector("img");
      if (!img) return;
      photo.setAttribute("tabindex", "0");
      photo.setAttribute("role", "button");
      photo.setAttribute(
        "aria-label",
        document.documentElement.lang === "es" ? "Ampliar foto de Starbase" : "Expand Starbase photo"
      );

      if (finePointer) {
        photo.addEventListener("mouseenter", function () {
          clearTimeout(hoverTimer);
          hoverTimer = setTimeout(function () {
            openLightbox(img);
          }, 150);
        });
        photo.addEventListener("mouseleave", function () {
          clearTimeout(hoverTimer);
        });
      }

      photo.addEventListener("click", function (e) {
        if (e.target && e.target.closest && e.target.closest("a")) return;
        e.preventDefault();
        if (lightbox.classList.contains("is-open")) closeLightbox();
        else openLightbox(img);
      });
      photo.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openLightbox(img);
        }
      });
    });

  }

  window.setLang = setLang;
  window.toggleTheme = toggleTheme;
  window.filterAmenities = filterAmenities;

  applyI18n();
  setupPhotoExpand();
})();
