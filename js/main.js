(() => {
  const { supported, defaultLang, strings } = window.I18N;
  const STORAGE_KEY = "emirttac-lang";
  const THEME_KEY = "emirttac-theme";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav");
  const langSelect = document.getElementById("lang-select");
  const themeToggle = document.getElementById("theme-toggle");
  const themeColorMeta = document.getElementById("theme-color-meta");

  const normalizeLang = (value) => {
    if (!value) return null;
    const lower = String(value).toLowerCase().replace("_", "-");
    if (supported.includes(lower)) return lower;
    const base = lower.split("-")[0];
    if (base === "zh") return "zh";
    if (supported.includes(base)) return base;
    return null;
  };

  const detectLang = () => {
    const saved = normalizeLang(localStorage.getItem(STORAGE_KEY));
    if (saved) return saved;

    const candidates = [
      ...(navigator.languages || []),
      navigator.language,
      navigator.userLanguage,
    ].filter(Boolean);

    for (const candidate of candidates) {
      const match = normalizeLang(candidate);
      if (match) return match;
    }

    return defaultLang;
  };

  const t = (lang, key) =>
    (strings[lang] && strings[lang][key]) ||
    (strings[defaultLang] && strings[defaultLang][key]) ||
    key;

  const applyLanguage = (lang) => {
    const active = supported.includes(lang) ? lang : defaultLang;
    document.documentElement.lang = active === "zh" ? "zh-CN" : active;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const value = t(active, key);
      if (el.tagName === "META") {
        el.setAttribute("content", value);
      } else {
        el.textContent = value;
      }
    });

    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      const key = el.getAttribute("data-i18n-aria");
      el.setAttribute("aria-label", t(active, key));
    });

    if (toggle) {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute(
        "aria-label",
        t(active, open ? "aria.menuClose" : "aria.menuOpen")
      );
    }

    syncThemeLabel(active);

    if (langSelect && langSelect.value !== active) {
      langSelect.value = active;
    }

    localStorage.setItem(STORAGE_KEY, active);
  };

  const getTheme = () =>
    document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";

  const syncThemeLabel = (lang) => {
    if (!themeToggle) return;
    const active = lang || normalizeLang(localStorage.getItem(STORAGE_KEY)) || defaultLang;
    const dark = getTheme() === "dark";
    themeToggle.setAttribute(
      "aria-label",
      t(active, dark ? "aria.themeToLight" : "aria.themeToDark")
    );
  };

  const applyTheme = (theme) => {
    const next = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(THEME_KEY, next);
    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", next === "dark" ? "#0A1220" : "#E6EBF2");
    }
    syncThemeLabel();
  };

  applyTheme(getTheme());

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      applyTheme(getTheme() === "dark" ? "light" : "dark");
    });
  }

  const initialLang = detectLang();
  applyLanguage(initialLang);

  if (langSelect) {
    langSelect.addEventListener("change", () => {
      applyLanguage(langSelect.value);
    });
  }

  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      const next = !open;
      toggle.setAttribute("aria-expanded", String(next));
      nav.classList.toggle("is-open", next);
      const lang = normalizeLang(localStorage.getItem(STORAGE_KEY)) || defaultLang;
      toggle.setAttribute(
        "aria-label",
        t(lang, next ? "aria.menuClose" : "aria.menuOpen")
      );
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        toggle.setAttribute("aria-expanded", "false");
        nav.classList.remove("is-open");
        const lang = normalizeLang(localStorage.getItem(STORAGE_KEY)) || defaultLang;
        toggle.setAttribute("aria-label", t(lang, "aria.menuOpen"));
      });
    });
  }

  const projects = Array.from(document.querySelectorAll(".project"));
  const ACCORDION_MS = 500;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  const stopPanelAnimation = (panel) => {
    if (panel._accordionTimer) {
      window.clearInterval(panel._accordionTimer);
      panel._accordionTimer = null;
    }
  };

  const tweenPanel = (panel, fromMax, toMax, fromOpacity, toOpacity, onDone) => {
    stopPanelAnimation(panel);
    panel.style.transition = "none";
    const start = Date.now();

    panel._accordionTimer = window.setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / ACCORDION_MS);
      const e = easeOut(t);
      const maxHeight = fromMax + (toMax - fromMax) * e;
      const opacity = fromOpacity + (toOpacity - fromOpacity) * e;
      panel.style.maxHeight = `${Math.max(0, maxHeight)}px`;
      panel.style.opacity = String(opacity);

      if (t >= 1) {
        stopPanelAnimation(panel);
        onDone();
      }
    }, 16);
  };

  const setPanelInert = (panel, inert) => {
    if ("inert" in HTMLElement.prototype) {
      panel.inert = inert;
    }
    panel.querySelectorAll("a, button").forEach((el) => {
      if (inert) el.setAttribute("tabindex", "-1");
      else el.removeAttribute("tabindex");
    });
  };

  const setPanelOpenState = (project, panel, trigger, open) => {
    project.classList.toggle("is-open", open);
    panel.classList.toggle("is-open", open);
    trigger.setAttribute("aria-expanded", String(open));
    panel.setAttribute("aria-hidden", String(!open));
    setPanelInert(panel, !open);
  };

  const closeProject = (project) => {
    const trigger = project.querySelector(".project-trigger");
    const panel = project.querySelector(".project-panel");
    if (!trigger || !panel || !project.classList.contains("is-open")) return;

    const from = Math.max(panel.scrollHeight, panel.getBoundingClientRect().height);
    setPanelOpenState(project, panel, trigger, false);
    panel.style.pointerEvents = "none";

    tweenPanel(panel, from, 0, 1, 0, () => {
      panel.style.maxHeight = "0px";
      panel.style.opacity = "0";
    });
  };

  const openProject = (project) => {
    const trigger = project.querySelector(".project-trigger");
    const panel = project.querySelector(".project-panel");
    if (!trigger || !panel) return;

    projects.forEach((other) => {
      if (other !== project) closeProject(other);
    });

    setPanelOpenState(project, panel, trigger, true);
    panel.style.pointerEvents = "auto";
    panel.style.overflow = "hidden";
    panel.style.transition = "none";
    panel.style.maxHeight = "none";
    const target = panel.scrollHeight;
    panel.style.maxHeight = "0px";
    panel.style.opacity = "0";

    tweenPanel(panel, 0, target, 0, 1, () => {
      panel.style.maxHeight = "none";
      panel.style.opacity = "1";
    });
  };

  projects.forEach((project) => {
    const trigger = project.querySelector(".project-trigger");
    const panel = project.querySelector(".project-panel");
    if (!trigger || !panel) return;

    panel.hidden = false;
    panel.style.transition = "none";
    panel.style.maxHeight = "0px";
    panel.style.opacity = "0";
    panel.style.overflow = "hidden";
    panel.style.pointerEvents = "none";
    panel.setAttribute("aria-hidden", "true");
    setPanelInert(panel, true);

    trigger.addEventListener("click", () => {
      if (project.classList.contains("is-open")) {
        closeProject(project);
      } else {
        openProject(project);
      }
    });
  });

  const nodes = document.querySelectorAll("[data-reveal]");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    nodes.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
  );

  nodes.forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i % 6, 4) * 60}ms`;
    observer.observe(el);
  });
})();
