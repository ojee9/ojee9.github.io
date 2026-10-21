
document.addEventListener("DOMContentLoaded", () => {
  const grid = document.querySelector(".visual-grid");
  const filter = document.querySelector(".visual-filter");

  if (!grid || !filter) {
    console.error("Visuals: .visual-grid or .visual-filter not found.");
    return;
  }

  // Add styles required for interactions and the lightbox.
  if (!document.getElementById("visuals-interaction-styles")) {
    const style = document.createElement("style");
    style.id = "visuals-interaction-styles";
    style.textContent = `
      .visual-filter span,
      .visual-filter button { cursor: pointer; }

      .visual-filter .active {
        opacity: 1;
        border-bottom: 1px solid rgba(255,255,255,.65);
      }

      .visual-card[hidden] { display: none !important; }

      .visual-card img,
      .visual-card video { cursor: zoom-in; }

      .visual-card .media-trigger {
        cursor: zoom-in;
      }

      .visual-lightbox {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 28px;
        background: rgba(0,0,0,.96);
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transition: opacity .25s ease, visibility .25s ease;
      }

      .visual-lightbox.open {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
      }

      .visual-lightbox-panel {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        max-width: 1100px;
        width: 100%;
        max-height: 100%;
      }

      .visual-lightbox-media {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 76vh;
      }

      .visual-lightbox-media img,
      .visual-lightbox-media video {
        display: block;
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
        object-fit: contain;
      }

      .visual-lightbox-caption {
        text-align: center;
        color: white;
      }

      .visual-lightbox-caption h2 {
        font-size: 14px;
        font-weight: 300;
        letter-spacing: 4px;
      }

      .visual-lightbox-caption p {
        margin-top: 7px;
        font-size: 9px;
        letter-spacing: 3px;
        opacity: .6;
      }

      .visual-lightbox-close {
        position: absolute;
        top: -36px;
        right: 0;
        border: 1px solid rgba(255,255,255,.3);
        background: #080808;
        color: white;
        width: 34px;
        height: 34px;
        font-size: 25px;
        cursor: pointer;
      }

      @media (max-width: 600px) {
        .visual-lightbox { padding: 16px; }
        .visual-lightbox-media { height: 68vh; }
        .visual-lightbox-caption h2 {
          font-size: 11px;
          letter-spacing: 2px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Insert the new motion immediately BEFORE the existing motion card.
  const existingMotion = grid.querySelector(".visual-card.motion");

  if (
    existingMotion &&
    !grid.querySelector('[data-added-motion="subcity-track-canvas-social-addon"]')
  ) {
    const card = document.createElement("article");
    card.className = "visual-card motion";
    card.dataset.title = "SUBCITY TRACK CANVAS";
    card.dataset.kind = "VIDEO PREVIEW";
    card.dataset.category = "play-this";
    card.dataset.addedMotion = "subcity-track-canvas-social-addon";

    card.innerHTML = `
      <div class="image-box">
        <video autoplay muted loop playsinline preload="metadata">
          <source
            src="assets/motions/subcity-track-canvas-social-addon.mp4"
            type="video/mp4"
          >
        </video>
      </div>
      <div class="card-info">
        <h2>SUBCITY TRACK CANVAS</h2>
        <p>VIDEO PREVIEW</p>
      </div>
    `;

    grid.insertBefore(card, existingMotion);
  }

  const cards = Array.from(grid.querySelectorAll(".visual-card"));

  // Read titles and types from existing card content.
  cards.forEach((card, index) => {
    if (!card.dataset.title) {
      card.dataset.title =
        card.querySelector(".card-info h2")?.textContent.trim() ||
        "UNTITLED";
    }

    if (!card.dataset.kind) {
      card.dataset.kind =
        card.querySelector(".card-info p")?.textContent.trim() ||
        "ARTWORK";
    }

    card.dataset.originalIndex = index;

    // Distinguish current known content without inventing categories.
    if (card.classList.contains("motion")) {
      card.dataset.category = "play-this";
    } else if (card.classList.contains("pocket")) {
      card.dataset.category = "hot-take";
    } else {
      card.dataset.category = card.dataset.category || "";
    }

    // Existing artwork and each draft thumbnail become clickable.
    card.querySelectorAll("img, video").forEach((media) => {
      media.style.cursor = "zoom-in";
      if (media.tagName === "IMG") {
        media.tabIndex = 0;
        media.setAttribute("role", "button");
        media.setAttribute(
          "aria-label",
          `Open ${card.dataset.title}`
        );
      }
    });
  });

  // Create the lightbox automatically; no extra HTML markup required.
  const lightbox = document.createElement("div");
  lightbox.className = "visual-lightbox";
  lightbox.setAttribute("aria-hidden", "true");
  lightbox.innerHTML = `
    <section class="visual-lightbox-panel" role="dialog" aria-modal="true">
      <button class="visual-lightbox-close" type="button" aria-label="Close">×</button>
      <div class="visual-lightbox-media"></div>
      <div class="visual-lightbox-caption">
        <h2></h2>
        <p></p>
      </div>
    </section>
  `;
  document.body.appendChild(lightbox);

  const lightboxMedia = lightbox.querySelector(".visual-lightbox-media");
  const lightboxTitle = lightbox.querySelector(".visual-lightbox-caption h2");
  const lightboxKind = lightbox.querySelector(".visual-lightbox-caption p");
  const closeButton = lightbox.querySelector(".visual-lightbox-close");

  let lastFocused = null;

  function openLightbox(original, card) {
    lastFocused = document.activeElement;
    lightboxMedia.replaceChildren();

    const copy = original.cloneNode(true);
    copy.removeAttribute("tabindex");
    copy.removeAttribute("role");
    copy.style.cursor = "default";

    if (copy.tagName === "VIDEO") {
      copy.controls = true;
      copy.autoplay = true;
      copy.loop = false;
      copy.muted = true;
      copy.playsInline = true;
    }

    lightboxMedia.appendChild(copy);
    lightboxTitle.textContent = card.dataset.title;
    lightboxKind.textContent = card.dataset.kind;

    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    closeButton.focus();

    if (copy.tagName === "VIDEO") {
      copy.play().catch(() => {});
    }
  }

  function closeLightbox() {
    if (!lightbox.classList.contains("open")) return;

    lightboxMedia.querySelector("video")?.pause();
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxMedia.replaceChildren();
    document.body.style.overflow = "";
    lastFocused?.focus?.();
  }

  // Clicking a particular draft opens ONLY that draft.
  grid.addEventListener("click", (event) => {
    if (event.target.closest(".card-info")) return;

    const media = event.target.closest("img, video");
    if (!media || !grid.contains(media)) return;

    const card = media.closest(".visual-card");
    if (card) openLightbox(media, card);
  });

  grid.addEventListener("keydown", (event) => {
    if (
      (event.key === "Enter" || event.key === " ") &&
      event.target.matches("img[role='button']")
    ) {
      event.preventDefault();
      const card = event.target.closest(".visual-card");
      if (card) openLightbox(event.target, card);
    }
  });

  closeButton.addEventListener("click", closeLightbox);

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeLightbox();
  });

  // Filters support the current span-based menu OR button-based menu.
  const filterControls = Array.from(
    filter.querySelectorAll("span, button")
  );

  function getFilterName(control) {
    if (control.dataset.filter) return control.dataset.filter;

    const label = control.textContent.trim().toLowerCase();

    if (label === "featured") return "featured";
    if (label === "hot take") return "hot-take";
    if (label === "play this") return "play-this";
    if (label === "newest") return "newest";

    return "";
  }

  function applyFilter(name) {
    filterControls.forEach((control) => {
      const active = getFilterName(control) === name;
      control.classList.toggle("active", active);

      if (control.tagName === "BUTTON") {
        control.setAttribute("aria-pressed", String(active));
      }
    });

    // Newest uses reverse HTML order until actual dates are supplied.
    if (name === "newest") {
      [...cards].reverse().forEach((card) => grid.appendChild(card));
    } else {
      cards.forEach((card) => grid.appendChild(card));
    }

    cards.forEach((card) => {
      if (name === "newest") {
        card.hidden = false;
      } else if (name === "play-this") {
        card.hidden = card.dataset.category !== "play-this";
      } else if (name === "hot-take") {
        card.hidden = card.dataset.category !== "hot-take";
      } else if (name === "featured") {
        card.hidden = !(
          card.classList.contains("featured") ||
          card.dataset.featured === "true"
        );
      }
    });
  }

  filterControls.forEach((control) => {
    control.addEventListener("click", () => {
      const name = getFilterName(control);
      if (name) applyFilter(name);
    });
  });

  // Respect the existing active filter; otherwise default to FEATURED.
  const activeControl =
    filter.querySelector(".active") || filterControls[0];

  if (activeControl) {
    applyFilter(getFilterName(activeControl) || "featured");
  }
});
