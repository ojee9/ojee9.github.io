
document.addEventListener("DOMContentLoaded", () => {
  const grid = document.querySelector(".visual-grid");
  const filterNav = document.querySelector(".visual-filter");

  if (!grid || !filterNav) return;

  const lightbox = document.getElementById("lightbox");
  const lightboxMedia = document.getElementById("lightbox-media");
  const lightboxTitle = document.getElementById("lightbox-title");
  const lightboxKind = document.getElementById("lightbox-kind");

  if (!lightbox || !lightboxMedia || !lightboxTitle || !lightboxKind) {
    console.error("Visuals: Lightbox HTML elements are missing.");
    return;
  }

  // Add the extra motion card immediately to the LEFT of the existing motion.
  const extraMotionPath =
    "assets/motions/subcity-track-canvas-social-addon.mp4";

  if (!grid.querySelector('[data-added-motion="true"]')) {
    const existingMotion = grid.querySelector(".visual-card.motion");

    if (existingMotion) {
      const card = document.createElement("article");
      card.className = "visual-card motion";
      card.dataset.addedMotion = "true";
      card.dataset.title = "SUBCITY TRACK CANVAS";
      card.dataset.kind = "VIDEO PREVIEW";
      card.dataset.category = "play-this";

      card.innerHTML = `
        <button class="media-trigger video-trigger" type="button"
          aria-label="View SUBCITY TRACK CANVAS">
          <video autoplay muted loop playsinline preload="metadata">
            <source src="${extraMotionPath}" type="video/mp4">
          </video>
          <span class="play-mark" aria-hidden="true">↗</span>
        </button>
        <div class="card-info">
          <h2>SUBCITY TRACK CANVAS</h2>
          <p>VIDEO PREVIEW</p>
        </div>
      `;

      existingMotion.before(card);
    }
  }

  let cards = Array.from(grid.querySelectorAll(".visual-card"));

  // Save original order and assign filter categories.
  cards.forEach((card, index) => {
    card.dataset.originalOrder = String(index);

    if (card.classList.contains("pocket")) {
      card.dataset.category = "hot-take";
    } else if (card.classList.contains("motion")) {
      card.dataset.category = "play-this";
    } else if (card.classList.contains("featured")) {
      card.dataset.category = "featured";
    } else {
      card.dataset.category = "featured";
    }

    const video = card.querySelector("video");
    if (video) {
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;
      video.play().catch(() => {});
    }
  });

  const filterButtons = Array.from(
    filterNav.querySelectorAll("[data-filter]")
  );

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxMedia.replaceChildren();
    document.body.style.overflow = "";
  }

  function openLightbox(card, trigger) {
    const media = trigger.querySelector("img, video");
    if (!media) return;

    lightboxMedia.replaceChildren();

    if (media.tagName === "VIDEO") {
      const video = document.createElement("video");
      const source = media.querySelector("source");

      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;

      if (source) {
        video.src = source.src;
      } else {
        video.src = media.currentSrc || media.src;
      }

      lightboxMedia.appendChild(video);
      video.play().catch(() => {});
    } else {
      const image = document.createElement("img");
      image.src = media.currentSrc || media.src;
      image.alt = media.alt || "";
      lightboxMedia.appendChild(image);
    }

    lightboxTitle.textContent =
      card.dataset.title ||
      card.querySelector(".card-info h2")?.textContent.trim() ||
      "UNTITLED";

    lightboxKind.textContent =
      card.dataset.kind ||
      card.querySelector(".card-info p")?.textContent.trim() ||
      "VISUAL";

    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  // Handle image and video buttons, including all four draft thumbnails.
  grid.addEventListener("click", event => {
    const trigger = event.target.closest(".media-trigger");
    if (!trigger || !grid.contains(trigger)) return;

    const card = trigger.closest(".visual-card");
    if (card) openLightbox(card, trigger);
  });

  lightbox.querySelectorAll("[data-close-lightbox]").forEach(button => {
    button.addEventListener("click", closeLightbox);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && lightbox.classList.contains("is-open")) {
      closeLightbox();
    }
  });

  // Functional category filters.
  function applyFilter(filter) {
    cards = Array.from(grid.querySelectorAll(".visual-card"));

    if (filter === "newest") {
      cards.sort((a, b) =>
        Number(b.dataset.originalOrder) - Number(a.dataset.originalOrder)
      );
      cards.forEach(card => {
        card.hidden = false;
        grid.appendChild(card);
      });
    } else {
      cards.sort((a, b) =>
        Number(a.dataset.originalOrder) - Number(b.dataset.originalOrder)
      );
      cards.forEach(card => {
        grid.appendChild(card);
        card.hidden = card.dataset.category !== filter;
      });
    }

    filterButtons.forEach(button => {
      const active = button.dataset.filter === filter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  filterButtons.forEach(button => {
    button.addEventListener("click", () => {
      applyFilter(button.dataset.filter);
    });
  });

  // Make sure the HTML's existing lightbox is visible when opened.
  if (!document.getElementById("visuals-js-style")) {
    const style = document.createElement("style");
    style.id = "visuals-js-style";
    style.textContent = `
      .visual-card[hidden] { display: none !important; }
      .lightbox.is-open {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
      }
      .visual-card .media-trigger { cursor: zoom-in; }
      .visual-card.motion .media-trigger { cursor: pointer; }
    `;
    document.head.appendChild(style);
  }

  applyFilter("featured");
});
