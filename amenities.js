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
    var lightbox = document.createElement("dialog");
    lightbox.className = "photo-lightbox";
    lightbox.setAttribute("closedby", "any");
    lightbox.setAttribute("aria-label", currentLang() === "es" ? "Foto ampliada" : "Expanded photo");
    lightbox.innerHTML =
      '<form method="dialog">' +
        '<button type="submit" value="close" class="photo-lightbox-close" aria-label="Close">×</button>' +
      "</form>" +
      '<img alt="" />';
    document.body.appendChild(lightbox);
    var lightImg = lightbox.querySelector("img");

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
      lightbox.setAttribute(
        "aria-label",
        currentLang() === "es" ? "Foto ampliada" : "Expanded photo"
      );
      if (typeof lightbox.showModal === "function") {
        if (!lightbox.open) lightbox.showModal();
      }
    }

    function closeLightbox() {
      if (lightbox.open && typeof lightbox.close === "function") lightbox.close();
    }

    lightbox.addEventListener("close", function () {
      lightImg.removeAttribute("src");
      lightImg.alt = "";
    });

    lightImg.addEventListener("click", function () {
      closeLightbox();
    });

    // closedby is not Baseline widely available (Safari). Light-dismiss fallback.
    if (!("closedBy" in HTMLDialogElement.prototype)) {
      lightbox.addEventListener("click", function (event) {
        if (event.target !== lightbox) return;
        var rect = lightbox.getBoundingClientRect();
        var isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (isDialogContent) return;
        closeLightbox();
      });
    }

    document.querySelectorAll(".poi-photo").forEach(function (photo) {
      var img = photo.querySelector("img");
      if (!img) return;
      photo.setAttribute("tabindex", "0");
      photo.setAttribute("role", "button");
      photo.setAttribute(
        "aria-label",
        document.documentElement.lang === "es" ? "Ampliar foto" : "Expand photo"
      );

      photo.addEventListener("click", function (e) {
        if (e.target && e.target.closest && e.target.closest("a")) return;
        e.preventDefault();
        if (lightbox.open) closeLightbox();
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

  function isAppleMobile() {
    var ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod/i.test(ua)) return true;
    // iPadOS desktop UA
    return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  }

  /** Prefer Apple Maps on iPhone/iPad; keep Google Maps elsewhere. */
  function preferNativeMapsLinks() {
    if (!isAppleMobile()) return;
    document.querySelectorAll("a.maps[href]").forEach(function (a) {
      var href = a.getAttribute("href") || "";
      if (!/google\.com\/maps|maps\.google\.com/i.test(href)) return;
      try {
        var u = new URL(href, location.href);
        var q = u.searchParams.get("query") || u.searchParams.get("q");
        if (!q) return;
        a.setAttribute("href", "https://maps.apple.com/?q=" + encodeURIComponent(q));
        a.setAttribute("data-maps-provider", "apple");
      } catch (_) { /* keep Google href */ }
    });
  }

  window.setLang = setLang;
  window.toggleTheme = toggleTheme;
  window.filterAmenities = filterAmenities;

  applyI18n();
  setupPhotoExpand();
  preferNativeMapsLinks();
})();
