/* VN SHOP — shared notification standard.
   API: VNNotice.show(message, { type, anchor, placement, duration, dismissible, persistent });
   Anchored notices follow their field and dismiss when that context leaves the viewport.
   Transient notices always have a finite lifetime unless persistent:true is explicit.
*/
(() => {
  "use strict";

  if (window.VNNotice?.version === "2.1.0") return;

  const STYLE_ID = "vn-notice-shared-styles";
  const DEFAULT_DURATION = {
    success: 2200,
    info: 2400,
    warning: 2800,
    error: 3200
  };
  const EXIT_MS = 220;

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #vn-notice-layer {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        max-width: none !important;
        max-height: none !important;
        --vn-notice-safe-top: env(safe-area-inset-top, 0px);
        --vn-notice-safe-bottom: env(safe-area-inset-bottom, 0px);
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        overflow: visible !important;
        background: transparent !important;
        color: inherit !important;
        pointer-events: none !important;
        z-index: 2147483647 !important;
        display: none;
      }
      #vn-notice-layer:popover-open,
      #vn-notice-layer.vn-notice-fallback {
        display: block !important;
      }
      #vn-notice-bubble {
        position: fixed !important;
        box-sizing: border-box !important;
        display: flex !important;
        align-items: flex-start !important;
        gap: 11px !important;
        width: max-content !important;
        max-width: min(360px, calc(100vw - 32px)) !important;
        max-height: min(190px, calc(100dvh - 32px)) !important;
        overflow: auto !important;
        margin: 0 !important;
        padding: 13px 14px !important;
        border: 1px solid #514b42 !important;
        border-left: 3px solid #b8ad9b !important;
        border-radius: 7px !important;
        background: linear-gradient(145deg, #242321 0%, #191919 72%, #151515 100%) !important;
        color: #f3f1ec !important;
        box-shadow: 0 12px 34px rgba(0,0,0,.34), 0 2px 8px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.055) !important;
        font: 12px/1.5 Arial, Helvetica, sans-serif !important;
        letter-spacing: .01em !important;
        text-align: left !important;
        white-space: normal !important;
        opacity: 0 !important;
        visibility: hidden !important;
        transform: translate3d(0, 6px, 0) scale(.99) !important;
        transform-origin: bottom center !important;
        transition: opacity .16s ease, transform .18s cubic-bezier(.2,.8,.2,1), visibility .16s ease !important;
        pointer-events: auto !important;
      }
      #vn-notice-bubble.vn-notice-visible {
        opacity: 1 !important;
        visibility: visible !important;
        transform: translate3d(0,0,0) scale(1) !important;
      }
      #vn-notice-bubble::before {
        content: "";
        display: block;
        flex: 0 0 7px;
        width: 7px;
        height: 7px;
        margin: 5px 1px 0 0;
        border-radius: 50%;
        background: #b8ad9b;
        box-shadow: 0 0 0 3px rgba(184,173,155,.12), 0 0 10px rgba(184,173,155,.22);
      }
      #vn-notice-bubble[data-type="error"] {
        border-left-color: #d77970 !important;
        border-color: #604744 !important;
      }
      #vn-notice-bubble[data-type="error"]::before {
        background: #d77970;
        box-shadow: 0 0 0 3px rgba(215,121,112,.12), 0 0 10px rgba(215,121,112,.2);
      }
      #vn-notice-bubble[data-type="success"] {
        border-left-color: #91ad8b !important;
        border-color: #4c5948 !important;
      }
      #vn-notice-bubble[data-type="success"]::before {
        background: #91ad8b;
        box-shadow: 0 0 0 3px rgba(145,173,139,.12), 0 0 10px rgba(145,173,139,.2);
      }
      #vn-notice-bubble[data-type="warning"] {
        border-left-color: #d3ad69 !important;
        border-color: #5c5140 !important;
      }
      #vn-notice-bubble[data-type="warning"]::before {
        background: #d3ad69;
        box-shadow: 0 0 0 3px rgba(211,173,105,.12), 0 0 10px rgba(211,173,105,.2);
      }
      #vn-notice-bubble[data-type="info"] {
        border-left-color: #9aa8b5 !important;
        border-color: #4b555e !important;
      }
      #vn-notice-bubble[data-type="info"]::before {
        background: #9aa8b5;
        box-shadow: 0 0 0 3px rgba(154,168,181,.12), 0 0 10px rgba(154,168,181,.2);
      }
      #vn-notice-message {
        display: block !important;
        flex: 1 1 auto !important;
        min-width: 0 !important;
        overflow-wrap: anywhere !important;
      }
      #vn-notice-close {
        display: inline-flex !important;
        flex: 0 0 24px !important;
        align-items: center !important;
        justify-content: center !important;
        width: 24px !important;
        height: 24px !important;
        margin: -3px -5px 0 0 !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 4px !important;
        background: transparent !important;
        color: #aaa !important;
        font: 20px/1 Arial, sans-serif !important;
        cursor: pointer !important;
        transition: color .16s ease, background .16s ease !important;
      }
      #vn-notice-close:hover,
      #vn-notice-close:focus-visible {
        background: rgba(255,255,255,.08) !important;
        color: #fff !important;
      }
      #vn-notice-close[hidden] {
        display: none !important;
      }
      @media (max-width: 600px) {
        #vn-notice-bubble {
          max-width: calc(100vw - 28px) !important;
          padding: 12px 13px !important;
          font-size: 12px !important;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        #vn-notice-bubble {
          transition: opacity .01ms linear, visibility .01ms linear !important;
          transform: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  const layer = document.createElement("div");
  layer.id = "vn-notice-layer";
  layer.setAttribute("popover", "manual");
  layer.setAttribute("aria-label", "VN SHOP notifications");

  const bubble = document.createElement("div");
  bubble.id = "vn-notice-bubble";
  bubble.setAttribute("aria-hidden", "true");

  const message = document.createElement("span");
  message.id = "vn-notice-message";
  message.setAttribute("aria-atomic", "true");

  const close = document.createElement("button");
  close.id = "vn-notice-close";
  close.type = "button";
  close.setAttribute("aria-label", "Dismiss notification");
  close.title = "Dismiss";
  close.textContent = "×";

  bubble.append(message, close);
  layer.appendChild(bubble);
  document.body.appendChild(layer);

  let anchor = null;
  let timer = 0;
  let hideTimer = 0;
  let resizeObserver = null;
  let mutationObserver = null;
  let usingPopover = false;
  let sequence = 0;
  let active = false;
  let persistent = false;
  let remaining = 0;
  let timerStartedAt = 0;

  const clearAutoTimer = () => {
    window.clearTimeout(timer);
    timer = 0;
    timerStartedAt = 0;
  };

  const clearObservers = () => {
    if (resizeObserver) resizeObserver.disconnect();
    if (mutationObserver) mutationObserver.disconnect();
    resizeObserver = null;
    mutationObserver = null;
  };

  const anchorIsVisible = () => {
    if (!anchor || !anchor.isConnected) return false;
    if (anchor.closest("[hidden], [inert], [aria-hidden='true']")) return false;

    const style = window.getComputedStyle(anchor);
    if (style.display === "none" || style.visibility === "hidden") return false;

    const rect = anchor.getBoundingClientRect();
    return rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < window.innerHeight &&
      rect.left < window.innerWidth;
  };

  const position = () => {
    if (!active || !bubble.isConnected) return;

    const margin = 16;
    const gap = 8;
    const width = bubble.offsetWidth || 300;
    const height = bubble.offsetHeight || 60;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const safeTop = Math.max(0, parseFloat(getComputedStyle(layer).getPropertyValue("--vn-notice-safe-top")) || 0);
    const safeBottom = Math.max(0, parseFloat(getComputedStyle(layer).getPropertyValue("--vn-notice-safe-bottom")) || 0);

    let left;
    let top;

    if (anchor) {
      if (!anchorIsVisible()) {
        hide();
        return;
      }

      const rect = anchor.getBoundingClientRect();
      const belowSpace = viewportHeight - rect.bottom - gap - margin;
      const aboveSpace = rect.top - gap - margin;
      const requested = bubble.dataset.requestedPlacement || "auto";
      const placeBelow = requested === "below"
        ? belowSpace >= Math.min(height, 72)
        : requested === "above"
          ? aboveSpace >= Math.min(height, 72)
          : belowSpace >= height || belowSpace >= aboveSpace;

      top = placeBelow
        ? Math.min(rect.bottom + gap, viewportHeight - height - margin)
        : Math.max(margin, rect.top - gap - height);

      const centeredLeft = rect.left + (rect.width - width) / 2;
      left = Math.min(
        Math.max(margin, centeredLeft),
        Math.max(margin, viewportWidth - width - margin)
      );

      bubble.dataset.placement = placeBelow ? "below" : "above";
      bubble.style.transformOrigin = placeBelow ? "top left" : "bottom left";
    } else {
      left = Math.max(margin, (viewportWidth - width) / 2);
      top = Math.max(margin + safeTop, viewportHeight - height - margin - safeBottom);
      delete bubble.dataset.placement;
      bubble.style.transformOrigin = "bottom center";
    }

    bubble.style.left = Math.round(left) + "px";
    bubble.style.top = Math.round(Math.max(margin, Math.min(top, viewportHeight - height - margin - safeBottom))) + "px";
  };

  const finishHide = expectedSequence => {
    if (expectedSequence !== sequence) return;
    if (usingPopover && typeof layer.hidePopover === "function") {
      try {
        if (layer.matches(":popover-open")) layer.hidePopover();
      } catch (_) {}
    }
    layer.classList.remove("vn-notice-fallback");
    layer.style.display = "none";
  };

  const hide = () => {
    if (!active && layer.style.display === "none") return;

    active = false;
    const currentSequence = ++sequence;
    clearAutoTimer();
    window.clearTimeout(hideTimer);
    hideTimer = 0;
    bubble.classList.remove("vn-notice-visible");
    bubble.setAttribute("aria-hidden", "true");
    clearObservers();
    anchor = null;

    hideTimer = window.setTimeout(() => {
      finishHide(currentSequence);
      hideTimer = 0;
    }, EXIT_MS);
  };

  const startAutoTimer = duration => {
    clearAutoTimer();
    remaining = duration;
    if (persistent || duration <= 0) return;
    timerStartedAt = Date.now();
    timer = window.setTimeout(hide, duration);
  };

  const pauseAutoTimer = () => {
    if (!timer || persistent) return;
    remaining = Math.max(0, remaining - (Date.now() - timerStartedAt));
    clearAutoTimer();
  };

  const resumeAutoTimer = () => {
    if (!active || persistent || timer || remaining <= 0) return;
    timerStartedAt = Date.now();
    timer = window.setTimeout(hide, remaining);
  };

  const show = (text, options = {}) => {
    window.clearTimeout(hideTimer);
    hideTimer = 0;
    clearAutoTimer();
    clearObservers();

    const currentSequence = ++sequence;
    active = true;
    anchor = typeof Element !== "undefined" && options.anchor instanceof Element
      ? options.anchor
      : null;
    persistent = options.persistent === true;

    const type = ["error", "success", "warning", "info"].includes(options.type)
      ? options.type
      : "info";

    message.textContent = String(text ?? "");
    message.setAttribute("role", type === "error" ? "alert" : "status");
    message.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
    bubble.dataset.type = type;
    bubble.dataset.requestedPlacement = ["above", "below"].includes(options.placement)
      ? options.placement
      : "auto";
    bubble.setAttribute("aria-hidden", "false");
    close.hidden = options.dismissible === false && !persistent;

    const requestedDuration = Number(options.duration);
    const duration = persistent
      ? 0
      : Number.isFinite(requestedDuration) && requestedDuration > 0
        ? Math.min(6000, Math.max(1800, requestedDuration))
        : DEFAULT_DURATION[type];

    layer.style.display = "block";
    usingPopover = typeof layer.showPopover === "function";

    if (usingPopover) {
      try {
        if (!layer.matches(":popover-open")) layer.showPopover();
        layer.classList.remove("vn-notice-fallback");
      } catch (error) {
        usingPopover = false;
        layer.classList.add("vn-notice-fallback");
        console.warn("VN Notice popover fallback:", error);
      }
    } else {
      layer.classList.add("vn-notice-fallback");
    }

    if (anchor && anchor.isConnected) {
      const rect = anchor.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= window.innerHeight ||
          rect.right <= 0 || rect.left >= window.innerWidth) {
        try {
          anchor.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
        } catch (_) {}
      }
    } else {
      anchor = null;
    }

    position();
    requestAnimationFrame(() => {
      if (currentSequence !== sequence || !active) return;
      position();
      bubble.classList.add("vn-notice-visible");
    });

    if (anchor) {
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(position);
        resizeObserver.observe(anchor);
        resizeObserver.observe(bubble);
      }
      if (typeof MutationObserver !== "undefined") {
        mutationObserver = new MutationObserver(() => {
          if (!anchorIsVisible()) hide();
          else position();
        });
        mutationObserver.observe(document.body, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ["hidden", "class", "aria-hidden", "inert"]
        });
      }
    }

    startAutoTimer(duration);
    return Object.freeze({ hide });
  };

  close.addEventListener("click", hide);
  bubble.addEventListener("pointerenter", pauseAutoTimer);
  bubble.addEventListener("pointerleave", resumeAutoTimer);
  bubble.addEventListener("focusin", pauseAutoTimer);
  bubble.addEventListener("focusout", resumeAutoTimer);

  window.addEventListener("scroll", position, true, { passive: true });
  window.addEventListener("resize", position, { passive: true });
  window.visualViewport?.addEventListener("resize", position, { passive: true });
  window.visualViewport?.addEventListener("scroll", position, { passive: true });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && active && !close.hidden) hide();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) hide();
  });
  window.addEventListener("pagehide", hide);

  window.VNNotice = Object.freeze({
    version: "2.1.0",
    show,
    update: (text, options = {}) => show(text, options),
    hide,
    isVisible: () => active
  });
})();
