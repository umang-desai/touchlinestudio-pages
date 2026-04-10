(() => {
  const toPageName = () => {
    const path = window.location.pathname || "/";
    if (path === "/" || path.endsWith("/index.html")) return "home";
    const slug = path.split("/").pop() || "home";
    return slug.replace(/\.html$/, "") || "home";
  };

  const pageName = toPageName();
  const AB_TEST_NAME = "hero_v1";
  const AB_STORAGE_KEY = "tls_ab_hero_v1";
  const AB_QUERY_KEY = "ab";
  const analyticsContext = {
    ab_test: "none",
    ab_variant: "none",
    ab_source: "none"
  };

  const resolveAbVariant = () => {
    const queryVariant = new URLSearchParams(window.location.search).get(AB_QUERY_KEY);
    if (queryVariant === "a" || queryVariant === "b") {
      try {
        window.localStorage.setItem(AB_STORAGE_KEY, queryVariant);
      } catch (_error) {}

      return { variant: queryVariant, source: "query" };
    }

    try {
      const storedVariant = window.localStorage.getItem(AB_STORAGE_KEY);
      if (storedVariant === "a" || storedVariant === "b") {
        return { variant: storedVariant, source: "storage" };
      }
    } catch (_error) {}

    const generatedVariant = Math.random() < 0.5 ? "a" : "b";

    try {
      window.localStorage.setItem(AB_STORAGE_KEY, generatedVariant);
      return { variant: generatedVariant, source: "generated" };
    } catch (_error) {
      return { variant: generatedVariant, source: "generated_ephemeral" };
    }
  };

  const applyHomeVariant = (variant) => {
    const attribute = variant === "b" ? "data-ab-b" : "data-ab-a";
    const elements = Array.from(document.querySelectorAll("[data-ab-a][data-ab-b]"));
    elements.forEach((element) => {
      const nextText = element.getAttribute(attribute);
      if (nextText) {
        element.textContent = nextText;
      }
    });

    document.documentElement.setAttribute("data-ab-hero-v1", variant);
  };

  if (pageName === "home") {
    const variantInfo = resolveAbVariant();
    analyticsContext.ab_test = AB_TEST_NAME;
    analyticsContext.ab_variant = variantInfo.variant;
    analyticsContext.ab_source = variantInfo.source;
    applyHomeVariant(variantInfo.variant);
  }

  const cleanValue = (value) =>
    String(value)
      .trim()
      .slice(0, 80)
      .replace(/[^a-zA-Z0-9_\-\.]/g, "_");

  const trackEvent = (name, props = {}) => {
    const mergedProps = { ...analyticsContext, ...props };
    const payload = {
      event_name: cleanValue(name),
      page: pageName,
      path: window.location.pathname,
      ...Object.fromEntries(
        Object.entries(mergedProps).map(([key, value]) => [cleanValue(key), cleanValue(value)])
      )
    };

    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: "touchline_event", ...payload });
    }

    if (typeof window.gtag === "function") {
      window.gtag("event", payload.event_name, payload);
    }

    if (typeof window.plausible === "function") {
      window.plausible(payload.event_name, { props: payload });
    }

    window.dispatchEvent(new CustomEvent("touchline:analytics", { detail: payload }));
  };

  if (pageName === "home") {
    trackEvent("ab_variant_assigned", {
      variant: analyticsContext.ab_variant,
      source: analyticsContext.ab_source
    });
  }

  trackEvent("page_view");

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("[data-track]") : null;
    if (!target) return;

    trackEvent("click", {
      id: target.getAttribute("data-track") || "unknown",
      tag: target.tagName.toLowerCase()
    });
  });

  const trackViewedSections = () => {
    const sections = Array.from(document.querySelectorAll("[data-track-view]"));
    if (!sections.length) return;

    if (!("IntersectionObserver" in window)) {
      sections.forEach((section) => {
        trackEvent("section_view", { section: section.getAttribute("data-track-view") || "unknown" });
      });
      return;
    }

    const seen = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const sectionName = entry.target.getAttribute("data-track-view") || "unknown";
          if (seen.has(sectionName)) return;

          seen.add(sectionName);
          trackEvent("section_view", { section: sectionName });
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.42 }
    );

    sections.forEach((section) => observer.observe(section));
  };

  trackViewedSections();

  const siteHeader = document.querySelector(".site-header");
  const navToggle = document.querySelector("[data-nav-toggle]");
  const navMenu = document.querySelector("#primary-nav");

  const setMenuOpen = (open) => {
    if (!siteHeader || !navToggle || !navMenu) return;
    const currentlyOpen = siteHeader.classList.contains("menu-active");
    if (currentlyOpen === open) return;

    siteHeader.classList.toggle("menu-active", open);
    document.body.classList.toggle("menu-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    trackEvent("mobile_menu", { state: open ? "open" : "closed" });
  };

  if (siteHeader && navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const isOpen = navToggle.getAttribute("aria-expanded") === "true";
      setMenuOpen(!isOpen);
    });

    navMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setMenuOpen(false));
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 920) {
        setMenuOpen(false);
      }
    });
  }

  const stickyDownload = document.querySelector("[data-sticky-download]");
  const downloadSection = document.querySelector("#download");

  if (stickyDownload) {
    let impressionTracked = false;

    const updateStickyDownload = () => {
      const mobileViewport = window.innerWidth <= 920;
      const scrolledEnough = window.scrollY > 480;
      const downloadVisible = Boolean(
        downloadSection && downloadSection.getBoundingClientRect().top < window.innerHeight - 120
      );
      const shouldShow = mobileViewport && scrolledEnough && !downloadVisible;

      stickyDownload.hidden = !shouldShow;

      if (shouldShow && !impressionTracked) {
        impressionTracked = true;
        trackEvent("sticky_download_impression", { placement: "mobile_bottom" });
      }
    };

    window.addEventListener("scroll", updateStickyDownload, { passive: true });
    window.addEventListener("resize", updateStickyDownload);
    updateStickyDownload();
  }

  const tabButtons = Array.from(document.querySelectorAll("[data-tab-button]"));
  const tabPanels = Array.from(document.querySelectorAll("[data-tab-panel]"));

  if (tabButtons.length && tabPanels.length) {
    const setActiveTab = (tabName, shouldTrack = false) => {
      tabButtons.forEach((button) => {
        const isActive = button.getAttribute("data-tab-button") === tabName;
        button.setAttribute("aria-selected", String(isActive));
        button.tabIndex = isActive ? 0 : -1;
      });

      tabPanels.forEach((panel) => {
        const isActive = panel.getAttribute("data-tab-panel") === tabName;
        panel.classList.toggle("active", isActive);
        panel.hidden = !isActive;
      });

      if (shouldTrack) {
        trackEvent("tab_select", { tab: tabName });
      }
    };

    tabButtons.forEach((button, index) => {
      const tabName = button.getAttribute("data-tab-button");
      const panel = tabPanels.find((item) => item.getAttribute("data-tab-panel") === tabName);

      if (panel) {
        const buttonId = `tab-${tabName}`;
        const panelId = `panel-${tabName}`;
        button.id = buttonId;
        button.setAttribute("aria-controls", panelId);
        panel.id = panelId;
        panel.setAttribute("aria-labelledby", buttonId);
      }

      button.addEventListener("click", () => setActiveTab(tabName, true));

      button.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const nextIndex = (index + direction + tabButtons.length) % tabButtons.length;
        const nextButton = tabButtons[nextIndex];
        nextButton.focus();
        setActiveTab(nextButton.getAttribute("data-tab-button"), true);
      });
    });

    setActiveTab(tabButtons[0].getAttribute("data-tab-button"));
  }

  const lightbox = document.querySelector("[data-lightbox]");
  const lightboxImage = document.querySelector("[data-lightbox-image]");
  const lightboxCaption = document.querySelector("[data-lightbox-caption]");

  if (lightbox && lightboxImage && lightboxCaption) {
    const imageButtons = Array.from(document.querySelectorAll("[data-shot-open]"));
    const closeButton = lightbox.querySelector("[data-lightbox-close]");
    const prevButton = lightbox.querySelector("[data-lightbox-prev]");
    const nextButton = lightbox.querySelector("[data-lightbox-next]");
    let activeIndex = 0;

    const renderLightbox = () => {
      const activeButton = imageButtons[activeIndex];
      if (!activeButton) return;

      const source = activeButton.getAttribute("data-shot-src") || "";
      const alt = activeButton.getAttribute("data-shot-alt") || "Screenshot";
      const caption = activeButton.getAttribute("data-shot-caption") || alt;
      lightboxImage.src = source;
      lightboxImage.alt = alt;
      lightboxCaption.textContent = caption;
    };

    const openLightbox = (index) => {
      activeIndex = index;
      renderLightbox();
      lightbox.hidden = false;
      lightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("lightbox-open");
      closeButton?.focus();
      trackEvent("screenshot_open", { shot: activeIndex + 1 });
    };

    const closeLightbox = () => {
      lightbox.hidden = true;
      lightbox.setAttribute("aria-hidden", "true");
      lightboxImage.src = "";
      document.body.classList.remove("lightbox-open");
      trackEvent("screenshot_close");
    };

    imageButtons.forEach((button, index) => {
      button.addEventListener("click", () => openLightbox(index));
    });

    closeButton?.addEventListener("click", closeLightbox);

    prevButton?.addEventListener("click", () => {
      activeIndex = (activeIndex - 1 + imageButtons.length) % imageButtons.length;
      renderLightbox();
      trackEvent("screenshot_prev", { shot: activeIndex + 1 });
    });

    nextButton?.addEventListener("click", () => {
      activeIndex = (activeIndex + 1) % imageButtons.length;
      renderLightbox();
      trackEvent("screenshot_next", { shot: activeIndex + 1 });
    });

    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });

    window.addEventListener("keydown", (event) => {
      if (lightbox.hidden) return;
      if (event.key === "Escape") {
        closeLightbox();
      }
      if (event.key === "ArrowLeft") {
        prevButton?.click();
      }
      if (event.key === "ArrowRight") {
        nextButton?.click();
      }
    });
  }

  const faqSearchFields = Array.from(document.querySelectorAll("[data-faq-filter]"));

  faqSearchFields.forEach((input) => {
    const targetSelector = input.getAttribute("data-faq-target");
    if (!targetSelector) return;

    const faqContainer = document.querySelector(targetSelector);
    if (!faqContainer) return;

    const emptySelector = input.getAttribute("data-faq-empty");
    const emptyState = emptySelector ? document.querySelector(emptySelector) : null;
    const entries = Array.from(faqContainer.querySelectorAll("details"));
    let lastSentSignature = "";
    let filterTimer = null;

    entries.forEach((entry, index) => {
      entry.addEventListener("toggle", () => {
        trackEvent("faq_toggle", {
          group: targetSelector,
          item: index + 1,
          state: entry.open ? "open" : "closed"
        });
      });
    });

    const applyFilter = () => {
      const query = input.value.trim().toLowerCase();
      let visibleCount = 0;

      entries.forEach((entry) => {
        const matches = query.length === 0 || entry.textContent.toLowerCase().includes(query);
        entry.hidden = !matches;
        if (matches) visibleCount += 1;
      });

      if (emptyState) {
        emptyState.classList.toggle("visible", visibleCount === 0);
      }

      const lengthBucket =
        query.length === 0 ? "empty" : query.length < 4 ? "short" : query.length < 9 ? "medium" : "long";
      const signature = `${targetSelector}:${lengthBucket}:${visibleCount}`;

      if (signature !== lastSentSignature) {
        lastSentSignature = signature;
        trackEvent("faq_search", {
          group: targetSelector,
          query_bucket: lengthBucket,
          results: visibleCount
        });
      }
    };

    input.addEventListener("input", () => {
      if (filterTimer) {
        clearTimeout(filterTimer);
      }

      filterTimer = window.setTimeout(() => {
        applyFilter();
      }, 160);
    });

    applyFilter();
  });

  const supportForm = document.querySelector("[data-support-form]");
  if (supportForm) {
    supportForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const topic = supportForm.querySelector("[name='topic']")?.value || "General question";
      const urgency = supportForm.querySelector("[name='urgency']")?.value || "Normal";
      const device = supportForm.querySelector("[name='device']")?.value || "";
      const message = supportForm.querySelector("[name='message']")?.value || "";

      trackEvent("support_email_draft", { topic, urgency });

      const subject = `[Touchline Studio] ${topic} (${urgency})`;
      const lines = [
        "Hi Touchline Studio Support,",
        "",
        "I need help with:",
        topic,
        "",
        `Urgency: ${urgency}`,
        device ? `Device: ${device}` : "Device:",
        "",
        "Details:",
        message || "Please add details here.",
        "",
        "Thanks,"
      ];

      const body = lines.join("\n");
      const mailto = `mailto:umangd03@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;
    });
  }
})();
